const express = require('express');
const db = require('../config/database');
const { CITY } = require('../config/city');
const { isNgo, isAuthenticated } = require('../config/middleware');

const router = express.Router();

// --- Page Routes ---

router.get('/ngo/dashboard', isNgo, (req, res) => {
    res.sendFile('dashboard.html', { root: 'views/ngo' });
});

router.get('/ngo/available-donations', isNgo, (req, res) => {
    res.sendFile('available-donations.html', { root: 'views/ngo' });
});

router.get('/ngo/my-requests', isNgo, (req, res) => {
    res.sendFile('my-requests.html', { root: 'views/ngo' });
});

router.get('/ngo/confirmed', isNgo, (req, res) => {
    res.sendFile('confirmed.html', { root: 'views/ngo' });
});

router.get('/ngo/history', isNgo, (req, res) => {
    res.sendFile('history.html', { root: 'views/ngo' });
});

router.get('/ngo/profile', isNgo, (req, res) => {
    res.sendFile('profile.html', { root: 'views/ngo' });
});

router.get('/ngo/pending', isNgo, (req, res) => {
    res.sendFile('pending.html', { root: 'views/ngo' });
});

router.get('/ngo/rejected', isNgo, (req, res) => {
    res.sendFile('rejected.html', { root: 'views/ngo' });
});

// --- API Routes ---

// Helper: expire overdue available donations
async function expireOverdueDonations() {
    await db.execute(`
        UPDATE donations SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'AVAILABLE' AND pickup_deadline < CURRENT_TIMESTAMP
    `);
}

// GET /api/ngo/dashboard-stats
router.get('/api/ngo/dashboard-stats', isNgo, async (req, res) => {
    try {
        await expireOverdueDonations();
        const ngoId = req.session.profileId;

        const [availableRes, pendingRes, confirmedRes, collectedRes, completedRes, totalRes] = await Promise.all([
            db.execute("SELECT COUNT(*) as count FROM donations WHERE status = 'AVAILABLE'"),
            db.execute({
                sql: `
                    SELECT COUNT(*) as count FROM donation_requests
                    WHERE ngo_id = ? AND status = 'PENDING'
                `,
                args: [ngoId]
            }),
            db.execute({
                sql: "SELECT COUNT(*) as count FROM donations WHERE confirmed_ngo_id = ? AND status = 'CONFIRMED'",
                args: [ngoId]
            }),
            db.execute({
                sql: "SELECT COUNT(*) as count FROM donations WHERE confirmed_ngo_id = ? AND status = 'COLLECTED'",
                args: [ngoId]
            }),
            db.execute({
                sql: "SELECT COUNT(*) as count FROM donations WHERE confirmed_ngo_id = ? AND status IN ('COMPLETED', 'COLLECTED')",
                args: [ngoId]
            }),
            db.execute({
                sql: "SELECT COUNT(*) as count FROM donation_requests WHERE ngo_id = ?",
                args: [ngoId]
            })
        ]);

        const stats = {
            available: Number(availableRes.rows[0]?.count || 0),
            myPendingRequests: Number(pendingRes.rows[0]?.count || 0),
            confirmed: Number(confirmedRes.rows[0]?.count || 0),
            collected: Number(collectedRes.rows[0]?.count || 0),
            completed: Number(completedRes.rows[0]?.count || 0),
            totalMyRequests: Number(totalRes.rows[0]?.count || 0)
        };

        res.json(stats);
    } catch (err) {
        console.error('NGO dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to load dashboard stats.' });
    }
});

// GET /api/ngo/available-donations
router.get('/api/ngo/available-donations', isNgo, async (req, res) => {
    try {
        await expireOverdueDonations();

        const result = await db.execute(`
            SELECT d.*, dorg.organization_name as donor_name, dorg.organization_type as donor_type,
                   (SELECT COUNT(*) FROM donation_requests WHERE donation_id = d.id AND status = 'PENDING') as pending_requests
            FROM donations d
            JOIN donors dorg ON d.donor_id = dorg.id
            WHERE d.status = 'AVAILABLE'
            ORDER BY d.pickup_deadline ASC
        `);

        res.json(result.rows);
    } catch (err) {
        console.error('Available donations error:', err);
        res.status(500).json({ error: 'Failed to load available donations.' });
    }
});

// GET /api/ngo/donations/:id
router.get('/api/ngo/donations/:id', isNgo, async (req, res) => {
    try {
        await expireOverdueDonations();

        const donationResult = await db.execute({
            sql: `
                SELECT d.*, dorg.organization_name as donor_name, dorg.organization_type as donor_type,
                       dorg.contact_person as donor_contact, dorg.phone as donor_phone, dorg.address as donor_address
                FROM donations d
                JOIN donors dorg ON d.donor_id = dorg.id
                WHERE d.id = ?
            `,
            args: [req.params.id]
        });

        const donation = donationResult.rows[0];

        if (!donation) {
            return res.status(404).json({ error: 'Donation not found.' });
        }

        // Check if this NGO already requested this donation
        const requestResult = await db.execute({
            sql: 'SELECT status FROM donation_requests WHERE donation_id = ? AND ngo_id = ?',
            args: [req.params.id, req.session.profileId]
        });

        const existingRequest = requestResult.rows[0];
        donation.my_request_status = existingRequest ? existingRequest.status : null;

        res.json(donation);
    } catch (err) {
        console.error('Get donation detail error:', err);
        res.status(500).json({ error: 'Failed to load donation details.' });
    }
});

// POST /api/ngo/request-donation/:id
router.post('/api/ngo/request-donation/:id', isNgo, async (req, res) => {
    try {
        const ngoId = req.session.profileId;
        const donationId = req.params.id;

        // Check if NGO is approved
        const ngoResult = await db.execute({
            sql: "SELECT verification_status FROM ngos WHERE id = ?",
            args: [ngoId]
        });
        const ngo = ngoResult.rows[0];

        if (!ngo || ngo.verification_status !== 'APPROVED') {
            return res.status(403).json({ error: 'Your NGO must be approved before requesting donations.' });
        }

        // Check if donation exists and is available
        const donationResult = await db.execute({
            sql: 'SELECT * FROM donations WHERE id = ?',
            args: [donationId]
        });
        const donation = donationResult.rows[0];

        if (!donation) {
            return res.status(404).json({ error: 'Donation not found.' });
        }

        if (donation.status !== 'AVAILABLE') {
            return res.status(400).json({ error: 'This donation is no longer available.' });
        }

        // Check if deadline has passed
        if (new Date(donation.pickup_deadline) < new Date()) {
            await db.execute({
                sql: "UPDATE donations SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                args: [donationId]
            });
            return res.status(400).json({ error: 'This donation has expired.' });
        }

        // Check for duplicate request
        const existingRequest = await db.execute({
            sql: 'SELECT id FROM donation_requests WHERE donation_id = ? AND ngo_id = ?',
            args: [donationId, ngoId]
        });

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({ error: 'You have already requested this donation.' });
        }

        // Batch the insertion and status update
        await db.batch([
            {
                sql: 'INSERT INTO donation_requests (donation_id, ngo_id) VALUES (?, ?)',
                args: [donationId, ngoId]
            },
            {
                sql: "UPDATE donations SET status = 'REQUESTED', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'AVAILABLE'",
                args: [donationId]
            }
        ]);

        res.json({ success: true, message: 'Your request has been submitted.' });
    } catch (err) {
        console.error('Request donation error:', err);
        res.status(500).json({ error: 'Failed to submit request.' });
    }
});

// GET /api/ngo/my-requests
router.get('/api/ngo/my-requests', isNgo, async (req, res) => {
    try {
        const ngoId = req.session.profileId;

        const result = await db.execute({
            sql: `
                SELECT dr.*, d.food_description, d.quantity, d.pickup_location, d.pickup_deadline,
                       d.preparation_time, d.status as donation_status,
                       dorg.organization_name as donor_name, dorg.organization_type as donor_type
                FROM donation_requests dr
                JOIN donations d ON dr.donation_id = d.id
                JOIN donors dorg ON d.donor_id = dorg.id
                WHERE dr.ngo_id = ?
                ORDER BY dr.requested_at DESC
            `,
            args: [ngoId]
        });

        res.json(result.rows);
    } catch (err) {
        console.error('My requests error:', err);
        res.status(500).json({ error: 'Failed to load requests.' });
    }
});

// GET /api/ngo/confirmed (active collections)
router.get('/api/ngo/confirmed', isNgo, async (req, res) => {
    try {
        const ngoId = req.session.profileId;

        const result = await db.execute({
            sql: `
                SELECT d.*, dorg.organization_name as donor_name, dorg.organization_type as donor_type,
                       dorg.contact_person as donor_contact, dorg.phone as donor_phone
                FROM donations d
                JOIN donors dorg ON d.donor_id = dorg.id
                WHERE d.confirmed_ngo_id = ? AND d.status IN ('CONFIRMED', 'COLLECTED')
                ORDER BY d.pickup_deadline ASC
            `,
            args: [ngoId]
        });

        res.json(result.rows);
    } catch (err) {
        console.error('Confirmed donations error:', err);
        res.status(500).json({ error: 'Failed to load confirmed donations.' });
    }
});

// POST /api/ngo/mark-collected/:id
router.post('/api/ngo/mark-collected/:id', isNgo, async (req, res) => {
    try {
        const ngoId = req.session.profileId;
        const donationId = req.params.id;

        const result = await db.execute({
            sql: 'SELECT * FROM donations WHERE id = ?',
            args: [donationId]
        });

        const donation = result.rows[0];

        if (!donation) {
            return res.status(404).json({ error: 'Donation not found.' });
        }

        if (Number(donation.confirmed_ngo_id) !== Number(ngoId)) {
            return res.status(403).json({ error: 'Only the confirmed NGO can mark this donation as collected.' });
        }

        if (donation.status !== 'CONFIRMED') {
            return res.status(400).json({ error: 'This donation cannot be marked as collected in its current status.' });
        }

        const now = new Date().toISOString();

        await db.execute({
            sql: `
                UPDATE donations
                SET status = 'COLLECTED', collected_at = ?, updated_at = ?
                WHERE id = ?
            `,
            args: [now, now, donationId]
        });

        res.json({ success: true, message: 'Donation marked as collected successfully.' });
    } catch (err) {
        console.error('Mark collected error:', err);
        res.status(500).json({ error: 'Failed to mark donation as collected.' });
    }
});

// GET /api/ngo/history
router.get('/api/ngo/history', isNgo, async (req, res) => {
    try {
        const ngoId = req.session.profileId;

        const result = await db.execute({
            sql: `
                SELECT d.*, dorg.organization_name as donor_name, dorg.organization_type as donor_type
                FROM donations d
                JOIN donors dorg ON d.donor_id = dorg.id
                WHERE d.confirmed_ngo_id = ? AND d.status IN ('COMPLETED', 'COLLECTED')
                ORDER BY d.collected_at DESC
            `,
            args: [ngoId]
        });

        res.json(result.rows);
    } catch (err) {
        console.error('History error:', err);
        res.status(500).json({ error: 'Failed to load collection history.' });
    }
});

// GET /api/ngo/profile
router.get('/api/ngo/profile', isNgo, async (req, res) => {
    try {
        const ngoId = req.session.profileId;
        const result = await db.execute({
            sql: `
                SELECT ng.*, u.email
                FROM ngos ng
                JOIN users u ON ng.user_id = u.id
                WHERE ng.id = ?
            `,
            args: [ngoId]
        });

        const ngo = result.rows[0];

        if (!ngo) {
            return res.status(404).json({ error: 'Profile not found.' });
        }

        res.json(ngo);
    } catch (err) {
        console.error('Get NGO profile error:', err);
        res.status(500).json({ error: 'Failed to load profile.' });
    }
});

module.exports = router;
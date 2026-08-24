const express = require('express');
const db = require('../config/database');
const { CITY } = require('../config/city');
const { isDonor, isAuthenticated } = require('../config/middleware');

const router = express.Router();

// GET /donor/dashboard
router.get('/donor/dashboard', isDonor, (req, res) => {
    res.sendFile('dashboard.html', { root: 'views/donor' });
});

// GET /donor/create-donation
router.get('/donor/create-donation', isDonor, (req, res) => {
    res.sendFile('create-donation.html', { root: 'views/donor' });
});

// GET /donor/my-donations
router.get('/donor/my-donations', isDonor, (req, res) => {
    res.sendFile('my-donations.html', { root: 'views/donor' });
});

// GET /donor/requests
router.get('/donor/requests', isDonor, (req, res) => {
    res.sendFile('requests.html', { root: 'views/donor' });
});

// GET /donor/history
router.get('/donor/history', isDonor, (req, res) => {
    res.sendFile('history.html', { root: 'views/donor' });
});

// GET /donor/profile
router.get('/donor/profile', isDonor, (req, res) => {
    res.sendFile('profile.html', { root: 'views/donor' });
});

// GET /donor/pending
router.get('/donor/pending', isDonor, (req, res) => {
    res.sendFile('pending.html', { root: 'views/donor' });
});

// GET /donor/rejected
router.get('/donor/rejected', isDonor, (req, res) => {
    res.sendFile('rejected.html', { root: 'views/donor' });
});

// --- API Routes ---

// GET /api/donor/dashboard-stats
router.get('/api/donor/dashboard-stats', isDonor, (req, res) => {
    try {
        const donorId = req.session.profileId;
        const stats = {
            active: db.prepare("SELECT COUNT(*) as count FROM donations WHERE donor_id = ? AND status = 'AVAILABLE'").get(donorId).count,
            pendingRequests: db.prepare(`
                SELECT COUNT(*) as count FROM donation_requests dr
                JOIN donations d ON dr.donation_id = d.id
                WHERE d.donor_id = ? AND dr.status = 'PENDING'
            `).get(donorId).count,
            confirmed: db.prepare("SELECT COUNT(*) as count FROM donations WHERE donor_id = ? AND status = 'CONFIRMED'").get(donorId).count,
            collected: db.prepare("SELECT COUNT(*) as count FROM donations WHERE donor_id = ? AND status = 'COLLECTED'").get(donorId).count,
            completed: db.prepare("SELECT COUNT(*) as count FROM donations WHERE donor_id = ? AND status IN ('COMPLETED', 'COLLECTED')").get(donorId).count,
            expired: db.prepare("SELECT COUNT(*) as count FROM donations WHERE donor_id = ? AND status = 'EXPIRED'").get(donorId).count,
            total: db.prepare("SELECT COUNT(*) as count FROM donations WHERE donor_id = ?").get(donorId).count
        };
        res.json(stats);
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to load dashboard stats.' });
    }
});

// POST /api/donor/donations
router.post('/api/donor/donations', isDonor, (req, res) => {
    try {
        const donorId = req.session.profileId;

        // Check if donor is approved
        const donor = db.prepare("SELECT verification_status FROM donors WHERE id = ?").get(donorId);
        if (!donor || donor.verification_status !== 'APPROVED') {
            return res.status(403).json({ error: 'Your account must be approved before creating donations.' });
        }

        const { foodDescription, quantity, foodCategory, preparationTime, pickupLocation, pickupDeadline, additionalNotes } = req.body;

        // Validation
        if (!foodDescription || !quantity || !pickupLocation || !pickupDeadline) {
            return res.status(400).json({ error: 'Food description, quantity, pickup location, and pickup deadline are required.' });
        }

        if (foodDescription.trim().length < 3) {
            return res.status(400).json({ error: 'Food description must be at least 3 characters long.' });
        }

        if (quantity.trim().length < 1) {
            return res.status(400).json({ error: 'Please specify the quantity.' });
        }

        // Validate pickup deadline is in the future
        const deadline = new Date(pickupDeadline);
        if (isNaN(deadline.getTime())) {
            return res.status(400).json({ error: 'Please enter a valid pickup deadline.' });
        }

        const donorInfo = db.prepare("SELECT address, city FROM donors WHERE id = ?").get(donorId);
        const fullPickupLocation = pickupLocation;

        const insert = db.prepare(`
            INSERT INTO donations (donor_id, food_description, quantity, food_category, preparation_time, pickup_location, pickup_deadline, additional_notes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')
        `);

        const result = insert.run(
            donorId,
            foodDescription.trim(),
            quantity.trim(),
            foodCategory || 'General',
            preparationTime || '',
            fullPickupLocation.trim(),
            deadline.toISOString(),
            additionalNotes || ''
        );

        res.json({
            success: true,
            message: 'Donation created successfully.',
            donationId: result.lastInsertRowid
        });
    } catch (err) {
        console.error('Create donation error:', err);
        res.status(500).json({ error: 'Failed to create donation. Please try again.' });
    }
});

// GET /api/donor/donations
router.get('/api/donor/donations', isDonor, (req, res) => {
    try {
        const donorId = req.session.profileId;
        const status = req.query.status;

        let query = `
            SELECT d.*,
                (SELECT ng.ngo_name FROM ngos ng
                 JOIN donation_requests dr ON ng.id = dr.ngo_id
                 WHERE dr.donation_id = d.id AND dr.status = 'ACCEPTED' LIMIT 1) as confirmed_ngo_name
            FROM donations d
            WHERE d.donor_id = ?
        `;
        const params = [donorId];

        if (status) {
            if (Array.isArray(status)) {
                query += ` AND d.status IN (${status.map(() => '?').join(',')})`;
                params.push(...status);
            } else {
                query += ' AND d.status = ?';
                params.push(status);
            }
        }

        query += ' ORDER BY d.created_at DESC';

        const donations = db.prepare(query).all(...params);
        res.json(donations);
    } catch (err) {
        console.error('Get donations error:', err);
        res.status(500).json({ error: 'Failed to load donations.' });
    }
});

// GET /api/donor/donations/:id
router.get('/api/donor/donations/:id', isDonor, (req, res) => {
    try {
        const donorId = req.session.profileId;
        const donation = db.prepare('SELECT * FROM donations WHERE id = ? AND donor_id = ?').get(req.params.id, donorId);

        if (!donation) {
            return res.status(404).json({ error: 'Donation not found.' });
        }

        res.json(donation);
    } catch (err) {
        console.error('Get donation error:', err);
        res.status(500).json({ error: 'Failed to load donation.' });
    }
});

// GET /api/donor/requests - get all requests for donor's donations
router.get('/api/donor/requests', isDonor, (req, res) => {
    try {
        const donorId = req.session.profileId;

        const requests = db.prepare(`
            SELECT dr.*, d.food_description, d.quantity, d.status as donation_status, d.pickup_location, d.pickup_deadline,
                   ng.ngo_name, ng.contact_person, ng.phone as ngo_phone, ng.address as ngo_address, ng.registration_info
            FROM donation_requests dr
            JOIN donations d ON dr.donation_id = d.id
            JOIN ngos ng ON dr.ngo_id = ng.id
            WHERE d.donor_id = ?
            ORDER BY dr.requested_at DESC
        `).all(donorId);

        res.json(requests);
    } catch (err) {
        console.error('Get requests error:', err);
        res.status(500).json({ error: 'Failed to load requests.' });
    }
});

// POST /api/donor/requests/:id/accept
router.post('/api/donor/requests/:id/accept', isDonor, (req, res) => {
    try {
        const donorId = req.session.profileId;
        const requestId = req.params.id;

        // Get the request with donation info
        const request = db.prepare(`
            SELECT dr.*, d.donor_id, d.status as donation_status
            FROM donation_requests dr
            JOIN donations d ON dr.donation_id = d.id
            WHERE dr.id = ?
        `).get(requestId);

        if (!request) {
            return res.status(404).json({ error: 'Request not found.' });
        }

        if (request.donor_id !== donorId) {
            return res.status(403).json({ error: 'You can only manage requests for your own donations.' });
        }            if (request.donation_status !== 'AVAILABLE' && request.donation_status !== 'REQUESTED') {
                return res.status(400).json({ error: 'This donation is no longer available for requests.' });
            }

            if (request.status !== 'PENDING') {
                return res.status(400).json({ error: 'This request has already been processed.' });
            }

            const acceptTransaction = db.transaction(() => {
                // Accept this request
                db.prepare("UPDATE donation_requests SET status = 'ACCEPTED', responded_at = CURRENT_TIMESTAMP WHERE id = ?").run(requestId);

                // Reject all other pending requests for this donation
                db.prepare("UPDATE donation_requests SET status = 'REJECTED', responded_at = CURRENT_TIMESTAMP WHERE donation_id = ? AND id != ? AND status = 'PENDING'").run(request.donation_id, requestId);

                // Update donation status to CONFIRMED and set confirmed NGO
                db.prepare("UPDATE donations SET status = 'CONFIRMED', confirmed_ngo_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(request.ngo_id, request.donation_id);
            });

        acceptTransaction();

        res.json({ success: true, message: 'NGO request confirmed successfully.' });
    } catch (err) {
        console.error('Accept request error:', err);
        res.status(500).json({ error: 'Failed to process request.' });
    }
});

// POST /api/donor/requests/:id/reject
router.post('/api/donor/requests/:id/reject', isDonor, (req, res) => {
    try {
        const donorId = req.session.profileId;
        const requestId = req.params.id;

        const request = db.prepare(`
            SELECT dr.*, d.donor_id
            FROM donation_requests dr
            JOIN donations d ON dr.donation_id = d.id
            WHERE dr.id = ?
        `).get(requestId);

        if (!request) {
            return res.status(404).json({ error: 'Request not found.' });
        }

        if (request.donor_id !== donorId) {
            return res.status(403).json({ error: 'You can only manage requests for your own donations.' });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({ error: 'This request has already been processed.' });
        }

        db.prepare("UPDATE donation_requests SET status = 'REJECTED', responded_at = CURRENT_TIMESTAMP WHERE id = ?").run(requestId);

        // Check if there are any remaining pending requests
        const remainingPending = db.prepare(
            "SELECT COUNT(*) as count FROM donation_requests WHERE donation_id = ? AND status = 'PENDING'"
        ).get(request.donation_id);

        // If no more pending requests, change donation status back to AVAILABLE
        if (remainingPending.count === 0) {
            db.prepare("UPDATE donations SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'REQUESTED'").run(request.donation_id);
        }

        res.json({ success: true, message: 'Request rejected.' });
    } catch (err) {
        console.error('Reject request error:', err);
        res.status(500).json({ error: 'Failed to reject request.' });
    }
});

// GET /api/donor/profile
router.get('/api/donor/profile', isDonor, (req, res) => {
    try {
        const donorId = req.session.profileId;
        const donor = db.prepare(`
            SELECT d.*, u.email
            FROM donors d
            JOIN users u ON d.user_id = u.id
            WHERE d.id = ?
        `).get(donorId);

        if (!donor) {
            return res.status(404).json({ error: 'Profile not found.' });
        }

        res.json(donor);
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Failed to load profile.' });
    }
});

module.exports = router;

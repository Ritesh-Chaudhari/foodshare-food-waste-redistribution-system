const express = require('express');
const db = require('../config/database');
const { isAdmin } = require('../config/middleware');

const router = express.Router();

// --- Page Routes ---

router.get('/admin/dashboard', isAdmin, (req, res) => {
    res.sendFile('dashboard.html', { root: 'views/admin' });
});

router.get('/admin/donors', isAdmin, (req, res) => {
    res.sendFile('donors.html', { root: 'views/admin' });
});

router.get('/admin/ngos', isAdmin, (req, res) => {
    res.sendFile('ngos.html', { root: 'views/admin' });
});

router.get('/admin/donations', isAdmin, (req, res) => {
    res.sendFile('donations.html', { root: 'views/admin' });
});

router.get('/admin/users', isAdmin, (req, res) => {
    res.sendFile('users.html', { root: 'views/admin' });
});

router.get('/admin/verification', isAdmin, (req, res) => {
    res.sendFile('verification.html', { root: 'views/admin' });
});

router.get('/admin/requests', isAdmin, (req, res) => {
    res.sendFile('requests.html', { root: 'views/admin' });
});

router.get('/admin/reports', isAdmin, (req, res) => {
    res.sendFile('reports.html', { root: 'views/admin' });
});

// --- API Routes ---

// GET /api/admin/dashboard-stats
router.get('/api/admin/dashboard-stats', isAdmin, (req, res) => {
    try {
        const stats = {
            totalDonors: db.prepare("SELECT COUNT(*) as count FROM donors").get().count,
            pendingDonors: db.prepare("SELECT COUNT(*) as count FROM donors WHERE verification_status = 'PENDING'").get().count,
            approvedDonors: db.prepare("SELECT COUNT(*) as count FROM donors WHERE verification_status = 'APPROVED'").get().count,
            totalNgos: db.prepare("SELECT COUNT(*) as count FROM ngos").get().count,
            pendingNgos: db.prepare("SELECT COUNT(*) as count FROM ngos WHERE verification_status = 'PENDING'").get().count,
            approvedNgos: db.prepare("SELECT COUNT(*) as count FROM ngos WHERE verification_status = 'APPROVED'").get().count,
            availableDonations: db.prepare("SELECT COUNT(*) as count FROM donations WHERE status = 'AVAILABLE'").get().count,
            requestedDonations: db.prepare("SELECT COUNT(*) as count FROM donations WHERE status = 'REQUESTED'").get().count,
            confirmedDonations: db.prepare("SELECT COUNT(*) as count FROM donations WHERE status = 'CONFIRMED'").get().count,
            collectedDonations: db.prepare("SELECT COUNT(*) as count FROM donations WHERE status = 'COLLECTED'").get().count,
            completedDonations: db.prepare("SELECT COUNT(*) as count FROM donations WHERE status = 'COMPLETED'").get().count,
            expiredDonations: db.prepare("SELECT COUNT(*) as count FROM donations WHERE status = 'EXPIRED'").get().count,
            totalDonations: db.prepare("SELECT COUNT(*) as count FROM donations").get().count,
            totalRequests: db.prepare("SELECT COUNT(*) as count FROM donation_requests").get().count,
            pendingRequests: db.prepare("SELECT COUNT(*) as count FROM donation_requests WHERE status = 'PENDING'").get().count
        };
        res.json(stats);
    } catch (err) {
        console.error('Admin dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to load dashboard stats.' });
    }
});

// --- Donor Management ---

// GET /api/admin/donors
router.get('/api/admin/donors', isAdmin, (req, res) => {
    try {
        const status = req.query.status;
        let query = `
            SELECT d.*, u.email, u.is_active
            FROM donors d
            JOIN users u ON d.user_id = u.id
        `;
        const params = [];

        if (status) {
            query += ' WHERE d.verification_status = ?';
            params.push(status);
        }

        query += ' ORDER BY d.created_at DESC';

        const donors = db.prepare(query).all(...params);
        res.json(donors);
    } catch (err) {
        console.error('Admin get donors error:', err);
        res.status(500).json({ error: 'Failed to load donors.' });
    }
});

// GET /api/admin/donors/:id
router.get('/api/admin/donors/:id', isAdmin, (req, res) => {
    try {
        const donor = db.prepare(`
            SELECT d.*, u.email, u.is_active
            FROM donors d
            JOIN users u ON d.user_id = u.id
            WHERE d.id = ?
        `).get(req.params.id);

        if (!donor) {
            return res.status(404).json({ error: 'Donor not found.' });
        }

        res.json(donor);
    } catch (err) {
        console.error('Admin get donor error:', err);
        res.status(500).json({ error: 'Failed to load donor details.' });
    }
});

// POST /api/admin/donors/:id/approve
router.post('/api/admin/donors/:id/approve', isAdmin, (req, res) => {
    try {
        const donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(req.params.id);
        if (!donor) {
            return res.status(404).json({ error: 'Donor not found.' });
        }

        db.prepare("UPDATE donors SET verification_status = 'APPROVED' WHERE id = ?").run(req.params.id);
        res.json({ success: true, message: 'Donor approved successfully.' });
    } catch (err) {
        console.error('Approve donor error:', err);
        res.status(500).json({ error: 'Failed to approve donor.' });
    }
});

// POST /api/admin/donors/:id/reject
router.post('/api/admin/donors/:id/reject', isAdmin, (req, res) => {
    try {
        const donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(req.params.id);
        if (!donor) {
            return res.status(404).json({ error: 'Donor not found.' });
        }

        db.prepare("UPDATE donors SET verification_status = 'REJECTED' WHERE id = ?").run(req.params.id);

        res.json({ success: true, message: 'Donor rejected.' });
    } catch (err) {
        console.error('Reject donor error:', err);
        res.status(500).json({ error: 'Failed to reject donor.' });
    }
});

// POST /api/admin/donors/:id/toggle-active
router.post('/api/admin/donors/:id/toggle-active', isAdmin, (req, res) => {
    try {
        const donor = db.prepare('SELECT user_id FROM donors WHERE id = ?').get(req.params.id);
        if (!donor) {
            return res.status(404).json({ error: 'Donor not found.' });
        }

        const user = db.prepare('SELECT is_active FROM users WHERE id = ?').get(donor.user_id);
        const newStatus = user.is_active ? 0 : 1;

        db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, donor.user_id);
        res.json({ success: true, message: newStatus ? 'Account activated.' : 'Account deactivated.' });
    } catch (err) {
        console.error('Toggle donor active error:', err);
        res.status(500).json({ error: 'Failed to update account status.' });
    }
});

// --- NGO Management ---

// GET /api/admin/ngos
router.get('/api/admin/ngos', isAdmin, (req, res) => {
    try {
        const status = req.query.status;
        let query = `
            SELECT ng.*, u.email, u.is_active
            FROM ngos ng
            JOIN users u ON ng.user_id = u.id
        `;
        const params = [];

        if (status) {
            query += ' WHERE ng.verification_status = ?';
            params.push(status);
        }

        query += ' ORDER BY ng.created_at DESC';

        const ngos = db.prepare(query).all(...params);
        res.json(ngos);
    } catch (err) {
        console.error('Admin get ngos error:', err);
        res.status(500).json({ error: 'Failed to load NGOs.' });
    }
});

// GET /api/admin/ngos/:id
router.get('/api/admin/ngos/:id', isAdmin, (req, res) => {
    try {
        const ngo = db.prepare(`
            SELECT ng.*, u.email, u.is_active
            FROM ngos ng
            JOIN users u ON ng.user_id = u.id
            WHERE ng.id = ?
        `).get(req.params.id);

        if (!ngo) {
            return res.status(404).json({ error: 'NGO not found.' });
        }

        res.json(ngo);
    } catch (err) {
        console.error('Admin get ngo error:', err);
        res.status(500).json({ error: 'Failed to load NGO details.' });
    }
});

// POST /api/admin/ngos/:id/approve
router.post('/api/admin/ngos/:id/approve', isAdmin, (req, res) => {
    try {
        const ngo = db.prepare('SELECT * FROM ngos WHERE id = ?').get(req.params.id);
        if (!ngo) {
            return res.status(404).json({ error: 'NGO not found.' });
        }

        db.prepare("UPDATE ngos SET verification_status = 'APPROVED' WHERE id = ?").run(req.params.id);
        res.json({ success: true, message: 'NGO approved successfully.' });
    } catch (err) {
        console.error('Approve ngo error:', err);
        res.status(500).json({ error: 'Failed to approve NGO.' });
    }
});

// POST /api/admin/ngos/:id/reject
router.post('/api/admin/ngos/:id/reject', isAdmin, (req, res) => {
    try {
        const ngo = db.prepare('SELECT * FROM ngos WHERE id = ?').get(req.params.id);
        if (!ngo) {
            return res.status(404).json({ error: 'NGO not found.' });
        }

        db.prepare("UPDATE ngos SET verification_status = 'REJECTED' WHERE id = ?").run(req.params.id);

        res.json({ success: true, message: 'NGO rejected.' });
    } catch (err) {
        console.error('Reject ngo error:', err);
        res.status(500).json({ error: 'Failed to reject NGO.' });
    }
});

// POST /api/admin/ngos/:id/toggle-active
router.post('/api/admin/ngos/:id/toggle-active', isAdmin, (req, res) => {
    try {
        const ngo = db.prepare('SELECT user_id FROM ngos WHERE id = ?').get(req.params.id);
        if (!ngo) {
            return res.status(404).json({ error: 'NGO not found.' });
        }

        const user = db.prepare('SELECT is_active FROM users WHERE id = ?').get(ngo.user_id);
        const newStatus = user.is_active ? 0 : 1;

        db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(newStatus, ngo.user_id);
        res.json({ success: true, message: newStatus ? 'Account activated.' : 'Account deactivated.' });
    } catch (err) {
        console.error('Toggle ngo active error:', err);
        res.status(500).json({ error: 'Failed to update account status.' });
    }
});

// --- Donation Monitoring ---

// GET /api/admin/donations
router.get('/api/admin/donations', isAdmin, (req, res) => {
    try {
        const status = req.query.status;
        let query = `
            SELECT d.*, dorg.organization_name as donor_name, dorg.organization_type as donor_type,
                   ng.ngo_name as confirmed_ngo_name
            FROM donations d
            JOIN donors dorg ON d.donor_id = dorg.id
            LEFT JOIN ngos ng ON d.confirmed_ngo_id = ng.id
        `;
        const params = [];

        if (status) {
            query += ' WHERE d.status = ?';
            params.push(status);
        }

        query += ' ORDER BY d.created_at DESC';

        const donations = db.prepare(query).all(...params);
        res.json(donations);
    } catch (err) {
        console.error('Admin get donations error:', err);
        res.status(500).json({ error: 'Failed to load donations.' });
    }
});

// --- Users Management (combined view) ---

// GET /api/admin/users
router.get('/api/admin/users', isAdmin, (req, res) => {
    try {
        const role = req.query.role;
        let users;
        if (role === 'donor') {
            users = db.prepare(`
                SELECT u.id, u.email, u.role, u.is_active, u.created_at,
                       d.id as profile_id, d.organization_name, d.organization_type, d.contact_person, d.phone, d.city, d.verification_status
                FROM users u
                JOIN donors d ON u.id = d.user_id
                WHERE u.role = 'donor'
                ORDER BY u.created_at DESC
            `).all();
        } else if (role === 'ngo') {
            users = db.prepare(`
                SELECT u.id, u.email, u.role, u.is_active, u.created_at,
                       n.id as profile_id, n.ngo_name, n.contact_person, n.phone, n.city, n.verification_status
                FROM users u
                JOIN ngos n ON u.id = n.user_id
                WHERE u.role = 'ngo'
                ORDER BY u.created_at DESC
            `).all();
        } else {
            users = db.prepare(`
                SELECT u.id, u.email, u.role, u.is_active, u.created_at,
                       COALESCE(d.organization_name, n.ngo_name) as name,
                       COALESCE(d.organization_type, 'NGO') as type,
                       COALESCE(d.contact_person, n.contact_person) as contact_person,
                       COALESCE(d.phone, n.phone) as phone,
                       COALESCE(d.city, n.city) as city,
                       COALESCE(d.verification_status, n.verification_status) as verification_status
                FROM users u
                LEFT JOIN donors d ON u.id = d.user_id
                LEFT JOIN ngos n ON u.id = n.user_id
                ORDER BY u.created_at DESC
            `).all();
        }
        res.json(users);
    } catch (err) {
        console.error('Admin get users error:', err);
        res.status(500).json({ error: 'Failed to load users.' });
    }
});

// --- Requests Overview ---

// GET /api/admin/requests
router.get('/api/admin/requests', isAdmin, (req, res) => {
    try {
        const requests = db.prepare(`
            SELECT dr.*, d.food_description, d.quantity, d.status as donation_status, d.pickup_location, d.pickup_deadline,
                   dorg.organization_name as donor_name, dorg.organization_type as donor_type,
                   ng.ngo_name, ng.contact_person as ngo_contact, ng.phone as ngo_phone
            FROM donation_requests dr
            JOIN donations d ON dr.donation_id = d.id
            JOIN donors dorg ON d.donor_id = dorg.id
            JOIN ngos ng ON dr.ngo_id = ng.id
            ORDER BY dr.requested_at DESC
        `).all();
        res.json(requests);
    } catch (err) {
        console.error('Admin get requests error:', err);
        res.status(500).json({ error: 'Failed to load requests.' });
    }
});

// --- Reports/Overview ---

// GET /api/admin/reports
router.get('/api/admin/reports', isAdmin, (req, res) => {
    try {
        const reports = {
            donorsByType: db.prepare(`
                SELECT organization_type, COUNT(*) as count FROM donors GROUP BY organization_type
            `).all(),
            donationsByStatus: db.prepare(`
                SELECT status, COUNT(*) as count FROM donations GROUP BY status
            `).all(),
            requestsByStatus: db.prepare(`
                SELECT status, COUNT(*) as count FROM donation_requests GROUP BY status
            `).all(),
            recentDonations: db.prepare(`
                SELECT d.id, d.food_description, d.quantity, d.status, d.created_at,
                       dorg.organization_name as donor_name
                FROM donations d
                JOIN donors dorg ON d.donor_id = dorg.id
                ORDER BY d.created_at DESC LIMIT 10
            `).all(),
            recentRequests: db.prepare(`
                SELECT dr.id, dr.status, dr.requested_at,
                       d.food_description, ng.ngo_name
                FROM donation_requests dr
                JOIN donations d ON dr.donation_id = d.id
                JOIN ngos ng ON dr.ngo_id = ng.id
                ORDER BY dr.requested_at DESC LIMIT 10
            `).all()
        };
        res.json(reports);
    } catch (err) {
        console.error('Admin reports error:', err);
        res.status(500).json({ error: 'Failed to load reports.' });
    }
});

module.exports = router;

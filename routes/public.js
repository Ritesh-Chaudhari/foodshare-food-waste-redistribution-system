const express = require('express');
const path = require('path');
const db = require('../config/database');
const { CITY } = require('../config/city');
const { isGuest } = require('../config/middleware');

const router = express.Router();

// Serve public HTML pages
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/home.html'));
});

router.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/about.html'));
});

router.get('/how-it-works', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/how-it-works.html'));
});

router.get('/for-donors', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/for-donors.html'));
});

router.get('/for-ngos', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/for-ngos.html'));
});

// API: Public stats
router.get('/api/public/stats', async (req, res) => {
    try {
        // Expire overdue donations first
        await db.execute(`
            UPDATE donations SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
            WHERE status = 'AVAILABLE' AND pickup_deadline < CURRENT_TIMESTAMP
        `);

        const [totalDonationsRes, completedDonationsRes, totalNgosRes, totalDonorsRes] = await Promise.all([
            db.execute("SELECT COUNT(*) as count FROM donations"),
            db.execute("SELECT COUNT(*) as count FROM donations WHERE status IN ('COMPLETED', 'COLLECTED')"),
            db.execute("SELECT COUNT(*) as count FROM ngos WHERE verification_status = 'APPROVED'"),
            db.execute("SELECT COUNT(*) as count FROM donors WHERE verification_status = 'APPROVED'")
        ]);

        const stats = {
            totalDonations: Number(totalDonationsRes.rows[0]?.count || 0),
            completedDonations: Number(completedDonationsRes.rows[0]?.count || 0),
            totalNgos: Number(totalNgosRes.rows[0]?.count || 0),
            totalDonors: Number(totalDonorsRes.rows[0]?.count || 0)
        };

        res.json(stats);
    } catch (err) {
        console.error('Public stats error:', err);
        res.json({ totalDonations: 0, completedDonations: 0, totalNgos: 0, totalDonors: 0 });
    }
});

// API: Get current city
router.get('/api/city', (req, res) => {
    res.json({ city: CITY });
});

module.exports = router;
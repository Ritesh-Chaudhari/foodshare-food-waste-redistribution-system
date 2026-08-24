const express = require('express');
const db = require('../config/database');
const { CITY } = require('../config/city');
const { isGuest } = require('../config/middleware');

const router = express.Router();

// Serve public HTML pages
const path = require('path');

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
router.get('/api/public/stats', (req, res) => {
    try {
        // Expire overdue donations first
        db.prepare(`
            UPDATE donations SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
            WHERE status = 'AVAILABLE' AND pickup_deadline < CURRENT_TIMESTAMP
        `).run();

        const stats = {
            totalDonations: db.prepare("SELECT COUNT(*) as count FROM donations").get().count,
            completedDonations: db.prepare("SELECT COUNT(*) as count FROM donations WHERE status IN ('COMPLETED', 'COLLECTED')").get().count,
            totalNgos: db.prepare("SELECT COUNT(*) as count FROM ngos WHERE verification_status = 'APPROVED'").get().count,
            totalDonors: db.prepare("SELECT COUNT(*) as count FROM donors WHERE verification_status = 'APPROVED'").get().count
        };
        res.json(stats);
    } catch (err) {
        res.json({ totalDonations: 0, completedDonations: 0, totalNgos: 0, totalDonors: 0 });
    }
});

// API: Get current city
router.get('/api/city', (req, res) => {
    res.json({ city: CITY });
});

module.exports = router;

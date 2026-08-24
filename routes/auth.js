const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { CITY } = require('../config/city');
const { isGuest, isAuthenticated } = require('../config/middleware');

const router = express.Router();

// Validation helpers
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
}

// GET /login
router.get('/login', isGuest, (req, res) => {
    res.sendFile('login.html', { root: 'public/pages' });
});

// GET /register (shows role selection)
router.get('/register', isGuest, (req, res) => {
    res.sendFile('register.html', { root: 'public/pages' });
});

// GET /register/donor
router.get('/register/donor', isGuest, (req, res) => {
    res.sendFile('register-donor.html', { root: 'public/pages' });
});

// GET /register/ngo
router.get('/register/ngo', isGuest, (req, res) => {
    res.sendFile('register-ngo.html', { root: 'public/pages' });
});

// POST /api/auth/register-donor
router.post('/api/auth/register-donor', isGuest, (req, res) => {
    try {
        const { orgName, orgType, contactPerson, phone, email, address, city, password, confirmPassword } = req.body;

        // Server-side validation
        if (!orgName || !orgType || !contactPerson || !phone || !email || !address || !city || !password || !confirmPassword) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        if (!validatePhone(phone)) {
            return res.status(400).json({ error: 'Please enter a valid 10-digit Indian phone number.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }

        const validOrgTypes = ['Mess', 'Canteen', 'Hotel', 'Restaurant'];
        if (!validOrgTypes.includes(orgType)) {
            return res.status(400).json({ error: 'Invalid organization type.' });
        }

        // Check for duplicate email
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
        if (existingUser) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // Hash password and create user
        const hashedPassword = bcrypt.hashSync(password, 10);

        const insertUser = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
        const result = insertUser.run(email.toLowerCase(), hashedPassword, 'donor');

        const insertDonor = db.prepare(
            'INSERT INTO donors (user_id, organization_name, organization_type, contact_person, phone, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        insertDonor.run(result.lastInsertRowid, orgName, orgType, contactPerson, phone, address, city);

        res.json({ success: true, message: 'Registration successful! Your account is waiting for administrator verification.' });
    } catch (err) {
        console.error('Donor registration error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/register-ngo
router.post('/api/auth/register-ngo', isGuest, (req, res) => {
    try {
        const { ngoName, contactPerson, phone, email, address, city, registrationInfo, password, confirmPassword } = req.body;

        // Server-side validation
        if (!ngoName || !contactPerson || !phone || !email || !address || !city || !password || !confirmPassword) {
            return res.status(400).json({ error: 'All required fields must be filled.' });
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        if (!validatePhone(phone)) {
            return res.status(400).json({ error: 'Please enter a valid 10-digit Indian phone number.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }

        // Check for duplicate email
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
        if (existingUser) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // Hash password and create user
        const hashedPassword = bcrypt.hashSync(password, 10);

        const insertUser = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
        const result = insertUser.run(email.toLowerCase(), hashedPassword, 'ngo');

        const insertNgo = db.prepare(
            'INSERT INTO ngos (user_id, ngo_name, contact_person, phone, address, city, registration_info) VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        insertNgo.run(result.lastInsertRowid, ngoName, contactPerson, phone, address, city, registrationInfo || '');

        res.json({ success: true, message: 'Registration successful! Your account is waiting for administrator verification.' });
    } catch (err) {
        console.error('NGO registration error:', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/api/auth/login', isGuest, (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
        }

        const passwordMatch = bcrypt.compareSync(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.role = user.role;

        // Get role-specific info
        let redirectUrl = '/';
        let displayName = '';

        if (user.role === 'donor') {
            const donor = db.prepare('SELECT * FROM donors WHERE user_id = ?').get(user.id);
            if (!donor) {
                return res.status(500).json({ error: 'Donor profile not found.' });
            }
            req.session.profileId = donor.id;
            req.session.displayName = donor.organization_name;
            displayName = donor.organization_name;
            if (donor.verification_status === 'PENDING') {
                return res.json({ success: true, redirect: '/donor/pending', displayName, role: 'donor' });
            }
            if (donor.verification_status === 'REJECTED') {
                return res.json({ success: true, redirect: '/donor/rejected', displayName, role: 'donor' });
            }
            redirectUrl = '/donor/dashboard';
        } else if (user.role === 'ngo') {
            const ngo = db.prepare('SELECT * FROM ngos WHERE user_id = ?').get(user.id);
            if (!ngo) {
                return res.status(500).json({ error: 'NGO profile not found.' });
            }
            req.session.profileId = ngo.id;
            req.session.displayName = ngo.ngo_name;
            displayName = ngo.ngo_name;
            if (ngo.verification_status === 'PENDING') {
                return res.json({ success: true, redirect: '/ngo/pending', displayName, role: 'ngo' });
            }
            if (ngo.verification_status === 'REJECTED') {
                return res.json({ success: true, redirect: '/ngo/rejected', displayName, role: 'ngo' });
            }
            redirectUrl = '/ngo/dashboard';
        } else if (user.role === 'admin') {
            req.session.displayName = 'Administrator';
            displayName = 'Administrator';
            redirectUrl = '/admin/dashboard';
        }

        res.json({ success: true, redirect: redirectUrl, displayName, role: user.role });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// POST /api/auth/logout
router.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed.' });
        }
        res.json({ success: true, redirect: '/' });
    });
});

// GET /api/auth/me - get current user info
router.get('/api/auth/me', (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({
        userId: req.session.userId,
        role: req.session.role,
        displayName: req.session.displayName,
        email: req.session.email
    });
});

module.exports = router;

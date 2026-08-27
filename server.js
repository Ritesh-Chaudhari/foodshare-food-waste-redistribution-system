require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');

// Initialize database (runs schema creation in Turso)
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for secure cookies on Render
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/pages', express.static(path.join(__dirname, 'public/pages')));

// Session configuration (using in-memory store)
app.use(session({
    secret: process.env.SESSION_SECRET || 'food-waste-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Make session data available in all views via res.locals
app.use((req, res, next) => {
    res.locals.user = req.session.userId ? {
        id: req.session.userId,
        role: req.session.role,
        displayName: req.session.displayName,
        email: req.session.email
    } : null;
    next();
});

// Routes
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const donorRoutes = require('./routes/donor');
const ngoRoutes = require('./routes/ngo');
const adminRoutes = require('./routes/admin');

app.use('/', publicRoutes);
app.use('/', authRoutes);
app.use('/', donorRoutes);
app.use('/', ngoRoutes);
app.use('/', adminRoutes);

// 404 handler
app.use((req, res) => {
    if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Resource not found.' });
    }
    res.status(404).sendFile('404.html', { root: 'public/pages' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(500).json({ error: 'An internal error occurred.' });
    }
    res.status(500).sendFile('404.html', { root: 'public/pages' });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`  Food Waste Redistribution System`);
    console.log(`  Server running on port ${PORT}`);
    console.log(`========================================\n`);
    console.log(`Admin Login: ${process.env.ADMIN_EMAIL || 'admin@foodshare.com'} / ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log(`City: ${process.env.CITY || 'Shirpur'}\n`);
});

module.exports = app;
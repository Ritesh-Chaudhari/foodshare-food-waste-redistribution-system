// Middleware for authentication and role-based access control

function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Please log in to continue.' });
    }
    return res.redirect('/login');
}

function isDonor(req, res, next) {
    if (req.session && req.session.role === 'donor') {
        return next();
    }
    if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(403).json({ error: 'Access denied. Donor account required.' });
    }
    return res.redirect('/login');
}

function isNgo(req, res, next) {
    if (req.session && req.session.role === 'ngo') {
        return next();
    }
    if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(403).json({ error: 'Access denied. NGO account required.' });
    }
    return res.redirect('/login');
}

function isAdmin(req, res, next) {
    if (req.session && req.session.role === 'admin') {
        return next();
    }
    if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(403).json({ error: 'Access denied. Admin account required.' });
    }
    return res.redirect('/login');
}

// Check if user is already logged in (for login/register pages)
function isGuest(req, res, next) {
    if (req.session && req.session.userId) {
        const role = req.session.role;
        if (role === 'donor') return res.redirect('/donor/dashboard');
        if (role === 'ngo') return res.redirect('/ngo/dashboard');
        if (role === 'admin') return res.redirect('/admin/dashboard');
    }
    return next();
}

module.exports = {
    isAuthenticated,
    isDonor,
    isNgo,
    isAdmin,
    isGuest
};

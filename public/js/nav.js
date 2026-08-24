// Dynamic navigation - loaded on every page to inject the correct navbar
document.addEventListener('DOMContentLoaded', async () => {
    const navContainer = document.getElementById('navbar');
    if (!navContainer) return;

    let user = null;
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) user = await res.json();
    } catch (e) { /* not logged in */ }

    let navHtml = '';
    navHtml += `<div class="navbar-inner">`;
    navHtml += `<a href="/" class="navbar-brand"><span class="brand-icon">🍽️</span> FoodShare</a>`;
    navHtml += `<button class="hamburger" aria-label="Menu">☰</button>`;
    navHtml += `<ul class="navbar-links">`;

    if (!user) {
        // Public nav
        navHtml += `<li><a href="/">Home</a></li>`;
        navHtml += `<li><a href="/about">About</a></li>`;
        navHtml += `<li><a href="/how-it-works">How It Works</a></li>`;
        navHtml += `<li><a href="/login">Login</a></li>`;
        navHtml += `<li><a href="/register" class="btn-nav">Register</a></li>`;
    } else if (user.role === 'donor') {
        navHtml += `<li><a href="/donor/dashboard">Dashboard</a></li>`;
        navHtml += `<li><a href="/donor/create-donation">Create Donation</a></li>`;
        navHtml += `<li><a href="/donor/my-donations">My Donations</a></li>`;
        navHtml += `<li><a href="/donor/requests">Requests</a></li>`;
        navHtml += `<li><a href="/donor/history">History</a></li>`;
        navHtml += `<li><a href="/donor/profile">Profile</a></li>`;
        navHtml += `<li><button data-action="logout" class="btn-nav-outline">Logout</button></li>`;
    } else if (user.role === 'ngo') {
        navHtml += `<li><a href="/ngo/dashboard">Dashboard</a></li>`;
        navHtml += `<li><a href="/ngo/available-donations">Available Donations</a></li>`;
        navHtml += `<li><a href="/ngo/my-requests">My Requests</a></li>`;
        navHtml += `<li><a href="/ngo/confirmed">Active Collections</a></li>`;
        navHtml += `<li><a href="/ngo/history">History</a></li>`;
        navHtml += `<li><a href="/ngo/profile">Profile</a></li>`;
        navHtml += `<li><button data-action="logout" class="btn-nav-outline">Logout</button></li>`;
    } else if (user.role === 'admin') {
        navHtml += `<li><a href="/admin/dashboard">Dashboard</a></li>`;
        navHtml += `<li><a href="/admin/donors">Donors</a></li>`;
        navHtml += `<li><a href="/admin/ngos">NGOs</a></li>`;
        navHtml += `<li><a href="/admin/donations">Donations</a></li>`;
        navHtml += `<li><a href="/admin/requests">Requests</a></li>`;
        navHtml += `<li><a href="/admin/reports">Reports</a></li>`;
        navHtml += `<li><button data-action="logout" class="btn-nav-outline">Logout</button></li>`;
    }

    navHtml += `</ul></div>`;
    navContainer.innerHTML = navHtml;

    // Set active nav link
    const currentPath = window.location.pathname;
    navContainer.querySelectorAll('.navbar-links a').forEach(a => {
        if (a.getAttribute('href') === currentPath) {
            a.classList.add('nav-active');
        }
    });

    // Set navbar color class based on role
    if (user) {
        navContainer.classList.add(`navbar-${user.role}`);
    }

    // Initialize hamburger and logout
    App.initNavbar();
});

// ============================================
// Client-side JavaScript - Shared Utilities
// ============================================

const App = {
    // --- API Helpers ---
    async api(url, options = {}) {
        const defaults = {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin'
        };
        const config = { ...defaults, ...options };
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }
        try {
            const res = await fetch(url, config);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Request failed.');
            }
            return data;
        } catch (err) {
            throw err;
        }
    },

    async get(url) { return this.api(url); },
    async post(url, body) { return this.api(url, { method: 'POST', body }); },

    // --- Alert Helpers ---
    showAlert(elementId, message, type = 'danger') {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.className = `alert alert-${type} show`;
        el.textContent = message;
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    hideAlert(elementId) {
        const el = document.getElementById(elementId);
        if (el) el.className = 'alert';
    },

    // --- Status Badge ---
    statusBadge(status) {
        const s = (status || '').toLowerCase();
        return `<span class="badge badge-${s}">${status}</span>`;
    },

    // --- Format Date ---
    formatDate(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    formatDateTime(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    },

    // --- Navbar ---
    initNavbar() {
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.navbar-links');
        if (hamburger && navLinks) {
            hamburger.addEventListener('click', () => {
                navLinks.classList.toggle('open');
            });
        }

        // Logout handler
        document.querySelectorAll('[data-action="logout"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await App.post('/api/auth/logout');
                    window.location.href = '/';
                } catch (err) {
                    window.location.href = '/';
                }
            });
        });
    },

    // --- Modal ---
    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('open');
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('open');
    },

    // --- Loading State ---
    showLoading(containerId) {
        const el = document.getElementById(containerId);
        if (el) {
            el.innerHTML = '<div class="loading-overlay"><span class="spinner"></span> Loading...</div>';
        }
    },

    showEmpty(containerId, message) {
        const el = document.getElementById(containerId);
        if (el) {
            el.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>${message}</p></div>`;
        }
    },

    // --- Role Display ---
    roleBadge(role) {
        const classes = { donor: 'badge-available', ngo: 'badge-confirmed', admin: 'badge-pending' };
        return `<span class="badge ${classes[role] || 'badge-pending'}">${role.charAt(0).toUpperCase() + role.slice(1)}</span>`;
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    App.initNavbar();
});

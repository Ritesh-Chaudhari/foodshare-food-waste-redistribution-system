const db = require('./database');

/**
 * Expire all donations whose pickup_deadline has passed and are not yet collected/completed.
 * Specifically updates donations with status 'AVAILABLE' or 'REQUESTED' whose pickup deadline is in the past.
 * Also closes/rejects any pending requests for those expired donations.
 */
async function expireOverdueDonations() {
    try {
        const nowIso = new Date().toISOString();

        // 1. Mark overdue AVAILABLE or REQUESTED donations as EXPIRED
        const result = await db.execute({
            sql: `
                UPDATE donations
                SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
                WHERE status IN ('AVAILABLE', 'REQUESTED')
                  AND (datetime(pickup_deadline) <= datetime('now') OR pickup_deadline <= ?)
            `,
            args: [nowIso]
        });

        // 2. Reject any pending requests for donations that are now EXPIRED
        await db.execute(`
            UPDATE donation_requests
            SET status = 'REJECTED', responded_at = CURRENT_TIMESTAMP
            WHERE status = 'PENDING'
              AND donation_id IN (SELECT id FROM donations WHERE status = 'EXPIRED')
        `);

        return result;
    } catch (err) {
        console.error('Error expiring overdue donations:', err);
    }
}

module.exports = {
    expireOverdueDonations
};

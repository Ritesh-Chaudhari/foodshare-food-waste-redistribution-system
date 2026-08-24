require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const db = require('./database');

console.log('Cleaning up donor and NGO accounts...\n');

// Delete in order to respect foreign key dependencies
const steps = [
    { sql: 'DELETE FROM donation_requests', label: 'Donation requests' },
    { sql: 'DELETE FROM donations', label: 'Donations' },
    { sql: 'DELETE FROM donors', label: 'Donor profiles' },
    { sql: 'DELETE FROM ngos', label: 'NGO profiles' },
    { sql: "DELETE FROM users WHERE role IN ('donor', 'ngo')", label: 'Donor & NGO logins' },
];

for (const step of steps) {
    const result = db.prepare(step.sql).run();
    console.log(`✓ ${step.label} deleted (${result.changes} rows)`);
}

console.log('\n==========================================');
console.log('  Cleanup completed!');
console.log('==========================================');
console.log('  Admin account preserved:');
console.log('  Email:    admin@foodshare.com');
console.log('  Password: admin123');
console.log('');

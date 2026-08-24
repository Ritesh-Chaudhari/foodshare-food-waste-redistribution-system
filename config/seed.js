require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const db = require('./database');

console.log('Seeding database...\n');

// Clear existing data
db.exec(`
    DELETE FROM donation_requests;
    DELETE FROM donations;
    DELETE FROM donors;
    DELETE FROM ngos;
    DELETE FROM users;
`);

// --- Create Admin ---
const adminPassword = bcrypt.hashSync('Ritesh@1234', 10);
const insertUser = db.prepare('INSERT INTO users (email, password, role) VALUES (?, ?, ?)');
const adminResult = insertUser.run('riteshmc018@gmail.com', adminPassword, 'admin');
console.log(`✓ Admin created: riteshmc018@gmail.com / Ritesh@1234`);

// --- Create Demo Donors ---
const donorAccounts = [
    { email: 'demo.canteen@email.com', orgName: 'Demo College Canteen', orgType: 'Canteen', contact: 'Rajesh Kumar', phone: '9876543210', address: 'Main Building, Demo College Campus, Shirpur' },
    { email: 'demo.mess@email.com', orgName: 'Demo Hostel Mess', orgType: 'Mess', contact: 'Suresh Patil', phone: '9876543211', address: 'Hostel Block A, Demo College, Shirpur' },
    { email: 'demo.restaurant@email.com', orgName: 'Demo Restaurant', orgType: 'Restaurant', contact: 'Amit Sharma', phone: '9876543212', address: 'Market Road, Near Bus Stand, Shirpur' },
    { email: 'demo.hotel@email.com', orgName: 'Demo Hotel', orgType: 'Hotel', contact: 'Priya Verma', phone: '9876543213', address: 'Station Road, Shirpur' },
];

const insertDonor = db.prepare(
    'INSERT INTO donors (user_id, organization_name, organization_type, contact_person, phone, address, city, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

const donorIds = [];
for (const d of donorAccounts) {
    const hashedPw = bcrypt.hashSync('donor123', 10);
    const userResult = insertUser.run(d.email, hashedPw, 'donor');
    const donorResult = insertDonor.run(userResult.lastInsertRowid, d.orgName, d.orgType, d.contact, d.phone, d.address, 'Shirpur', 'APPROVED');
    donorIds.push(donorResult.lastInsertRowid);
    console.log(`✓ Donor created: ${d.orgName} (${d.email}) / donor123`);
}

// Create one pending donor for admin demo
const pendingUser = insertUser.run('pending.donor@email.com', bcrypt.hashSync('donor123', 10), 'donor');
insertDonor.run(pendingUser.lastInsertRowid, 'Pending Donor Org', 'Canteen', 'New Contact', '9876543220', 'Shirpur Road, Shirpur', 'Shirpur', 'PENDING');
console.log(`✓ Pending Donor created: pending.donor@email.com / donor123`);

// --- Create Demo NGOs ---
const ngoAccounts = [
    { email: 'demo.ngo1@email.com', name: 'Demo Welfare Society', contact: 'Anita Desai', phone: '9876543300', address: 'Nagar Road, Shirpur', regInfo: 'NGO Registration No: MH/2020/1234' },
    { email: 'demo.ngo2@email.com', name: 'Demo Food Bank', contact: 'Vikram Joshi', phone: '9876543301', address: 'Gandhi Chowk, Shirpur', regInfo: 'NGO Registration No: MH/2021/5678' },
];

const insertNgo = db.prepare(
    'INSERT INTO ngos (user_id, ngo_name, contact_person, phone, address, city, registration_info, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
);

const ngoIds = [];
for (const n of ngoAccounts) {
    const hashedPw = bcrypt.hashSync('ngo123', 10);
    const userResult = insertUser.run(n.email, hashedPw, 'ngo');
    const ngoResult = insertNgo.run(userResult.lastInsertRowid, n.name, n.contact, n.phone, n.address, 'Shirpur', n.regInfo, 'APPROVED');
    ngoIds.push(ngoResult.lastInsertRowid);
    console.log(`✓ NGO created: ${n.name} (${n.email}) / ngo123`);
}

// Create one pending NGO for admin demo
const pendingNgoUser = insertUser.run('pending.ngo@email.com', bcrypt.hashSync('ngo123', 10), 'ngo');
insertNgo.run(pendingNgoUser.lastInsertRowid, 'Pending NGO', 'New Contact Person', '9876543310', 'Test Address, Shirpur', 'Shirpur', 'Pending Registration', 'PENDING');
console.log(`✓ Pending NGO created: pending.ngo@email.com / ngo123`);

// --- Create Demo Donations (for demonstration purposes) ---
const insertDonation = db.prepare(`
    INSERT INTO donations (donor_id, food_description, quantity, food_category, preparation_time, pickup_location, pickup_deadline, additional_notes, status, confirmed_ngo_id, collected_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Create an AVAILABLE donation
const availDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
insertDonation.run(
    donorIds[0], 'Rice, Dal and Vegetable Curry', '40 meals', 'Vegetarian', '12:30',
    'Demo College Canteen, Main Building, Demo College Campus, Shirpur',
    availDeadline, 'Freshly prepared. Available after lunch service.',
    'AVAILABLE', null, null, null
);
console.log('✓ Demo AVAILABLE donation created');

// Create a COMPLETED donation
const completedDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const completedDeadline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString();
insertDonation.run(
    donorIds[1], 'Chapati and Paneer', '30 meals', 'Vegetarian', '19:00',
    'Hostel Block A, Demo College, Shirpur',
    completedDeadline, '',
    'COMPLETED', ngoIds[0], completedDate, completedDate
);
console.log('✓ Demo COMPLETED donation created');

console.log('\n==========================================');
console.log('  Seed completed successfully!');
console.log('==========================================\n');
console.log('Demo Accounts:');
console.log('  Admin:   admin@foodshare.com / admin123');
console.log('  Donor:   demo.canteen@email.com / donor123');
console.log('  NGO:     demo.ngo1@email.com / ngo123');
console.log('  Pending Donor: pending.donor@email.com / donor123');
console.log('  Pending NGO:   pending.ngo@email.com / ngo123');
console.log('');
console.log('Demo Data:');
console.log('  1 AVAILABLE donation (can be requested by NGOs)');
console.log('  1 COMPLETED donation (history)');
console.log('');

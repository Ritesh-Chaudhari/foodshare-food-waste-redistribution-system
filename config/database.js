const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'food_waste.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
    -- Users table (core authentication)
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('donor', 'ngo', 'admin')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
    );

    -- Donors table (extends users)
    CREATE TABLE IF NOT EXISTS donors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        organization_name TEXT NOT NULL,
        organization_type TEXT NOT NULL CHECK(organization_type IN ('Mess', 'Canteen', 'Hotel', 'Restaurant')),
        contact_person TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        verification_status TEXT DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- NGOs table (extends users)
    CREATE TABLE IF NOT EXISTS ngos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        ngo_name TEXT NOT NULL,
        contact_person TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        registration_info TEXT,
        verification_status TEXT DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Donations table
    CREATE TABLE IF NOT EXISTS donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        donor_id INTEGER NOT NULL,
        food_description TEXT NOT NULL,
        quantity TEXT NOT NULL,
        food_category TEXT DEFAULT 'General',
        preparation_time TEXT,
        pickup_location TEXT NOT NULL,
        pickup_deadline DATETIME NOT NULL,
        additional_notes TEXT,
        status TEXT DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'REQUESTED', 'CONFIRMED', 'COLLECTED', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
        confirmed_ngo_id INTEGER,
        collected_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (donor_id) REFERENCES donors(id) ON DELETE CASCADE,
        FOREIGN KEY (confirmed_ngo_id) REFERENCES ngos(id)
    );

    -- Donation requests table
    CREATE TABLE IF NOT EXISTS donation_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        donation_id INTEGER NOT NULL,
        ngo_id INTEGER NOT NULL,
        status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        responded_at DATETIME,
        FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
        FOREIGN KEY (ngo_id) REFERENCES ngos(id) ON DELETE CASCADE,
        UNIQUE(donation_id, ngo_id)
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON donations(donor_id);
    CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
    CREATE INDEX IF NOT EXISTS idx_donations_pickup_deadline ON donations(pickup_deadline);
    CREATE INDEX IF NOT EXISTS idx_donation_requests_donation_id ON donation_requests(donation_id);
    CREATE INDEX IF NOT EXISTS idx_donation_requests_ngo_id ON donation_requests(ngo_id);
    CREATE INDEX IF NOT EXISTS idx_donors_user_id ON donors(user_id);
    CREATE INDEX IF NOT EXISTS idx_ngos_user_id ON ngos(user_id);
    CREATE INDEX IF NOT EXISTS idx_donors_city ON donors(city);
    CREATE INDEX IF NOT EXISTS idx_ngos_city ON ngos(city);
`);

module.exports = db;

const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDatabase() {
  // Create tables in Turso cloud database
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('donor', 'ngo', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );
  `);

  await db.execute(`
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
  `);

  await db.execute(`
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
  `);

  await db.execute(`
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
  `);

  await db.execute(`
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
  `);

  // Seed Admin Account
  const adminEmail = process.env.ADMIN_EMAIL || 'riteshmc018@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Ritesh@1234';
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  const existingAdmin = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [adminEmail]
  });

  if (existingAdmin.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO users (email, password, role, is_active) VALUES (?, ?, ?, ?)',
      args: [adminEmail, hashedPassword, 'admin', 1]
    });
    console.log(`[Turso Cloud DB] Admin created: ${adminEmail}`);
  } else {
    await db.execute({
      sql: 'UPDATE users SET password = ?, role = ?, is_active = 1 WHERE email = ?',
      args: [hashedPassword, 'admin', adminEmail]
    });
    console.log(`[Turso Cloud DB] Admin credentials refreshed: ${adminEmail}`);
  }
}

// Trigger initial setup
initDatabase().catch(console.error);

module.exports = db;
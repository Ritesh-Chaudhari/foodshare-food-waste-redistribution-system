# Food Waste Redistribution and Donation Management System

A web-based platform that coordinates surplus food redistribution between food donors (college canteens, hostel messes, hotels, and restaurants) and registered NGOs within a selected city.

---

## Table of Contents

- [Project Purpose](#project-purpose)
- [Features](#features)
- [User Roles](#user-roles)
- [Workflow](#workflow)
- [Technology Stack](#technology-stack)
- [Database](#database)
- [Installation](#installation)
- [Running the Project](#running-the-project)
- [Demo Accounts](#demo-accounts)
- [Project Structure](#project-structure)
- [Project Limitations](#project-limitations)
- [Future Scope](#future-scope)

---

## Project Purpose

Large quantities of suitable surplus food go unused in messes, canteens, hotels, and restaurants every day. At the same time, registered NGOs willing to collect and redistribute such food lack a simple coordination mechanism. This system bridges that gap by providing a platform where:

- **Donors** can post surplus food listings with pickup details
- **NGOs** can browse available donations and request collection
- **Administrators** can manage users and monitor the system

The system is initially limited to one configurable city (default: Shirpur).

---

## Features

- **Role-based access** — Separate dashboards for Donors, NGOs, and Admin
- **Registration & verification** — Donors and NGOs register and await admin approval
- **Donation management** — Donors create listings with food details, quantity, pickup location, and deadline
- **Donation browsing** — NGOs browse available donations and request entire quantities
- **Request handling** — Donors accept/reject NGO requests; only one NGO is confirmed per donation
- **Collection tracking** — NGOs mark donations as collected; system auto-completes
- **Donation expiry** — Past-deadline donations automatically expire
- **Complete history** — Donation records tracked for donors, NGOs, and admin
- **Real database** — All data persisted in SQLite
- **Password hashing** — bcrypt for secure password storage
- **Server-side validation** — All inputs validated on the backend
- **Responsive design** — Works on desktop, laptop, tablet, and mobile

---

## User Roles

### Donor
- Represents a food establishment (Mess, Canteen, Hotel, Restaurant)
- Creates donation listings with food description, quantity, preparation time, pickup location, and deadline
- Reviews and accepts/rejects NGO requests
- Views donation history

### NGO
- Registered non-profit organization
- Browses available donations
- Requests entire donations
- Marks confirmed donations as collected
- Views collection history

### Administrator
- Manages the platform
- Approves/rejects donor and NGO registrations
- Monitors all donations and system statistics
- Can enable/disable accounts

---

## Workflow

1. **Donor registers** → Admin verifies the donor
2. **NGO registers** → Admin verifies the NGO
3. **Donor creates a donation** → Status: AVAILABLE
4. **NGO browses available donations** → Sees food details and pickup info
5. **NGO requests a donation** → Status: REQUESTED
6. **Donor reviews the request** → Accepts or rejects
7. **Donor confirms an NGO** → Status: CONFIRMED (other requests rejected)
8. **NGO physically collects food** → NGO clicks "Mark as Collected"
9. **System auto-completes** → Status: COMPLETED
10. **Records appear in history** → Visible to donor, NGO, and admin

If a donation's pickup deadline passes while still AVAILABLE, it automatically expires.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (via better-sqlite3) |
| **Authentication** | express-session, bcryptjs |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Session Store** | SQLite (connect-sqlite3) |

---

## Database

### Tables

| Table | Description |
|-------|------------|
| `users` | Core authentication (id, email, password, role, is_active) |
| `donors` | Donor profiles (organization name, type, contact, verification status) |
| `ngos` | NGO profiles (name, contact, registration info, verification status) |
| `donations` | Food donation listings (food, quantity, pickup, deadline, status) |
| `donation_requests` | NGO requests for donations (status: PENDING/ACCEPTED/REJECTED) |

### Donation Statuses

`AVAILABLE` → `REQUESTED` → `CONFIRMED` → `COMPLETED`  
`AVAILABLE` → `EXPIRED`

---

## Installation

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Semester_Project_1/Project_Files
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Seed the database with demo data**
   ```bash
   npm run seed
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## Running the Project

### Development
```bash
npm run dev
```

### Seed Database
```bash
npm run seed
```

### Start Server
```bash
npm start
```

The server runs on `http://localhost:3000` by default. Change the port in `.env` file.

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@foodshare.com | admin123 |
| **Donor** | demo.canteen@email.com | donor123 |
| **Donor** | demo.mess@email.com | donor123 |
| **Donor** | demo.restaurant@email.com | donor123 |
| **Donor** | demo.hotel@email.com | donor123 |
| **NGO** | demo.ngo1@email.com | ngo123 |
| **NGO** | demo.ngo2@email.com | ngo123 |
| **Pending Donor** | pending.donor@email.com | donor123 |
| **Pending NGO** | pending.ngo@email.com | ngo123 |

> There is **no public admin registration page**. The admin account is created through the seed script.

---

## Project Structure

```
Project_Files/
├── config/
│   ├── database.js      # SQLite database setup & schema
│   ├── middleware.js     # Auth & role-based access middleware
│   ├── city.js          # City configuration
│   └── seed.js          # Demo data seeder
├── routes/
│   ├── auth.js          # Login, register, logout routes
│   ├── donor.js         # Donor dashboard & donation routes
│   ├── ngo.js           # NGO dashboard & request routes
│   ├── admin.js         # Admin management routes
│   └── public.js        # Public page routes
├── views/
│   ├── donor/           # Donor HTML pages
│   ├── ngo/             # NGO HTML pages
│   └── admin/           # Admin HTML pages
├── public/
│   ├── css/style.css    # Main stylesheet
│   ├── js/app.js        # Client-side utilities
│   ├── js/nav.js        # Dynamic navigation
│   └── pages/           # Public HTML pages
├── data/                # SQLite database (auto-created, gitignored)
├── server.js            # Main Express server
├── .env                 # Environment variables (gitignored)
├── .gitignore
├── package.json
└── README.md
```

---

## Business Rules (Enforced Server-Side)

1. Only **approved donors** can create donations
2. Only **approved NGOs** can request donations
3. Only **AVAILABLE** donations can be requested
4. NGO requests the **entire quantity** (no partial donations)
5. Multiple NGOs can request the same donation
6. Only **one NGO** is confirmed per donation
7. Once confirmed, the donation is **no longer available** to others
8. Only the **donor who created** the donation can accept/reject requests
9. Only the **confirmed NGO** can mark a donation as collected
10. Marking as collected **automatically completes** the donation
11. **Expired** donations cannot be requested
12. **Completed** donations cannot be reopened
13. Users cannot access other users' private information
14. Only the **admin** can approve/reject donors and NGOs

---

## Project Limitations

- Limited to **one city** (configurable in `.env`)
- No real-time notifications
- No GPS or distance calculations
- No mobile app
- No payment processing
- No chat or messaging system
- No automated NGO verification (admin manually approves)

---

## Future Scope

- **Push notifications** for new donations and status changes
- **Multi-city support** with city-based filtering
- **Donation analytics** and reporting dashboards
- **Location-based recommendations** using GPS
- **Mobile application** for Android/iOS
- **Email/SMS notifications** for stakeholders
- **Rating system** for donors and NGOs
- **Bulk donation management** for large-scale events
- **Food quality tracking** and categorization
- **API integration** with government food programs

---

## License

This project is developed as a college semester project for educational purposes.

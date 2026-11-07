# Sruthi Apartment Maintenance Request Management System

A modern, responsive full-stack web application designed for residential apartment communities to streamline maintenance request logging, technician assignments, repair execution records, and facility cost tracking.

---

## 🏢 Project Overview

The **Sruthi Apartment Maintenance Request Management System** enables residents to report facility complaints and allows facility management staff to triage requests, assign specialized technicians, update repair statuses in real-time, record completed repair work and parts expenses, and generate executive analytics and CSV audit reports.

### Key Highlights
- **Premium Corporate UI/UX**: Designed around an executive **Navy Blue (#0f172a)**, **Pure White (#ffffff)**, and **Vibrant Teal (#0d9488)** color palette.
- **Pure Native Stack**: Built strictly with HTML5, CSS3, modern Vanilla JavaScript, Node.js with Express.js, and MySQL 8.0 (No heavy frontend frameworks like React or Angular).
- **Relational Integrity**: Complete MySQL database with strict foreign keys, cascading constraints, and itemized maintenance expense logging.
- **Visual Analytics**: Interactive data visualizations powered by Chart.js (monthly trends, complaint categories, staff workload, and status pipeline).
- **Audit-Ready Exports**: Instant client-side and server-side CSV downloads for requests, repair expenses, residents, and staff rosters.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend UI** | HTML5, CSS3 (Custom Responsive Design System) |
| **Frontend Logic** | Vanilla JavaScript (ES6+), Fetch API, DOM Scripting |
| **Icons & Typography** | Font Awesome 6.5.1 CDN, Inter Google Font |
| **Charts & Analytics**| Chart.js 4.4.1 CDN |
| **Backend Runtime** | Node.js (v18+) with Express.js |
| **Database** | MySQL 8.0 |
| **Database Driver** | `mysql2` (with async/await connection pooling) |
| **Security & Auth** | `bcryptjs` password hashing, `jsonwebtoken` (JWT) |
| **Configuration** | `dotenv` environment variables, `cors` |

---

## 📂 Project Folder Structure

```
sruthi-apartment-management/
│
├── public/
│   ├── css/
│   │   ├── style.css          # Master styles, theme variables, sidebar, modals & toasts
│   │   ├── dashboard.css      # KPI widgets, metric cards, and Chart.js containers
│   │   └── forms.css          # Form inputs, search toolbars, pagination, and login UI
│   ├── js/
│   │   ├── common.js         # Auth guard, toast alerts, confirm dialogs, API helpers
│   │   ├── dashboard.js      # Dashboard metrics & live Chart.js rendering
│   │   ├── residents.js      # Resident CRUD operations, search & detail modal
│   │   ├── staff.js          # Staff CRUD operations & specialization filters
│   │   ├── requests.js       # Maintenance request pipeline, assignment & status updates
│   │   ├── records.js        # Maintenance record logs, expense ledger & auto-complete
│   │   └── reports.js        # Executive charts, breakdown tables & CSV exports
│   ├── images/
│   └── pages/
│       ├── login.html        # Authentication portal with show/hide password & demo autofill
│       ├── dashboard.html    # Executive dashboard with 7 KPI metrics and recent feed
│       ├── residents.html    # Resident management directory
│       ├── staff.html        # Maintenance technician roster
│       ├── requests.html     # Maintenance request ticketing system
│       ├── records.html      # Repair records & expense management
│       └── reports.html      # Visual analytics & downloadable CSV exports
│
├── config/
│   └── db.js                 # MySQL2 connection pool with auto-reconnect
│
├── routes/
│   ├── auth.js               # Sign in, session check & sign out APIs
│   ├── residents.js          # Resident REST endpoints
│   ├── staff.js              # Maintenance staff REST endpoints
│   ├── requests.js           # Maintenance request REST endpoints
│   ├── records.js            # Maintenance repair record REST endpoints
│   ├── dashboard.js          # Dynamic dashboard metrics API
│   └── reports.js            # Analytics metrics & CSV export endpoints
│
├── server.js                 # Express server configuration & route mounting
├── setup-db.js               # One-click automated database initializer script
├── database.sql              # MySQL DDL schema and realistic seed data
├── package.json              # Project dependencies and npm scripts
├── .env.example              # Template environment variables
└── README.md                 # Documentation and setup instructions
```

---

## 🗄️ MySQL Database Structure

Database Name: `sruthi_apartment_db`

### 1. `Residents` Table
Stores resident identity, flat number, and contact info.
- `resident_id` INT PRIMARY KEY AUTO_INCREMENT
- `name` VARCHAR(100) NOT NULL
- `flat_no` VARCHAR(20) NOT NULL
- `phone` VARCHAR(15) NOT NULL
- `email` VARCHAR(100) NOT NULL

### 2. `Maintenance_staff` Table
Stores technicians and their facility specialization.
- `staff_id` INT PRIMARY KEY AUTO_INCREMENT
- `name` VARCHAR(100) NOT NULL
- `phone` VARCHAR(15) NOT NULL
- `specialization` VARCHAR(100) NOT NULL (Plumbing, Electrical, Cleaning, Painting, Lift Maintenance, Water Supply, Other)
- `email` VARCHAR(100) NOT NULL

### 3. `Requests` Table
Stores maintenance complaints logged by apartment residents.
- `request_id` INT PRIMARY KEY AUTO_INCREMENT
- `resident_id` INT NOT NULL (Foreign key -> `Residents.resident_id`)
- `staff_id` INT NULL (Foreign key -> `Maintenance_staff.staff_id`)
- `issues_type` VARCHAR(50) NOT NULL (Plumbing, Electrical, Cleaning, Painting, Lift Maintenance, Water Supply, Other)
- `description` TEXT NOT NULL
- `request_date` DATETIME DEFAULT CURRENT_TIMESTAMP
- `status` VARCHAR(30) DEFAULT 'Pending' (Pending, Assigned, In Progress, Completed, Rejected)

### 4. `Maintenance_record` Table
Stores completed repair work, parts replacement logs, and monetary costs.
- `record_id` INT PRIMARY KEY AUTO_INCREMENT
- `request_id` INT NOT NULL (Foreign key -> `Requests.request_id`)
- `work_description` TEXT NOT NULL
- `completion_date` DATE NOT NULL
- `repair_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00
- `remarks` VARCHAR(255) DEFAULT NULL

### 5. `Admin_users` Table
Stores authorized administrative accounts with bcrypt-hashed passwords.
- `user_id` INT PRIMARY KEY AUTO_INCREMENT
- `username` VARCHAR(50) UNIQUE NOT NULL
- `email` VARCHAR(100) UNIQUE NOT NULL
- `password` VARCHAR(255) NOT NULL
- `full_name` VARCHAR(100) NOT NULL
- `role` VARCHAR(50) DEFAULT 'Admin'
- `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP

---

## 🚀 Step-by-Step Installation & Setup Guide

### Prerequisites
1. **Node.js**: Version 18.x or newer installed ([Download Node.js](https://nodejs.org/)).
2. **MySQL Server 8.0**: Installed and running (e.g., MySQL 8.0 Service, MySQL Workbench, or XAMPP).
3. **VS Code**: Visual Studio Code editor recommended.

---

### Step 1: Open Project in VS Code
Open VS Code, press `Ctrl + O` (or `File -> Open Folder...`), and select the project folder:
```
C:\Users\P.Sruthi\.gemini\antigravity\scratch\sruthi-apartment-management
```

### Step 2: Configure Environment Variables
Verify or edit `.env` in the root of the project to match your local MySQL configuration:
```env
PORT=3000
NODE_ENV=development

# MySQL Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=sruthi_apartment_db
DB_PORT=3306

# Secret key for JWT session tokens
JWT_SECRET=sruthi_apartment_secret_key_2026_jwt
```
> *Note: If your MySQL root user does not have a password (default on XAMPP), leave `DB_PASSWORD=` blank.*

### Step 3: Install Dependencies
Open the VS Code Terminal (`Ctrl + ~`) and execute:
```bash
npm install
```

### Step 4: Initialize the MySQL Database
You can initialize the database using either of the following two methods:

#### Option A: Automatic 1-Command Setup (Recommended)
Run the bundled database initializer script:
```bash
npm run init-db
```
This script will automatically:
1. Connect to your MySQL server.
2. Create the database `sruthi_apartment_db` if it does not already exist.
3. Execute all tables creation and insert realistic sample records for Residents, Staff, Requests, Records, and the Admin user.

#### Option B: Manual Import via MySQL Workbench or Command Line
Open MySQL Workbench or your MySQL terminal and run:
```bash
mysql -u root -p < database.sql
```

### Step 5: Start the Web Server
In the VS Code terminal, start the server:
```bash
npm start
```
Or for auto-reloading during development:
```bash
npm run dev
```

### Step 6: Access the Application
Open your web browser and navigate to:
```
http://localhost:3000
```
or directly to the login page:
```
http://localhost:3000/pages/login.html
```

---

## 🔑 Default Login Credentials

| Role | Username / Email | Password |
|---|---|---|
| **Super Administrator** | `admin@sruthi.com` | `admin123` |

*(A convenient **"Auto-fill"** button is also provided directly on the login screen for instant one-click demonstration).*

---

## 🖥️ Application Pages & Features

### 1. Login Page (`/pages/login.html`)
- Dual-panel modern design with apartment facility branding on the left.
- Show/Hide password toggle icon.
- JWT authentication and session storage.
- Auto-redirect to dashboard upon successful sign in.

### 2. Executive Dashboard (`/pages/dashboard.html`)
- **7 Live KPI Stat Cards**: Total Residents, Total Maintenance Staff, Total Maintenance Requests, Pending Requests, In Progress Requests, Completed Requests, and Total Repair Costs.
- **Fast Operations Toolbar**: Shortcuts to add a request, resident, staff, or repair record.
- **Chart.js Overview**: Monthly request volume vs. completed requests.
- **Chart.js Categories**: Doughnut chart showing complaint distribution by issue category.
- **Recent Requests Feed**: Live table showing the latest complaints with status badges.

### 3. Residents Management (`/pages/residents.html`)
- Comprehensive resident directory with flat numbers, phone, email, and total requests.
- Real-time search across resident names, flat numbers, and phone numbers.
- Modal forms to **Add** and **Edit** resident details.
- **Resident Profile & History Modal**: Inspect a resident's details and full history of maintenance requests.
- Safe deletion with confirmation modal.

### 4. Maintenance Staff Management (`/pages/staff.html`)
- Roster of facility technicians categorized by specialization (Plumbing, Electrical, Cleaning, Painting, Lift Maintenance, Water Supply, Other).
- Filter staff by specialization chips / dropdown.
- Real-time search by name, contact, or specialization.
- Modal forms to **Add** and **Edit** staff.
- **Technician Profile Modal**: Inspect assigned workload, active tickets, and completed jobs.
- Safe deletion with confirmation modal.

### 5. Maintenance Requests (`/pages/requests.html`)
- End-to-end ticketing pipeline with status workflow: `Pending` -> `Assigned` -> `In Progress` -> `Completed` / `Rejected`.
- Search by request ID, resident name, flat number, or keyword description.
- Multi-filtering by **Status** and **Issue Category**.
- **Submit Request Modal**: Select resident from dynamic dropdown, pick category, and enter description.
- **Quick Assign Modal**: Reassign technician on the fly.
- **Quick Status Modal**: Update request status in one click.
- **Ticket Detail Modal**: View comprehensive ticket information and all linked repair cost records.

### 6. Maintenance Records & Costs (`/pages/records.html`)
- Expense tracking ledger displaying itemized parts/repair costs, completion dates, and technician remarks.
- KPI summary: Total Repair Expenditure, Total Records, Average Cost, and Highest Single Repair Cost.
- **Add Maintenance Record Modal**: Select active request from dropdown, log repair work done, completion date, and cost in INR (₹).
- Option to automatically transition the linked request status to **Completed** upon filing the repair record.
- Edit and delete actions with confirmation prompts.

### 7. Reports & Analytics (`/pages/reports.html`)
- Executive reporting dashboard featuring 4 interactive Chart.js visualizations:
  1. **Monthly Maintenance Expenses (₹)** (Bar Chart)
  2. **Staff-wise Assigned Requests** (Horizontal Bar Chart)
  3. **Category-wise Complaints** (Doughnut Chart)
  4. **Status Pipeline Distribution** (Pie Chart)
- **Staff Performance Summary Table**: Detailed breakdown of assigned vs. completed jobs per technician.
- **Category Expense Breakdown Table**: Complaint frequency and cumulative repair expenditure per issue type.
- **Instant CSV Downloads**: Export requests, repair expenses, residents, and staff rosters as downloadable CSV files for audits.

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/login` - Authenticate admin credentials and issue JWT.
- `GET /api/auth/me` - Verify current session token.
- `POST /api/auth/logout` - Clear user session.

### Residents
- `GET /api/residents` - List residents (supports `?search=`).
- `GET /api/residents/:id` - Fetch single resident with maintenance history.
- `POST /api/residents` - Add new resident.
- `PUT /api/residents/:id` - Update resident details.
- `DELETE /api/residents/:id` - Delete resident and cascade linked tickets.

### Maintenance Staff
- `GET /api/staff` - List technicians (supports `?search=` & `?specialization=`).
- `GET /api/staff/:id` - Fetch single staff member with assigned tickets.
- `POST /api/staff` - Register new technician.
- `PUT /api/staff/:id` - Update technician details.
- `DELETE /api/staff/:id` - Delete technician record.

### Maintenance Requests
- `GET /api/requests` - List requests (supports `?search=`, `?status=`, `?issues_type=`).
- `GET /api/requests/:id` - Fetch ticket details and linked repair records.
- `POST /api/requests` - Submit new maintenance complaint.
- `PUT /api/requests/:id` - Update full request information.
- `PUT /api/requests/:id/assign` - Assign technician to request.
- `PUT /api/requests/:id/status` - Transition ticket status.
- `DELETE /api/requests/:id` - Remove maintenance request.

### Maintenance Records
- `GET /api/records` - List repair records with joins and cost calculation.
- `GET /api/records/:id` - Fetch single repair record.
- `GET /api/records/stats/summary` - Aggregate total, average, and max repair expenses.
- `POST /api/records` - Add repair record (supports auto-complete flag).
- `PUT /api/records/:id` - Update repair record.
- `DELETE /api/records/:id` - Delete repair record.

### Dashboard & Reports
- `GET /api/dashboard` - Real-time statistics, monthly trends, and recent feed.
- `GET /api/reports` - Comprehensive multi-dimensional metrics for charts & tables.
- `GET /api/reports/export/:type` - Download CSV report (`requests`, `records`, `residents`, `staff`).

---

## 🎓 Academic Mini Project Note

This project is fully designed and structured for B.Tech Computer Science and Engineering mini-project demonstrations and assessments. It showcases:
- Full-stack client-server architecture with Express.js REST API.
- Relational database schema design adhering to Third Normal Form (3NF).
- Foreign key constraints, cascade operations, and indexed queries.
- SQL injection prevention via parameterized queries.
- Clean separation of concerns (Config, Routes, Public static assets, Utilities).
- Real-time client-side input validation and error handling.
- Enterprise-grade Navy Blue & Teal responsive dashboard UI.

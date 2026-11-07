-- =====================================================================
-- Database Schema for Sruthi Apartment Maintenance Request Management System
-- Database Name: sruthi_apartment_db
-- =====================================================================

CREATE DATABASE IF NOT EXISTS sruthi_apartment_db;
USE sruthi_apartment_db;

-- Drop tables in reverse order of foreign key dependencies
DROP TABLE IF EXISTS Maintenance_record;
DROP TABLE IF EXISTS Requests;
DROP TABLE IF EXISTS Maintenance_staff;
DROP TABLE IF EXISTS Residents;
DROP TABLE IF EXISTS Admin_users;

-- ---------------------------------------------------------------------
-- Table 1: Residents
-- ---------------------------------------------------------------------
CREATE TABLE Residents (
    resident_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    flat_no VARCHAR(20) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table 2: Maintenance_staff
-- ---------------------------------------------------------------------
CREATE TABLE Maintenance_staff (
    staff_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    specialization VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table 3: Requests
-- ---------------------------------------------------------------------
CREATE TABLE Requests (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    resident_id INT NOT NULL,
    staff_id INT NULL,
    issues_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    request_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'Pending',
    CONSTRAINT fk_requests_resident 
        FOREIGN KEY (resident_id) REFERENCES Residents(resident_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_requests_staff 
        FOREIGN KEY (staff_id) REFERENCES Maintenance_staff(staff_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table 4: Maintenance_record
-- ---------------------------------------------------------------------
CREATE TABLE Maintenance_record (
    record_id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    work_description TEXT NOT NULL,
    completion_date DATE NOT NULL,
    repair_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    remarks VARCHAR(255) DEFAULT NULL,
    CONSTRAINT fk_record_request 
        FOREIGN KEY (request_id) REFERENCES Requests(request_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Table 5: Admin_users (For Authentication)
-- ---------------------------------------------------------------------
CREATE TABLE Admin_users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'Admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- Sample Data Insertion
-- =====================================================================

-- 1. Insert Residents
INSERT INTO Residents (resident_id, name, flat_no, phone, email) VALUES
(1, 'Sruthi Penumalli', 'A-101', '9876543210', 'sruthi.p@example.com'),
(2, 'Rajesh Kumar', 'A-204', '9845123456', 'rajesh.kumar@example.com'),
(3, 'Ananya Sharma', 'B-302', '9712345678', 'ananya.s@example.com'),
(4, 'Vikram Reddy', 'B-405', '9988776655', 'vikram.reddy@example.com'),
(5, 'Pooja Iyer', 'C-102', '9123456780', 'pooja.iyer@example.com'),
(6, 'Deepak Verma', 'C-301', '9876501234', 'deepak.v@example.com'),
(7, 'Meera Nair', 'D-203', '9654321870', 'meera.nair@example.com'),
(8, 'Karthik Swaminathan', 'D-404', '9543210987', 'karthik.s@example.com'),
(9, 'Sneha Mukherjee', 'E-105', '9432109876', 'sneha.m@example.com'),
(10, 'Arjun Deshmukh', 'E-502', '9321098765', 'arjun.d@example.com');

-- 2. Insert Maintenance Staff
INSERT INTO Maintenance_staff (staff_id, name, phone, specialization, email) VALUES
(1, 'Ramesh Babu', '9811223344', 'Plumbing', 'ramesh.plumber@sruthi.com'),
(2, 'Suresh Rao', '9822334455', 'Electrical', 'suresh.electric@sruthi.com'),
(3, 'Manish Tiwari', '9833445566', 'Lift Maintenance', 'manish.lift@sruthi.com'),
(4, 'Lakshmi Devi', '9844556677', 'Cleaning', 'lakshmi.clean@sruthi.com'),
(5, 'Santosh Patil', '9855667788', 'Painting', 'santosh.paint@sruthi.com'),
(6, 'Gopal Das', '9866778899', 'Water Supply', 'gopal.water@sruthi.com');

-- 3. Insert Requests
INSERT INTO Requests (request_id, resident_id, staff_id, issues_type, description, request_date, status) VALUES
(1, 1, 1, 'Plumbing', 'Kitchen sink pipe is leaking causing water pooling under the counter.', '2026-11-01 09:30:00', 'Completed'),
(2, 2, 2, 'Electrical', 'Main switchboard sparking when turning on master bedroom AC.', '2026-11-02 11:15:00', 'Completed'),
(3, 3, 3, 'Lift Maintenance', 'Tower B passenger lift making grinding noise and stopping unevenly at 3rd floor.', '2026-11-03 14:00:00', 'In Progress'),
(4, 4, 6, 'Water Supply', 'Low water pressure in 4th-floor master bathroom and solar heater connection.', '2026-11-04 08:45:00', 'Assigned'),
(5, 5, 4, 'Cleaning', 'Corridor outside flat C-102 needs urgent deep cleaning due to garbage leakage.', '2026-11-04 16:20:00', 'Completed'),
(6, 6, 5, 'Painting', 'Severe ceiling dampness and peeling paint patch in drawing room ceiling.', '2026-11-05 10:10:00', 'Pending'),
(7, 7, 1, 'Plumbing', 'Continuous toilet flush overflow wasting water into the bowl.', '2026-11-05 13:40:00', 'Completed'),
(8, 8, 2, 'Electrical', 'Corridor light fixture flickering intermittently and causing tripping.', '2026-11-06 09:00:00', 'Assigned'),
(9, 9, NULL, 'Other', 'Balcony safety net torn by stray birds, needs replacement.', '2026-11-06 15:30:00', 'Pending'),
(10, 10, 3, 'Lift Maintenance', 'Tower E lift button panel display cracked and floor indicator unresponsive.', '2026-11-06 17:00:00', 'In Progress'),
(11, 1, 6, 'Water Supply', 'Water in kitchen tap coming with slight brownish muddy residue.', '2026-11-07 08:00:00', 'Pending'),
(12, 3, NULL, 'Painting', 'Requesting touch up on external balcony wall after monsoon stain.', '2026-11-07 10:30:00', 'Rejected');

-- 4. Insert Maintenance Records
INSERT INTO Maintenance_record (record_id, request_id, work_description, completion_date, repair_cost, remarks) VALUES
(1, 1, 'Replaced damaged PVC U-trap pipe and applied Teflon sealant to basin inlet.', '2026-11-01', 450.00, 'Checked for 15 mins, no further leaks detected.'),
(2, 2, 'Replaced faulty 32A Siemens miniature circuit breaker (MCB) and tightened terminal connections.', '2026-11-02', 1250.00, 'Load test completed successfully. Safe to operate.'),
(3, 5, 'Deep cleaned and sanitized 1st-floor corridor floor with industrial disinfectant and air deodorizer.', '2026-11-04', 350.00, 'Resident verified cleanliness.'),
(4, 7, 'Replaced internal siphon valve and ballcock assembly in cistern tank.', '2026-11-05', 850.00, 'Installed Jaquar genuine replacement spares.'),
(5, 3, 'Initial inspection of elevator hoistway cable and guide shoe lubrication completed. Part ordered.', '2026-11-04', 1800.00, 'Interim safety clearance granted; final check pending.'),
(6, 4, 'Air lock bled from vertical riser manifold and pressure booster regulator adjusted.', '2026-11-05', 600.00, 'Water pressure restored to 2.8 bar.'),
(7, 8, 'Replaced 18W LED panel driver and secured loose neutral wire in ceiling junction box.', '2026-11-06', 420.00, 'Flicker completely resolved.'),
(8, 10, 'Replaced floor button PCB matrix module and recalibrated floor level sensors.', '2026-11-07', 2400.00, 'Final testing in progress.');

-- 5. Insert Admin User (Password is 'admin123')
-- Bcrypt hash for 'admin123': $2a$10$wK1k6aZgQ0W6jL9wzNfe9.a2bO9/kK2WqFf7R6H4S8H3mR2I5J9dK
INSERT INTO Admin_users (user_id, username, email, password, full_name, role) VALUES
(1, 'admin', 'admin@sruthi.com', '$2a$10$wK1k6aZgQ0W6jL9wzNfe9.a2bO9/kK2WqFf7R6H4S8H3mR2I5J9dK', 'Sruthi Administrator', 'Super Admin');

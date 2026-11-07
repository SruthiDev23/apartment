
const express = require('express');
const path = require('path');
const cors = require('cors');

require('dotenv').config({
    path: path.join(__dirname, '.env')
});

const { testConnection } = require('./config/db');

// Import all API routes
const authRoutes = require('./routes/auth');
const residentsRoutes = require('./routes/residents');
const staffRoutes = require('./routes/staff');
const requestsRoutes = require('./routes/requests');
const recordsRoutes = require('./routes/records');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/residents', residentsRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);

// Backend health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        app: 'Sruthi Apartment Maintenance System'
    });
});

// Login page
app.get('/', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'public', 'pages', 'login.html')
    );
});

// API not found
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Application Error:', err);
    res.status(500).json({
        success: false,
        message: err.message
    });
});

// Start server
app.listen(PORT, async () => {
    console.log('==============================================');
    console.log('SRUTHI APARTMENT MAINTENANCE SYSTEM');
    console.log('==============================================');
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Login: http://localhost:${PORT}/pages/login.html`);
    console.log(`Health: http://localhost:${PORT}/api/health`);

    await testConnection();
});

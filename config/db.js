const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool for MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sruthi_apartment_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: 'Z',
  dateStrings: true
});

// Test connection helper
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('MySQL Database connection verified successfully.');
    console.log(`Connected to database: ${process.env.DB_NAME || 'sruthi_apartment_db'}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('MySQL Database Connection Error:', error.message);
    console.error('Hint: If the database "sruthi_apartment_db" does not exist yet, run: npm run init-db');
    return false;
  }
}

module.exports = {
  pool,
  query: (sql, params) => pool.query(sql, params),
  testConnection
};


const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

require('dotenv').config({
    path: path.join(__dirname, '.env')
});

async function initDatabase() {
    console.log('==============================================');
    console.log('Sruthi Apartment Database Initializer');
    console.log('==============================================');

    // Database configuration
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '****';
    const port = Number(process.env.DB_PORT || 3306);
    const dbName = process.env.DB_NAME || 'sruthi_apartment_db';

    console.log(`Connecting to ${host}:${port}...`);

    let connection;

    try {
        connection = await mysql.createConnection({
            host: host,
            user: user,
            password: password,
            port: port,
            multipleStatements: true
        });

        console.log('MySQL connected successfully!');

        await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${dbName}\`
            CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );

        await connection.query(`USE \`${dbName}\``);

        const sqlPath = path.join(__dirname, 'database.sql');

        if (!fs.existsSync(sqlPath)) {
            throw new Error('database.sql file not found!');
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');

        await connection.query(sql);

        console.log('Database created successfully!');
        console.log('Database Name:', dbName);
        console.log('Admin Email: admin@sruthi.com');
        console.log('Admin Password: admin123');

    } catch (error) {
        console.error('DATABASE ERROR:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initDatabase();

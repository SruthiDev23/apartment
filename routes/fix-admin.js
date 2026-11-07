
require('dotenv').config({
    path: require('path').join(__dirname, '..', '.env')
});

const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function fixAdmin() {
    try {
        const email = 'admin@sruthi.com';
        const password = 'admin123';

        const hash = await bcrypt.hash(password, 10);

        const [users] = await db.query(
            'SELECT user_id FROM Admin_users WHERE email = ?',
            [email]
        );

        if (users.length > 0) {
            await db.query(
                'UPDATE Admin_users SET password = ? WHERE email = ?',
                [hash, email]
            );
            console.log('Admin password updated!');
        } else {
            await db.query(
                `INSERT INTO Admin_users
                (username, email, password, full_name, role)
                VALUES (?, ?, ?, ?, ?)`,
                ['admin', email, hash, 'Sruthi Administrator', 'Super Admin']
            );
            console.log('Admin account created!');
        }

        const [rows] = await db.query(
            'SELECT password FROM Admin_users WHERE email = ?',
            [email]
        );

        const verified = await bcrypt.compare(password, rows[0].password);

        console.log('Password verification:', verified ? 'SUCCESS' : 'FAILED');
        console.log('Email:', email);
        console.log('Password:', password);

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        if (typeof db.end === 'function') {
            await db.end();
        } else if (db.pool && typeof db.pool.end === 'function') {
            await db.pool.end();
        }
    }
}

fixAdmin();

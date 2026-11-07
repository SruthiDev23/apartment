const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/staff - Get all staff members with optional search & specialization filter
router.get('/', async (req, res) => {
  try {
    const { search, specialization } = req.query;
    let sql = `
      SELECT 
        s.staff_id,
        s.name,
        s.phone,
        s.specialization,
        s.email,
        COUNT(rq.request_id) AS total_assigned_requests,
        SUM(CASE WHEN rq.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_requests,
        SUM(CASE WHEN rq.status = 'Completed' THEN 1 ELSE 0 END) AS completed_requests
      FROM Maintenance_staff s
      LEFT JOIN Requests rq ON s.staff_id = rq.staff_id
    `;
    const params = [];
    const conditions = [];

    if (search && search.trim() !== '') {
      conditions.push('(s.name LIKE ? OR s.phone LIKE ? OR s.email LIKE ? OR s.specialization LIKE ?)');
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (specialization && specialization !== 'All' && specialization.trim() !== '') {
      conditions.push('s.specialization = ?');
      params.push(specialization.trim());
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY s.staff_id ORDER BY s.staff_id ASC';

    const [staffList] = await db.query(sql, params);

    return res.json({
      success: true,
      count: staffList.length,
      data: staffList
    });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve maintenance staff.',
      error: error.message
    });
  }
});

// GET /api/staff/:id - Single staff member with their assigned requests
router.get('/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    const [staff] = await db.query(
      'SELECT * FROM Maintenance_staff WHERE staff_id = ?',
      [staffId]
    );

    if (staff.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff member with ID ${staffId} not found.`
      });
    }

    const staffMember = staff[0];

    // Fetch assigned requests
    const [requests] = await db.query(`
      SELECT 
        rq.request_id,
        rq.issues_type,
        rq.description,
        rq.request_date,
        rq.status,
        r.name AS resident_name,
        r.flat_no
      FROM Requests rq
      JOIN Residents r ON rq.resident_id = r.resident_id
      WHERE rq.staff_id = ?
      ORDER BY rq.request_date DESC
    `, [staffId]);

    staffMember.assigned_requests = requests;

    return res.json({
      success: true,
      data: staffMember
    });
  } catch (error) {
    console.error('Error fetching staff member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff member.',
      error: error.message
    });
  }
});

// POST /api/staff - Add a new staff member
router.post('/', async (req, res) => {
  try {
    const { name, phone, specialization, email } = req.body;

    if (!name || !phone || !specialization || !email) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, phone, specialization, email) are required.'
      });
    }

    const [existing] = await db.query(
      'SELECT staff_id FROM Maintenance_staff WHERE email = ?',
      [email.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A staff member with this email address already exists.'
      });
    }

    const [result] = await db.query(
      'INSERT INTO Maintenance_staff (name, phone, specialization, email) VALUES (?, ?, ?, ?)',
      [name.trim(), phone.trim(), specialization.trim(), email.trim()]
    );

    return res.status(201).json({
      success: true,
      message: 'Staff member added successfully!',
      data: {
        staff_id: result.insertId,
        name: name.trim(),
        phone: phone.trim(),
        specialization: specialization.trim(),
        email: email.trim()
      }
    });
  } catch (error) {
    console.error('Error adding staff member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add staff member.',
      error: error.message
    });
  }
});

// PUT /api/staff/:id - Update staff details
router.put('/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    const { name, phone, specialization, email } = req.body;

    if (!name || !phone || !specialization || !email) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, phone, specialization, email) are required.'
      });
    }

    const [exists] = await db.query(
      'SELECT staff_id FROM Maintenance_staff WHERE staff_id = ?',
      [staffId]
    );

    if (exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff member with ID ${staffId} not found.`
      });
    }

    await db.query(
      'UPDATE Maintenance_staff SET name = ?, phone = ?, specialization = ?, email = ? WHERE staff_id = ?',
      [name.trim(), phone.trim(), specialization.trim(), email.trim(), staffId]
    );

    return res.json({
      success: true,
      message: 'Staff member updated successfully!',
      data: {
        staff_id: parseInt(staffId, 10),
        name: name.trim(),
        phone: phone.trim(),
        specialization: specialization.trim(),
        email: email.trim()
      }
    });
  } catch (error) {
    console.error('Error updating staff member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update staff member.',
      error: error.message
    });
  }
});

// DELETE /api/staff/:id - Delete a staff member
router.delete('/:id', async (req, res) => {
  try {
    const staffId = req.params.id;

    const [exists] = await db.query(
      'SELECT name FROM Maintenance_staff WHERE staff_id = ?',
      [staffId]
    );

    if (exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff member with ID ${staffId} not found.`
      });
    }

    const staffName = exists[0].name;

    await db.query('DELETE FROM Maintenance_staff WHERE staff_id = ?', [staffId]);

    return res.json({
      success: true,
      message: `Staff member "${staffName}" deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting staff member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete staff member.',
      error: error.message
    });
  }
});

module.exports = router;

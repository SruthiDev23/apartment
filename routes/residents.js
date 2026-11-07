const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/residents - List all residents with optional search
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT 
        r.resident_id,
        r.name,
        r.flat_no,
        r.phone,
        r.email,
        COUNT(rq.request_id) AS total_requests
      FROM Residents r
      LEFT JOIN Requests rq ON r.resident_id = rq.resident_id
    `;
    const params = [];

    if (search && search.trim() !== '') {
      sql += ` WHERE (r.name LIKE ? OR r.flat_no LIKE ? OR r.phone LIKE ? OR r.email LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    sql += ` GROUP BY r.resident_id ORDER BY r.resident_id DESC`;

    const [residents] = await db.query(sql, params);

    return res.json({
      success: true,
      count: residents.length,
      data: residents
    });
  } catch (error) {
    console.error('Error fetching residents:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve residents.',
      error: error.message
    });
  }
});

// GET /api/residents/:id - Get single resident with their maintenance requests
router.get('/:id', async (req, res) => {
  try {
    const residentId = req.params.id;
    const [residents] = await db.query(
      'SELECT * FROM Residents WHERE resident_id = ?',
      [residentId]
    );

    if (residents.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resident with ID ${residentId} not found.`
      });
    }

    const resident = residents[0];

    // Fetch maintenance requests raised by this resident
    const [requests] = await db.query(`
      SELECT 
        rq.request_id,
        rq.issues_type,
        rq.description,
        rq.request_date,
        rq.status,
        ms.name AS staff_name,
        ms.specialization
      FROM Requests rq
      LEFT JOIN Maintenance_staff ms ON rq.staff_id = ms.staff_id
      WHERE rq.resident_id = ?
      ORDER BY rq.request_date DESC
    `, [residentId]);

    resident.requests = requests;

    return res.json({
      success: true,
      data: resident
    });
  } catch (error) {
    console.error('Error fetching resident detail:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve resident details.',
      error: error.message
    });
  }
});

// POST /api/residents - Add a new resident
router.post('/', async (req, res) => {
  try {
    const { name, flat_no, phone, email } = req.body;

    // Input Validation
    if (!name || !flat_no || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, flat_no, phone, email) are required.'
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long.'
      });
    }

    // Check if flat already assigned or email duplicate (optional warning or constraint)
    const [existing] = await db.query(
      'SELECT resident_id FROM Residents WHERE email = ? OR (flat_no = ? AND name = ?)',
      [email.trim(), flat_no.trim(), name.trim()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A resident with this email or flat number and name already exists.'
      });
    }

    const [result] = await db.query(
      'INSERT INTO Residents (name, flat_no, phone, email) VALUES (?, ?, ?, ?)',
      [name.trim(), flat_no.trim().toUpperCase(), phone.trim(), email.trim()]
    );

    const newId = result.insertId;

    return res.status(201).json({
      success: true,
      message: 'Resident added successfully!',
      data: {
        resident_id: newId,
        name: name.trim(),
        flat_no: flat_no.trim().toUpperCase(),
        phone: phone.trim(),
        email: email.trim()
      }
    });
  } catch (error) {
    console.error('Error creating resident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create resident.',
      error: error.message
    });
  }
});

// PUT /api/residents/:id - Update resident details
router.put('/:id', async (req, res) => {
  try {
    const residentId = req.params.id;
    const { name, flat_no, phone, email } = req.body;

    if (!name || !flat_no || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'All fields (name, flat_no, phone, email) are required.'
      });
    }

    // Check if exists
    const [exists] = await db.query(
      'SELECT resident_id FROM Residents WHERE resident_id = ?',
      [residentId]
    );

    if (exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resident with ID ${residentId} not found.`
      });
    }

    await db.query(
      'UPDATE Residents SET name = ?, flat_no = ?, phone = ?, email = ? WHERE resident_id = ?',
      [name.trim(), flat_no.trim().toUpperCase(), phone.trim(), email.trim(), residentId]
    );

    return res.json({
      success: true,
      message: 'Resident updated successfully!',
      data: {
        resident_id: parseInt(residentId, 10),
        name: name.trim(),
        flat_no: flat_no.trim().toUpperCase(),
        phone: phone.trim(),
        email: email.trim()
      }
    });
  } catch (error) {
    console.error('Error updating resident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update resident.',
      error: error.message
    });
  }
});

// DELETE /api/residents/:id - Delete a resident
router.delete('/:id', async (req, res) => {
  try {
    const residentId = req.params.id;

    // Check existence
    const [exists] = await db.query(
      'SELECT name, flat_no FROM Residents WHERE resident_id = ?',
      [residentId]
    );

    if (exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Resident with ID ${residentId} not found.`
      });
    }

    const residentName = exists[0].name;

    await db.query('DELETE FROM Residents WHERE resident_id = ?', [residentId]);

    return res.json({
      success: true,
      message: `Resident "${residentName}" and linked records removed successfully.`
    });
  } catch (error) {
    console.error('Error deleting resident:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete resident.',
      error: error.message
    });
  }
});

module.exports = router;

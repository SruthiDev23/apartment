const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/records/stats/summary - Summary KPI metrics for maintenance records
router.get('/stats/summary', async (req, res) => {
  try {
    const [summary] = await db.query(`
      SELECT 
        COUNT(record_id) AS total_records,
        COALESCE(SUM(repair_cost), 0) AS total_repair_costs,
        COALESCE(AVG(repair_cost), 0) AS avg_repair_cost,
        COALESCE(MAX(repair_cost), 0) AS max_repair_cost,
        COALESCE(MIN(repair_cost), 0) AS min_repair_cost
      FROM Maintenance_record
    `);

    return res.json({
      success: true,
      data: summary[0]
    });
  } catch (error) {
    console.error('Error fetching records summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve repair statistics.',
      error: error.message
    });
  }
});

// GET /api/records - Get all maintenance records with request, resident and staff details
router.get('/', async (req, res) => {
  try {
    const { search, request_id } = req.query;

    let sql = `
      SELECT 
        mr.record_id,
        mr.request_id,
        mr.work_description,
        DATE_FORMAT(mr.completion_date, '%Y-%m-%d') AS completion_date,
        mr.repair_cost,
        mr.remarks,
        rq.issues_type,
        rq.status AS request_status,
        DATE_FORMAT(rq.request_date, '%Y-%m-%d %H:%i') AS request_date,
        r.name AS resident_name,
        r.flat_no,
        ms.name AS staff_name,
        ms.specialization AS staff_specialization
      FROM Maintenance_record mr
      JOIN Requests rq ON mr.request_id = rq.request_id
      JOIN Residents r ON rq.resident_id = r.resident_id
      LEFT JOIN Maintenance_staff ms ON rq.staff_id = ms.staff_id
    `;

    const params = [];
    const conditions = [];

    if (search && search.trim() !== '') {
      conditions.push(`(
        mr.work_description LIKE ? OR 
        mr.remarks LIKE ? OR 
        r.name LIKE ? OR 
        r.flat_no LIKE ? OR 
        rq.issues_type LIKE ? OR 
        ms.name LIKE ? OR
        mr.record_id = ? OR
        mr.request_id = ?
      )`);
      const term = `%${search.trim()}%`;
      const idVal = isNaN(search.trim()) ? -1 : parseInt(search.trim(), 10);
      params.push(term, term, term, term, term, term, idVal, idVal);
    }

    if (request_id && !isNaN(request_id)) {
      conditions.push('mr.request_id = ?');
      params.push(parseInt(request_id, 10));
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY mr.completion_date DESC, mr.record_id DESC';

    const [records] = await db.query(sql, params);

    // Compute dynamic aggregate
    let totalCost = 0;
    records.forEach(r => {
      totalCost += parseFloat(r.repair_cost || 0);
    });

    return res.json({
      success: true,
      count: records.length,
      total_cost: totalCost.toFixed(2),
      data: records
    });
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve maintenance records.',
      error: error.message
    });
  }
});

// GET /api/records/:id - Get single record
router.get('/:id', async (req, res) => {
  try {
    const recordId = req.params.id;

    const [records] = await db.query(`
      SELECT 
        mr.record_id,
        mr.request_id,
        mr.work_description,
        DATE_FORMAT(mr.completion_date, '%Y-%m-%d') AS completion_date,
        mr.repair_cost,
        mr.remarks,
        rq.issues_type,
        rq.description AS original_request_description,
        rq.status AS request_status,
        r.name AS resident_name,
        r.flat_no,
        ms.name AS staff_name
      FROM Maintenance_record mr
      JOIN Requests rq ON mr.request_id = rq.request_id
      JOIN Residents r ON rq.resident_id = r.resident_id
      LEFT JOIN Maintenance_staff ms ON rq.staff_id = ms.staff_id
      WHERE mr.record_id = ?
    `, [recordId]);

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Maintenance record #${recordId} not found.`
      });
    }

    return res.json({
      success: true,
      data: records[0]
    });
  } catch (error) {
    console.error('Error fetching record detail:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve maintenance record.',
      error: error.message
    });
  }
});

// POST /api/records - Add a new maintenance record
router.post('/', async (req, res) => {
  try {
    const { request_id, work_description, completion_date, repair_cost, remarks, mark_request_completed } = req.body;

    if (!request_id || !work_description || !completion_date) {
      return res.status(400).json({
        success: false,
        message: 'Request ID, Work Description, and Completion Date are required.'
      });
    }

    // Verify request exists
    const [requestCheck] = await db.query('SELECT request_id, status FROM Requests WHERE request_id = ?', [request_id]);
    if (requestCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Linked Request #${request_id} does not exist.`
      });
    }

    const costNum = repair_cost !== undefined && repair_cost !== '' ? parseFloat(repair_cost) : 0.00;
    if (isNaN(costNum) || costNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Repair cost must be a valid positive number.'
      });
    }

    const [result] = await db.query(
      'INSERT INTO Maintenance_record (request_id, work_description, completion_date, repair_cost, remarks) VALUES (?, ?, ?, ?, ?)',
      [request_id, work_description.trim(), completion_date, costNum, remarks ? remarks.trim() : null]
    );

    const newId = result.insertId;

    // If requested or default to completed, update the parent request status to 'Completed'
    if (mark_request_completed === true || mark_request_completed === 'true' || mark_request_completed === undefined) {
      await db.query('UPDATE Requests SET status = "Completed" WHERE request_id = ?', [request_id]);
    }

    return res.status(201).json({
      success: true,
      message: 'Maintenance record created successfully!',
      data: {
        record_id: newId,
        request_id: parseInt(request_id, 10),
        work_description: work_description.trim(),
        completion_date,
        repair_cost: costNum,
        remarks: remarks ? remarks.trim() : null
      }
    });
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create maintenance record.',
      error: error.message
    });
  }
});

// PUT /api/records/:id - Update repair record details
router.put('/:id', async (req, res) => {
  try {
    const recordId = req.params.id;
    const { request_id, work_description, completion_date, repair_cost, remarks } = req.body;

    if (!request_id || !work_description || !completion_date) {
      return res.status(400).json({
        success: false,
        message: 'Request ID, Work Description, and Completion Date are required.'
      });
    }

    const [exists] = await db.query('SELECT record_id FROM Maintenance_record WHERE record_id = ?', [recordId]);
    if (exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Maintenance record #${recordId} not found.`
      });
    }

    // Verify request exists
    const [requestCheck] = await db.query('SELECT request_id FROM Requests WHERE request_id = ?', [request_id]);
    if (requestCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Linked Request #${request_id} does not exist.`
      });
    }

    const costNum = repair_cost !== undefined && repair_cost !== '' ? parseFloat(repair_cost) : 0.00;
    if (isNaN(costNum) || costNum < 0) {
      return res.status(400).json({
        success: false,
        message: 'Repair cost must be a valid positive number.'
      });
    }

    await db.query(
      'UPDATE Maintenance_record SET request_id = ?, work_description = ?, completion_date = ?, repair_cost = ?, remarks = ? WHERE record_id = ?',
      [request_id, work_description.trim(), completion_date, costNum, remarks ? remarks.trim() : null, recordId]
    );

    return res.json({
      success: true,
      message: 'Maintenance record updated successfully!',
      data: {
        record_id: parseInt(recordId, 10),
        request_id: parseInt(request_id, 10),
        work_description: work_description.trim(),
        completion_date,
        repair_cost: costNum,
        remarks: remarks ? remarks.trim() : null
      }
    });
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update maintenance record.',
      error: error.message
    });
  }
});

// DELETE /api/records/:id - Delete repair record
router.delete('/:id', async (req, res) => {
  try {
    const recordId = req.params.id;

    const [exists] = await db.query('SELECT record_id FROM Maintenance_record WHERE record_id = ?', [recordId]);
    if (exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Maintenance record #${recordId} not found.`
      });
    }

    await db.query('DELETE FROM Maintenance_record WHERE record_id = ?', [recordId]);

    return res.json({
      success: true,
      message: `Maintenance record #${recordId} deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete maintenance record.',
      error: error.message
    });
  }
});

module.exports = router;

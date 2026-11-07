const express = require('express');
const router = express.Router();
const db = require('../config/db');

const VALID_STATUSES = ['Pending', 'Assigned', 'In Progress', 'Completed', 'Rejected'];
const VALID_ISSUE_TYPES = [
  'Plumbing',
  'Electrical',
  'Cleaning',
  'Painting',
  'Lift Maintenance',
  'Water Supply',
  'Other'
];

// GET /api/requests - Get all maintenance requests with rich joins and filters
router.get('/', async (req, res) => {
  try {
    const { search, status, issues_type, issue_type } = req.query;
    const selectedType = issues_type || issue_type;

    let sql = `
      SELECT 
        rq.request_id,
        rq.resident_id,
        r.name AS resident_name,
        r.flat_no,
        r.phone AS resident_phone,
        r.email AS resident_email,
        rq.staff_id,
        ms.name AS staff_name,
        ms.specialization AS staff_specialization,
        ms.phone AS staff_phone,
        rq.issues_type,
        rq.description,
        DATE_FORMAT(rq.request_date, '%Y-%m-%d %H:%i:%s') AS request_date,
        rq.status,
        (SELECT COUNT(record_id) FROM Maintenance_record mr WHERE mr.request_id = rq.request_id) AS record_count,
        (SELECT COALESCE(SUM(repair_cost), 0) FROM Maintenance_record mr WHERE mr.request_id = rq.request_id) AS total_cost
      FROM Requests rq
      JOIN Residents r ON rq.resident_id = r.resident_id
      LEFT JOIN Maintenance_staff ms ON rq.staff_id = ms.staff_id
    `;

    const params = [];
    const conditions = [];

    if (search && search.trim() !== '') {
      conditions.push(`(
        r.name LIKE ? OR 
        r.flat_no LIKE ? OR 
        rq.description LIKE ? OR 
        ms.name LIKE ? OR 
        rq.issues_type LIKE ? OR
        rq.request_id = ?
      )`);
      const term = `%${search.trim()}%`;
      const idVal = isNaN(search.trim()) ? -1 : parseInt(search.trim(), 10);
      params.push(term, term, term, term, term, idVal);
    }

    if (status && status !== 'All' && status.trim() !== '') {
      conditions.push('rq.status = ?');
      params.push(status.trim());
    }

    if (selectedType && selectedType !== 'All' && selectedType.trim() !== '') {
      conditions.push('rq.issues_type = ?');
      params.push(selectedType.trim());
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY rq.request_id DESC';

    const [requests] = await db.query(sql, params);

    return res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve maintenance requests.',
      error: error.message
    });
  }
});

// GET /api/requests/:id - Single request with detailed resident, staff and repair records
router.get('/:id', async (req, res) => {
  try {
    const requestId = req.params.id;

    const [requests] = await db.query(`
      SELECT 
        rq.request_id,
        rq.resident_id,
        r.name AS resident_name,
        r.flat_no,
        r.phone AS resident_phone,
        r.email AS resident_email,
        rq.staff_id,
        ms.name AS staff_name,
        ms.phone AS staff_phone,
        ms.specialization AS staff_specialization,
        ms.email AS staff_email,
        rq.issues_type,
        rq.description,
        DATE_FORMAT(rq.request_date, '%Y-%m-%d %H:%i:%s') AS request_date,
        rq.status
      FROM Requests rq
      JOIN Residents r ON rq.resident_id = r.resident_id
      LEFT JOIN Maintenance_staff ms ON rq.staff_id = ms.staff_id
      WHERE rq.request_id = ?
    `, [requestId]);

    if (requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Request with ID ${requestId} not found.`
      });
    }

    const request = requests[0];

    // Fetch linked maintenance records
    const [records] = await db.query(`
      SELECT 
        record_id,
        work_description,
        DATE_FORMAT(completion_date, '%Y-%m-%d') AS completion_date,
        repair_cost,
        remarks
      FROM Maintenance_record
      WHERE request_id = ?
      ORDER BY completion_date DESC, record_id DESC
    `, [requestId]);

    request.records = records;

    return res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve request details.',
      error: error.message
    });
  }
});

// POST /api/requests - Submit a new maintenance request
router.post('/', async (req, res) => {
  try {
    const { resident_id, issues_type, issue_type, description, staff_id, status } = req.body;
    const finalIssueType = issues_type || issue_type;

    if (!resident_id || !finalIssueType || !description) {
      return res.status(400).json({
        success: false,
        message: 'Resident, Issue Type, and Description are required.'
      });
    }

    if (!VALID_ISSUE_TYPES.includes(finalIssueType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid issue type. Must be one of: ${VALID_ISSUE_TYPES.join(', ')}`
      });
    }

    // Verify resident exists
    const [resident] = await db.query('SELECT resident_id FROM Residents WHERE resident_id = ?', [resident_id]);
    if (resident.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Selected resident does not exist.'
      });
    }

    // Determine initial status
    let initialStatus = status && VALID_STATUSES.includes(status) ? status : 'Pending';
    const assignedStaffId = staff_id && staff_id !== '' && parseInt(staff_id, 10) > 0 ? parseInt(staff_id, 10) : null;

    if (assignedStaffId && initialStatus === 'Pending') {
      initialStatus = 'Assigned';
    }

    const [result] = await db.query(
      'INSERT INTO Requests (resident_id, staff_id, issues_type, description, status) VALUES (?, ?, ?, ?, ?)',
      [resident_id, assignedStaffId, finalIssueType, description.trim(), initialStatus]
    );

    const newId = result.insertId;

    return res.status(201).json({
      success: true,
      message: 'Maintenance request submitted successfully!',
      data: {
        request_id: newId,
        resident_id,
        staff_id: assignedStaffId,
        issues_type: finalIssueType,
        description: description.trim(),
        status: initialStatus
      }
    });
  } catch (error) {
    console.error('Error creating request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit maintenance request.',
      error: error.message
    });
  }
});

// PUT /api/requests/:id - Update request details
router.put('/:id', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { resident_id, staff_id, issues_type, issue_type, description, status } = req.body;
    const finalIssueType = issues_type || issue_type;

    const [exists] = await db.query('SELECT request_id FROM Requests WHERE request_id = ?', [requestId]);
    if (exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Request with ID ${requestId} not found.`
      });
    }

    const assignedStaffId = staff_id && staff_id !== '' && parseInt(staff_id, 10) > 0 ? parseInt(staff_id, 10) : null;
    let finalStatus = status;

    if (finalStatus && !VALID_STATUSES.includes(finalStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    await db.query(
      'UPDATE Requests SET resident_id = ?, staff_id = ?, issues_type = ?, description = ?, status = ? WHERE request_id = ?',
      [resident_id, assignedStaffId, finalIssueType, description.trim(), finalStatus, requestId]
    );

    return res.json({
      success: true,
      message: 'Maintenance request updated successfully!',
      data: {
        request_id: parseInt(requestId, 10),
        resident_id,
        staff_id: assignedStaffId,
        issues_type: finalIssueType,
        description: description.trim(),
        status: finalStatus
      }
    });
  } catch (error) {
    console.error('Error updating request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update maintenance request.',
      error: error.message
    });
  }
});

// PUT /api/requests/:id/assign - Assign maintenance staff
router.put('/:id/assign', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { staff_id } = req.body;

    const [requestCheck] = await db.query('SELECT status, staff_id FROM Requests WHERE request_id = ?', [requestId]);
    if (requestCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Request with ID ${requestId} not found.`
      });
    }

    const staffIdInt = staff_id && staff_id !== '' ? parseInt(staff_id, 10) : null;

    if (staffIdInt) {
      const [staffCheck] = await db.query('SELECT name, specialization FROM Maintenance_staff WHERE staff_id = ?', [staffIdInt]);
      if (staffCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Selected maintenance staff does not exist.'
        });
      }
    }

    // If current status was Pending and now assigned, move status to Assigned
    let newStatus = requestCheck[0].status;
    if (staffIdInt && newStatus === 'Pending') {
      newStatus = 'Assigned';
    } else if (!staffIdInt && newStatus === 'Assigned') {
      newStatus = 'Pending';
    }

    await db.query(
      'UPDATE Requests SET staff_id = ?, status = ? WHERE request_id = ?',
      [staffIdInt, newStatus, requestId]
    );

    return res.json({
      success: true,
      message: staffIdInt ? 'Staff assigned successfully!' : 'Staff unassigned from request.',
      data: {
        request_id: parseInt(requestId, 10),
        staff_id: staffIdInt,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('Error assigning staff to request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign staff.',
      error: error.message
    });
  }
});

// PUT /api/requests/:id/status - Update request status
router.put('/:id/status', async (req, res) => {
  try {
    const requestId = req.params.id;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const [exists] = await db.query('SELECT request_id FROM Requests WHERE request_id = ?', [requestId]);
    if (exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Request with ID ${requestId} not found.`
      });
    }

    await db.query('UPDATE Requests SET status = ? WHERE request_id = ?', [status, requestId]);

    return res.json({
      success: true,
      message: `Request status updated to "${status}".`,
      data: {
        request_id: parseInt(requestId, 10),
        status
      }
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update request status.',
      error: error.message
    });
  }
});

// DELETE /api/requests/:id - Delete request
router.delete('/:id', async (req, res) => {
  try {
    const requestId = req.params.id;

    const [exists] = await db.query('SELECT request_id FROM Requests WHERE request_id = ?', [requestId]);
    if (exists.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Request with ID ${requestId} not found.`
      });
    }

    await db.query('DELETE FROM Requests WHERE request_id = ?', [requestId]);

    return res.json({
      success: true,
      message: `Request #${requestId} and its associated maintenance records were deleted.`
    });
  } catch (error) {
    console.error('Error deleting request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete request.',
      error: error.message
    });
  }
});

module.exports = router;

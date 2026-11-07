const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/reports - Comprehensive reporting metrics
router.get('/', async (req, res) => {
  try {
    // 1. Summary Metrics
    const [summaryRows] = await db.query(`
      SELECT 
        COUNT(*) AS total_requests,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_requests,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_requests,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_requests,
        SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END) AS assigned_requests,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_requests
      FROM Requests
    `);

    const [[repairCostSummary]] = await db.query(`
      SELECT 
        COUNT(record_id) AS total_repair_records,
        COALESCE(SUM(repair_cost), 0) AS total_expense,
        COALESCE(AVG(repair_cost), 0) AS avg_repair_cost,
        COALESCE(MAX(repair_cost), 0) AS max_repair_cost,
        COALESCE(MIN(repair_cost), 0) AS min_repair_cost
      FROM Maintenance_record
    `);

    // 2. Staff-wise Assigned Requests
    const [staffStats] = await db.query(`
      SELECT 
        s.staff_id,
        s.name AS staff_name,
        s.specialization,
        COUNT(rq.request_id) AS assigned_count,
        SUM(CASE WHEN rq.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN rq.status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_count,
        SUM(CASE WHEN rq.status = 'Assigned' THEN 1 ELSE 0 END) AS pending_count
      FROM Maintenance_staff s
      LEFT JOIN Requests rq ON s.staff_id = rq.staff_id
      GROUP BY s.staff_id, s.name, s.specialization
      ORDER BY assigned_count DESC
    `);

    // 3. Category-wise Complaints & Costs
    const [categoryStats] = await db.query(`
      SELECT 
        rq.issues_type,
        COUNT(DISTINCT rq.request_id) AS total_complaints,
        SUM(CASE WHEN rq.status = 'Completed' THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN rq.status = 'Pending' THEN 1 ELSE 0 END) AS pending_count,
        COALESCE(SUM(mr.repair_cost), 0) AS total_category_cost
      FROM Requests rq
      LEFT JOIN Maintenance_record mr ON rq.request_id = mr.request_id
      GROUP BY rq.issues_type
      ORDER BY total_complaints DESC
    `);

    // 4. Monthly Maintenance Expenses
    const [monthlyExpenses] = await db.query(`
      SELECT 
        DATE_FORMAT(mr.completion_date, '%Y-%m') AS month_key,
        DATE_FORMAT(mr.completion_date, '%M %Y') AS month_label,
        COUNT(mr.record_id) AS repair_count,
        COALESCE(SUM(mr.repair_cost), 0) AS monthly_cost
      FROM Maintenance_record mr
      GROUP BY month_key, month_label
      ORDER BY month_key ASC
    `);

    // 5. Status Distribution Breakdown
    const [statusStats] = await db.query(`
      SELECT 
        status,
        COUNT(*) AS count
      FROM Requests
      GROUP BY status
      ORDER BY count DESC
    `);

    return res.json({
      success: true,
      data: {
        summary: {
          ...summaryRows[0],
          ...repairCostSummary
        },
        staff_stats: staffStats,
        category_stats: categoryStats,
        monthly_expenses: monthlyExpenses,
        status_stats: statusStats
      }
    });

  } catch (error) {
    console.error('Error fetching reports data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate maintenance reports.',
      error: error.message
    });
  }
});

// GET /api/reports/export/:type - Export data to CSV
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let filename = `sruthi_maintenance_${type}_${Date.now()}.csv`;
    let csvContent = '';

    if (type === 'requests') {
      const [rows] = await db.query(`
        SELECT 
          rq.request_id AS "Request ID",
          r.name AS "Resident Name",
          r.flat_no AS "Flat No",
          r.phone AS "Resident Phone",
          COALESCE(ms.name, 'Unassigned') AS "Assigned Staff",
          COALESCE(ms.specialization, 'N/A') AS "Specialization",
          rq.issues_type AS "Issue Type",
          REPLACE(REPLACE(rq.description, '\n', ' '), '\r', ' ') AS "Description",
          DATE_FORMAT(rq.request_date, '%Y-%m-%d %H:%i:%s') AS "Request Date",
          rq.status AS "Status"
        FROM Requests rq
        JOIN Residents r ON rq.resident_id = r.resident_id
        LEFT JOIN Maintenance_staff ms ON rq.staff_id = ms.staff_id
        ORDER BY rq.request_id DESC
      `);

      if (rows.length === 0) {
        csvContent = 'Request ID,Resident Name,Flat No,Resident Phone,Assigned Staff,Specialization,Issue Type,Description,Request Date,Status\n';
      } else {
        const headers = Object.keys(rows[0]).join(',');
        const lines = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        csvContent = [headers, ...lines].join('\n');
      }

    } else if (type === 'records') {
      const [rows] = await db.query(`
        SELECT 
          mr.record_id AS "Record ID",
          mr.request_id AS "Request ID",
          r.name AS "Resident",
          r.flat_no AS "Flat No",
          rq.issues_type AS "Issue Type",
          REPLACE(REPLACE(mr.work_description, '\n', ' '), '\r', ' ') AS "Work Description",
          DATE_FORMAT(mr.completion_date, '%Y-%m-%d') AS "Completion Date",
          mr.repair_cost AS "Repair Cost",
          COALESCE(REPLACE(REPLACE(mr.remarks, '\n', ' '), '\r', ' '), '') AS "Remarks",
          COALESCE(ms.name, 'Unassigned') AS "Technician"
        FROM Maintenance_record mr
        JOIN Requests rq ON mr.request_id = rq.request_id
        JOIN Residents r ON rq.resident_id = r.resident_id
        LEFT JOIN Maintenance_staff ms ON rq.staff_id = ms.staff_id
        ORDER BY mr.completion_date DESC, mr.record_id DESC
      `);

      if (rows.length === 0) {
        csvContent = 'Record ID,Request ID,Resident,Flat No,Issue Type,Work Description,Completion Date,Repair Cost,Remarks,Technician\n';
      } else {
        const headers = Object.keys(rows[0]).join(',');
        const lines = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        csvContent = [headers, ...lines].join('\n');
      }

    } else if (type === 'residents') {
      const [rows] = await db.query(`
        SELECT 
          r.resident_id AS "Resident ID",
          r.name AS "Full Name",
          r.flat_no AS "Flat Number",
          r.phone AS "Phone",
          r.email AS "Email Address",
          COUNT(rq.request_id) AS "Total Requests"
        FROM Residents r
        LEFT JOIN Requests rq ON r.resident_id = rq.resident_id
        GROUP BY r.resident_id
        ORDER BY r.resident_id ASC
      `);

      const headers = Object.keys(rows[0]).join(',');
      const lines = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      csvContent = [headers, ...lines].join('\n');

    } else if (type === 'staff') {
      const [rows] = await db.query(`
        SELECT 
          s.staff_id AS "Staff ID",
          s.name AS "Staff Name",
          s.phone AS "Phone",
          s.specialization AS "Specialization",
          s.email AS "Email",
          COUNT(rq.request_id) AS "Assigned Requests"
        FROM Maintenance_staff s
        LEFT JOIN Requests rq ON s.staff_id = rq.staff_id
        GROUP BY s.staff_id
        ORDER BY s.staff_id ASC
      `);

      const headers = Object.keys(rows[0]).join(',');
      const lines = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      csvContent = [headers, ...lines].join('\n');

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid report export type. Supported: requests, records, residents, staff.'
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);

  } catch (error) {
    console.error('Error generating CSV export:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export CSV report.',
      error: error.message
    });
  }
});

module.exports = router;

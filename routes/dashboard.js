const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/dashboard - Aggregate statistics and chart data
router.get('/', async (req, res) => {
  try {
    // 1. Total Residents
    const [[{ total_residents }]] = await db.query('SELECT COUNT(*) AS total_residents FROM Residents');

    // 2. Total Maintenance Staff
    const [[{ total_staff }]] = await db.query('SELECT COUNT(*) AS total_staff FROM Maintenance_staff');

    // 3. Requests Counts by Status
    const [statusRows] = await db.query(`
      SELECT 
        COUNT(*) AS total_requests,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending_requests,
        SUM(CASE WHEN status = 'Assigned' THEN 1 ELSE 0 END) AS assigned_requests,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress_requests,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_requests,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) AS rejected_requests
      FROM Requests
    `);

    const requestStats = statusRows[0];

    // 4. Total Repair Costs
    const [[{ total_repair_costs }]] = await db.query(
      'SELECT COALESCE(SUM(repair_cost), 0) AS total_repair_costs FROM Maintenance_record'
    );

    // 5. Category breakdown (for Request Categories Chart)
    const [categoryRows] = await db.query(`
      SELECT 
        issues_type,
        COUNT(*) AS count
      FROM Requests
      GROUP BY issues_type
      ORDER BY count DESC
    `);

    // 6. Monthly Overview (last 6 months requests count and repair costs)
    const [monthlyRows] = await db.query(`
      SELECT 
        DATE_FORMAT(request_date, '%b %Y') AS month_label,
        DATE_FORMAT(request_date, '%Y-%m') AS month_val,
        COUNT(*) AS total_requests,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed_requests
      FROM Requests
      GROUP BY month_val, month_label
      ORDER BY month_val ASC
      LIMIT 6
    `);

    // 7. Recent Maintenance Requests (latest 6 records)
    const [recentRequests] = await db.query(`
      SELECT 
        rq.request_id,
        r.name AS resident_name,
        r.flat_no,
        ms.name AS staff_name,
        rq.issues_type,
        rq.description,
        DATE_FORMAT(rq.request_date, '%Y-%m-%d %H:%i') AS request_date,
        rq.status
      FROM Requests rq
      JOIN Residents r ON rq.resident_id = r.resident_id
      LEFT JOIN Maintenance_staff ms ON rq.staff_id = ms.staff_id
      ORDER BY rq.request_id DESC
      LIMIT 6
    `);

    return res.json({
      success: true,
      data: {
        stats: {
          total_residents: Number(total_residents || 0),
          total_staff: Number(total_staff || 0),
          total_requests: Number(requestStats.total_requests || 0),
          pending_requests: Number(requestStats.pending_requests || 0),
          assigned_requests: Number(requestStats.assigned_requests || 0),
          in_progress_requests: Number(requestStats.in_progress_requests || 0),
          completed_requests: Number(requestStats.completed_requests || 0),
          rejected_requests: Number(requestStats.rejected_requests || 0),
          total_repair_costs: parseFloat(total_repair_costs || 0).toFixed(2)
        },
        categories: categoryRows,
        monthly_overview: monthlyRows,
        recent_requests: recentRequests
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard metrics.',
      error: error.message
    });
  }
});

module.exports = router;

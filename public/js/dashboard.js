/**
 * Sruthi Apartment Maintenance Request Management System
 * Dashboard Logic: Dynamic KPIs, Chart.js Visualizations & Recent Feed
 */

// Authentication check
checkAuth(true);

let overviewChartInstance = null;
let categoriesChartInstance = null;

// Fetch and populate dashboard data
async function fetchDashboardData() {
  try {
    const response = await apiRequest('/dashboard');
    if (!response.success) {
      throw new Error(response.message || 'Failed to fetch dashboard data');
    }

    const { stats, categories, monthly_overview, recent_requests } = response.data;

    // 1. Populate KPI counters
    document.getElementById('kpiTotalResidents').textContent = stats.total_residents.toLocaleString();
    document.getElementById('kpiTotalStaff').textContent = stats.total_staff.toLocaleString();
    document.getElementById('kpiTotalRequests').textContent = stats.total_requests.toLocaleString();
    document.getElementById('kpiPendingRequests').textContent = stats.pending_requests.toLocaleString();
    document.getElementById('kpiInProgressRequests').textContent = stats.in_progress_requests.toLocaleString();
    document.getElementById('kpiCompletedRequests').textContent = stats.completed_requests.toLocaleString();
    document.getElementById('kpiTotalRepairCosts').textContent = formatCurrency(stats.total_repair_costs);

    // Update pending badge in sidebar
    const pendingBadge = document.getElementById('sidebarPendingBadge');
    if (pendingBadge) {
      pendingBadge.textContent = `${stats.pending_requests} Pending`;
      pendingBadge.style.backgroundColor = stats.pending_requests > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.08)';
      pendingBadge.style.color = stats.pending_requests > 0 ? '#fbbf24' : '#94a3b8';
    }

    // 2. Render Overview Chart (Monthly trends)
    renderOverviewChart(monthly_overview);

    // 3. Render Categories Chart (Doughnut)
    renderCategoriesChart(categories);

    // 4. Render Recent Requests Table
    renderRecentRequestsTable(recent_requests);

  } catch (error) {
    console.error('Error loading dashboard:', error);
    showToast('Dashboard Sync Error', 'Could not load data from database. Check server and MySQL.', 'error');
  }
}

// Render Overview Chart using Chart.js
function renderOverviewChart(monthlyData = []) {
  const ctx = document.getElementById('overviewChart');
  if (!ctx) return;

  const labels = monthlyData.map(d => d.month_label);
  const totalCounts = monthlyData.map(d => d.total_requests);
  const completedCounts = monthlyData.map(d => d.completed_requests);

  if (overviewChartInstance) {
    overviewChartInstance.destroy();
  }

  overviewChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['Current Month'],
      datasets: [
        {
          label: 'Total Requests Raised',
          data: totalCounts.length ? totalCounts : [0],
          backgroundColor: '#0f172a',
          borderRadius: 6,
          barPercentage: 0.6
        },
        {
          label: 'Completed & Resolved',
          data: completedCounts.length ? completedCounts : [0],
          backgroundColor: '#0d9488',
          borderRadius: 6,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 14,
            usePointStyle: true,
            font: { family: 'Inter', size: 12 }
          }
        },
        tooltip: {
          padding: 12,
          boxPadding: 6,
          titleFont: { family: 'Inter', size: 13, weight: '700' },
          bodyFont: { family: 'Inter', size: 12 }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 } }
        },
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: { family: 'Inter', size: 11 }
          },
          grid: { color: '#f1f5f9' }
        }
      }
    }
  });
}

// Render Categories Chart using Chart.js
function renderCategoriesChart(categoryData = []) {
  const ctx = document.getElementById('categoriesChart');
  if (!ctx) return;

  const labels = categoryData.map(c => c.issues_type);
  const counts = categoryData.map(c => c.count);

  const colors = [
    '#0d9488', // Teal
    '#0f172a', // Navy
    '#f59e0b', // Amber
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#10b981', // Emerald
    '#64748b'  // Slate / Other
  ];

  if (categoriesChartInstance) {
    categoriesChartInstance.destroy();
  }

  categoriesChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [{
        data: counts.length ? counts : [1],
        backgroundColor: colors.slice(0, Math.max(labels.length, 1)),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            usePointStyle: true,
            font: { family: 'Inter', size: 11, weight: '500' }
          }
        },
        tooltip: {
          padding: 10,
          titleFont: { family: 'Inter', size: 12, weight: 'bold' }
        }
      }
    }
  });
}

// Render Recent Requests Table
function renderRecentRequestsTable(requests = []) {
  const tbody = document.getElementById('recentRequestsTableBody');
  if (!tbody) return;

  if (requests.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div class="empty-icon"><i class="fa-regular fa-folder-open"></i></div>
          <div class="empty-title">No maintenance requests yet</div>
          <div class="empty-desc">New requests submitted by residents will appear here instantly.</div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = requests.map(req => {
    const staffBadge = req.staff_name 
      ? `<span class="badge-tag"><i class="fa-solid fa-user-check"></i> ${escapeHtml(req.staff_name)}</span>`
      : `<span style="color: #94a3b8; font-size: 0.82rem;"><i class="fa-regular fa-clock"></i> Unassigned</span>`;

    return `
      <tr>
        <td><strong>#REQ-${req.request_id}</strong></td>
        <td>
          <div style="font-weight: 600; color: var(--navy-900);">${escapeHtml(req.resident_name)}</div>
          <span style="font-size: 0.76rem; background: var(--bg-muted); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600;">
            Flat ${escapeHtml(req.flat_no)}
          </span>
        </td>
        <td>${getIssueBadge(req.issues_type)}</td>
        <td style="max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(req.description)}">
          ${escapeHtml(req.description)}
        </td>
        <td>${staffBadge}</td>
        <td>${formatDate(req.request_date, true)}</td>
        <td>${getStatusBadge(req.status)}</td>
        <td style="text-align: right;">
          <a href="/pages/requests.html?search=${req.request_id}" class="btn-icon view" title="View in Requests Management">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

// Initial load on page ready
document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardData();
});

/**
 * Sruthi Apartment Maintenance Request Management System
 * Reports & Analytics Logic: Chart.js Visualizations & CSV Exports
 */

checkAuth(true);

let monthlyExpensesChartInstance = null;
let staffRequestsChartInstance = null;
let categoryComplaintsChartInstance = null;
let statusDistributionChartInstance = null;

// Fetch and render report analytics
async function loadReports() {
  try {
    const response = await apiRequest('/reports');
    if (!response.success) throw new Error(response.message);

    const { summary, staff_stats, category_stats, monthly_expenses, status_stats } = response.data;

    // 1. Summary Cards
    const totalReq = summary.total_requests || 0;
    const completedReq = summary.completed_requests || 0;
    const pendingReq = summary.pending_requests || 0;
    const totalCost = summary.total_expense || summary.total_repair_costs || 0;
    const rate = totalReq > 0 ? ((completedReq / totalReq) * 100).toFixed(1) : 0;

    document.getElementById('repTotalRequests').textContent = totalReq.toLocaleString();
    document.getElementById('repCompletedRequests').textContent = completedReq.toLocaleString();
    document.getElementById('repPendingRequests').textContent = pendingReq.toLocaleString();
    document.getElementById('repTotalCost').textContent = formatCurrency(totalCost);
    document.getElementById('repCompletionRate').innerHTML = `<i class="fa-solid fa-check"></i> ${rate}% Resolution Rate`;

    // 2. Render Charts
    renderMonthlyExpensesChart(monthly_expenses);
    renderStaffRequestsChart(staff_stats);
    renderCategoryComplaintsChart(category_stats);
    renderStatusDistributionChart(status_stats);

    // 3. Render Breakdown Tables
    renderStaffStatsTable(staff_stats);
    renderCategoryStatsTable(category_stats);

  } catch (error) {
    console.error('Error loading reports:', error);
    showToast('Failed to Load', 'Could not generate maintenance analytics.', 'error');
  }
}

// Chart 1: Monthly Maintenance Expenses
function renderMonthlyExpensesChart(data = []) {
  const ctx = document.getElementById('monthlyExpensesChart');
  if (!ctx) return;

  const labels = data.map(d => d.month_label);
  const costs = data.map(d => parseFloat(d.monthly_cost || 0));

  if (monthlyExpensesChartInstance) monthlyExpensesChartInstance.destroy();

  monthlyExpensesChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['Current Period'],
      datasets: [{
        label: 'Repair Expenditure (₹)',
        data: costs.length ? costs : [0],
        backgroundColor: '#0d9488',
        borderRadius: 6,
        barPercentage: 0.55
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `Cost: ₹${ctx.parsed.y.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (val) => '₹' + val.toLocaleString('en-IN')
          },
          grid: { color: '#f1f5f9' }
        }
      }
    }
  });
}

// Chart 2: Staff-wise Assigned Requests (Horizontal Bar)
function renderStaffRequestsChart(data = []) {
  const ctx = document.getElementById('staffRequestsChart');
  if (!ctx) return;

  const labels = data.map(s => s.staff_name);
  const assigned = data.map(s => s.assigned_count);
  const completed = data.map(s => s.completed_count);

  if (staffRequestsChartInstance) staffRequestsChartInstance.destroy();

  staffRequestsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['No Staff'],
      datasets: [
        {
          label: 'Total Assigned',
          data: assigned.length ? assigned : [0],
          backgroundColor: '#0f172a',
          borderRadius: 4
        },
        {
          label: 'Completed',
          data: completed.length ? completed : [0],
          backgroundColor: '#14b8a6',
          borderRadius: 4
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        },
        y: { grid: { display: false } }
      }
    }
  });
}

// Chart 3: Category-wise Complaints (Doughnut)
function renderCategoryComplaintsChart(data = []) {
  const ctx = document.getElementById('categoryComplaintsChart');
  if (!ctx) return;

  const labels = data.map(c => c.issues_type);
  const counts = data.map(c => c.total_complaints);

  const colors = ['#0d9488', '#0f172a', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#64748b'];

  if (categoryComplaintsChartInstance) categoryComplaintsChartInstance.destroy();

  categoryComplaintsChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['No Categories'],
      datasets: [{
        data: counts.length ? counts : [1],
        backgroundColor: colors.slice(0, Math.max(labels.length, 1)),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
}

// Chart 4: Status Distribution (Pie)
function renderStatusDistributionChart(data = []) {
  const ctx = document.getElementById('statusDistributionChart');
  if (!ctx) return;

  const labels = data.map(s => s.status);
  const counts = data.map(s => s.count);

  const statusColorsMap = {
    'Pending': '#f59e0b',
    'Assigned': '#3b82f6',
    'In Progress': '#8b5cf6',
    'Completed': '#10b981',
    'Rejected': '#ef4444'
  };

  const bgColors = labels.map(l => statusColorsMap[l] || '#64748b');

  if (statusDistributionChartInstance) statusDistributionChartInstance.destroy();

  statusDistributionChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels.length ? labels : ['No Status'],
      datasets: [{
        data: counts.length ? counts : [1],
        backgroundColor: bgColors,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
}

// Table 1: Staff Stats Table
function renderStaffStatsTable(data = []) {
  const tbody = document.getElementById('staffStatsTableBody');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No staff data available</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(st => `
    <tr>
      <td><strong>${escapeHtml(st.staff_name)}</strong></td>
      <td>
        <span class="badge-tag" style="padding: 0.15rem 0.45rem; font-size: 0.74rem;">
          <i class="fa-solid ${getIssueIcon(st.specialization)}"></i> ${escapeHtml(st.specialization)}
        </span>
      </td>
      <td><strong>${st.assigned_count || 0}</strong></td>
      <td><span style="color: var(--teal-700); font-weight: 700;">${st.completed_count || 0}</span></td>
    </tr>
  `).join('');
}

// Table 2: Category Stats Table
function renderCategoryStatsTable(data = []) {
  const tbody = document.getElementById('categoryStatsTableBody');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No category data available</td></tr>';
    return;
  }

  tbody.innerHTML = data.map(c => `
    <tr>
      <td>${getIssueBadge(c.issues_type)}</td>
      <td><strong>${c.total_complaints || 0}</strong></td>
      <td><span style="color: var(--teal-700); font-weight: 700;">${c.completed_count || 0}</span></td>
      <td><strong>${formatCurrency(c.total_category_cost)}</strong></td>
    </tr>
  `).join('');
}

// Download CSV Report
function downloadCSV(type) {
  showToast('Exporting Report', `Preparing ${type} CSV export...`, 'info');
  const token = localStorage.getItem('sruthi_auth_token');
  
  // Use fetch to handle authorization and blob download
  fetch(`${API_BASE}/reports/export/${type}`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  })
  .then(res => {
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  })
  .then(blob => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sruthi_${type}_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast('Export Complete', `${type.toUpperCase()} report downloaded successfully.`, 'success');
  })
  .catch(err => {
    console.error('CSV Export Error:', err);
    showToast('Export Error', 'Failed to generate CSV download.', 'error');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadReports();
});

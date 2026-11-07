/**
 * Sruthi Apartment Maintenance Request Management System
 * Maintenance Records Logic: Expense Auditing, Work Logs & CRUD
 */

checkAuth(true);

let recordsData = [];
let requestsList = [];

let currentPage = 1;
const itemsPerPage = 8;
let currentSearch = '';

// Load requests for dropdown
async function loadRequestsDropdown() {
  try {
    const response = await apiRequest('/requests');
    if (response.success) {
      requestsList = response.data;
      const select = document.getElementById('recordRequestSelect');
      select.innerHTML = '<option value="">-- Choose Request --</option>' + 
        requestsList.map(r => `
          <option value="${r.request_id}">
            #REQ-${r.request_id} &bull; Flat ${escapeHtml(r.flat_no)} (${escapeHtml(r.resident_name)}) - ${escapeHtml(r.issues_type)} [${escapeHtml(r.status)}]
          </option>
        `).join('');
    }
  } catch (err) {
    console.error('Error fetching requests for dropdown:', err);
  }
}

// Load summary KPI metrics
async function loadSummaryStats() {
  try {
    const response = await apiRequest('/records/stats/summary');
    if (response.success) {
      const stats = response.data;
      document.getElementById('summaryTotalCost').textContent = formatCurrency(stats.total_repair_costs);
      document.getElementById('summaryTotalRecords').textContent = Number(stats.total_records || 0).toLocaleString();
      document.getElementById('summaryAvgCost').textContent = formatCurrency(stats.avg_repair_cost);
      document.getElementById('summaryMaxCost').textContent = formatCurrency(stats.max_repair_cost);
    }
  } catch (err) {
    console.error('Error loading summary stats:', err);
  }
}

// Load maintenance records list
async function loadRecords() {
  try {
    let url = '/records';
    if (currentSearch) {
      url += `?search=${encodeURIComponent(currentSearch)}`;
    }

    const response = await apiRequest(url);
    if (response.success) {
      recordsData = response.data;
      document.getElementById('recordCountBadge').textContent = `${recordsData.length} Records`;
      currentPage = 1;
      renderTable();
      loadSummaryStats();
    }
  } catch (error) {
    console.error('Error loading records:', error);
    showToast('Failed to Load', 'Could not retrieve repair records.', 'error');
  }
}

// Render paginated records table
function renderTable() {
  const tbody = document.getElementById('recordsTableBody');
  const paginationInfo = document.getElementById('recordPaginationInfo');
  const paginationControls = document.getElementById('recordPaginationControls');

  if (recordsData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-file-excel"></i></div>
          <div class="empty-title">No maintenance repair records found</div>
          <div class="empty-desc">${currentSearch ? 'Try adjusting your search criteria.' : 'Click "+ Add Maintenance Record" above to record completed repairs.'}</div>
        </td>
      </tr>
    `;
    paginationInfo.textContent = 'Showing 0 of 0 records';
    paginationControls.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(recordsData.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, recordsData.length);
  const pageItems = recordsData.slice(startIdx, endIdx);

  tbody.innerHTML = pageItems.map(rec => `
    <tr>
      <td><strong>#REC-${rec.record_id}</strong></td>
      <td>
        <a href="/pages/requests.html?search=${rec.request_id}" style="font-weight: 700; color: var(--teal-700); text-decoration: underline;" title="View parent request">
          #REQ-${rec.request_id}
        </a>
        <div style="font-size: 0.74rem; color: var(--text-muted);">${getIssueBadge(rec.issues_type)}</div>
      </td>
      <td>
        <div style="font-weight: 700; color: var(--navy-900);">${escapeHtml(rec.resident_name)}</div>
        <span style="font-size: 0.75rem; background: var(--bg-muted); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600;">
          Flat ${escapeHtml(rec.flat_no)}
        </span>
      </td>
      <td style="max-width: 250px; font-size: 0.85rem;" title="${escapeHtml(rec.work_description)}">
        ${escapeHtml(rec.work_description)}
      </td>
      <td>
        ${rec.staff_name ? `<span class="badge-tag" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;"><i class="fa-solid fa-user-check"></i> ${escapeHtml(rec.staff_name)}</span>` : '<span style="color:#94a3b8; font-size:0.8rem;">N/A</span>'}
      </td>
      <td>
        <span style="font-size: 0.84rem; font-weight: 500;">
          <i class="fa-regular fa-calendar-check" style="color: var(--teal-600); margin-right: 4px;"></i>
          ${formatDate(rec.completion_date)}
        </span>
      </td>
      <td>
        <strong style="color: var(--teal-700); font-size: 0.95rem;">
          ${formatCurrency(rec.repair_cost)}
        </strong>
      </td>
      <td style="max-width: 160px; font-size: 0.8rem; color: var(--text-muted);" title="${escapeHtml(rec.remarks || 'None')}">
        ${escapeHtml(rec.remarks || 'None')}
      </td>
      <td style="text-align: right;">
        <div class="table-actions" style="justify-content: flex-end;">
          <button class="btn-icon edit" title="Edit Repair Record" onclick="editRecord(${rec.record_id})">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon delete" title="Delete Repair Record" onclick="confirmDeleteRecord(${rec.record_id})">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  paginationInfo.textContent = `Showing ${startIdx + 1}-${endIdx} of ${recordsData.length} records`;

  let controlsHtml = `
    <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    controlsHtml += `
      <button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>
    `;
  }

  controlsHtml += `
    <button class="page-btn ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  `;

  paginationControls.innerHTML = controlsHtml;
}

function changePage(page) {
  currentPage = page;
  renderTable();
}

// Modal handling
const recordModal = document.getElementById('recordModalOverlay');
const recordForm = document.getElementById('recordForm');

function openAddModal(preselectedRequestId = null) {
  document.getElementById('recordModalTitle').innerHTML = '<i class="fa-solid fa-file-invoice-dollar"></i><span>Add Maintenance Record</span>';
  document.getElementById('recordIdField').value = '';
  recordForm.reset();

  // Set default completion date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('recordCompletionDate').value = today;

  if (preselectedRequestId) {
    document.getElementById('recordRequestSelect').value = preselectedRequestId;
  }

  recordModal.classList.add('active');
}

function closeRecordModal() {
  recordModal.classList.remove('active');
}

function editRecord(id) {
  const rec = recordsData.find(r => r.record_id === id);
  if (!rec) return;

  document.getElementById('recordModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i><span>Edit Maintenance Record</span>';
  document.getElementById('recordIdField').value = rec.record_id;
  document.getElementById('recordRequestSelect').value = rec.request_id;
  document.getElementById('recordWorkDescription').value = rec.work_description;
  document.getElementById('recordCompletionDate').value = rec.completion_date;
  document.getElementById('recordRepairCost').value = rec.repair_cost;
  document.getElementById('recordRemarks').value = rec.remarks || '';

  recordModal.classList.add('active');
}

// Save Record Form
recordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('recordIdField').value;
  const request_id = document.getElementById('recordRequestSelect').value;
  const work_description = document.getElementById('recordWorkDescription').value.trim();
  const completion_date = document.getElementById('recordCompletionDate').value;
  const repair_cost = document.getElementById('recordRepairCost').value;
  const remarks = document.getElementById('recordRemarks').value.trim();
  const mark_request_completed = document.getElementById('markCompletedCheck').checked;

  if (!request_id || !work_description || !completion_date || repair_cost === '') {
    showToast('Validation Error', 'Please complete all required fields.', 'warning');
    return;
  }

  const payload = {
    request_id: parseInt(request_id, 10),
    work_description,
    completion_date,
    repair_cost: parseFloat(repair_cost),
    remarks: remarks || null,
    mark_request_completed
  };

  try {
    let result;
    if (id) {
      result = await apiRequest(`/records/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Record Updated', result.message || 'Repair details updated successfully.', 'success');
    } else {
      result = await apiRequest('/records', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Record Saved', result.message || 'Maintenance repair record saved.', 'success');
    }

    closeRecordModal();
    loadRecords();
  } catch (error) {
    showToast('Save Failed', error.message || 'Could not save maintenance record.', 'error');
  }
});

// Delete Confirmation
function confirmDeleteRecord(id) {
  showConfirmDialog({
    title: 'Delete Repair Record',
    message: `Are you sure you want to delete Maintenance Record #REC-${id}? The recorded cost will be subtracted from total expense reports.`,
    confirmText: 'Delete Record',
    onConfirm: async () => {
      try {
        const response = await apiRequest(`/records/${id}`, { method: 'DELETE' });
        showToast('Record Deleted', response.message || 'Maintenance record removed.', 'success');
        loadRecords();
      } catch (error) {
        showToast('Delete Failed', error.message || 'Could not delete repair record.', 'error');
      }
    }
  });
}

// Search debounce
let searchTimer = null;
document.getElementById('searchRecordInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentSearch = e.target.value.trim();
    loadRecords();
  }, 300);
});

// Event Listeners
document.getElementById('openAddRecordModalBtn').addEventListener('click', () => openAddModal());
document.getElementById('closeRecordModalBtn').addEventListener('click', closeRecordModal);
document.getElementById('cancelRecordModalBtn').addEventListener('click', closeRecordModal);
recordModal.addEventListener('click', (e) => {
  if (e.target === recordModal) closeRecordModal();
});

// URL Param Check
document.addEventListener('DOMContentLoaded', async () => {
  await loadRequestsDropdown();
  await loadRecords();

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'new') {
    openAddModal(urlParams.get('request_id'));
  }
});

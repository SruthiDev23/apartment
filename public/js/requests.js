/**
 * Sruthi Apartment Maintenance Request Management System
 * Requests Management: Search, Filter, Assignment, Status Pipeline & Records
 */

checkAuth(true);

let requestsData = [];
let residentsList = [];
let staffList = [];

let currentPage = 1;
const itemsPerPage = 8;
let currentSearch = '';
let currentStatus = 'All';
let currentIssueType = 'All';

// Load Residents & Staff for dropdowns
async function loadDropdowns() {
  try {
    const [resRes, staffRes] = await Promise.all([
      apiRequest('/residents'),
      apiRequest('/staff')
    ]);

    if (resRes.success) {
      residentsList = resRes.data;
      const resSelect = document.getElementById('requestResidentSelect');
      resSelect.innerHTML = '<option value="">-- Choose Resident --</option>' + 
        residentsList.map(r => `<option value="${r.resident_id}">Flat ${escapeHtml(r.flat_no)} - ${escapeHtml(r.name)} (${escapeHtml(r.phone)})</option>`).join('');
    }

    if (staffRes.success) {
      staffList = staffRes.data;
      const staffSelect = document.getElementById('requestStaffSelect');
      const quickStaffSelect = document.getElementById('quickStaffSelect');
      
      const optionsHtml = '<option value="">-- Leave Unassigned --</option>' + 
        staffList.map(s => `<option value="${s.staff_id}">${escapeHtml(s.name)} (${escapeHtml(s.specialization)})</option>`).join('');
      
      staffSelect.innerHTML = optionsHtml;
      quickStaffSelect.innerHTML = '<option value="">-- Unassign Staff --</option>' + 
        staffList.map(s => `<option value="${s.staff_id}">${escapeHtml(s.name)} - ${escapeHtml(s.specialization)}</option>`).join('');
    }
  } catch (err) {
    console.error('Error populating dropdowns:', err);
  }
}

// Load requests from API with active filters
async function loadRequests() {
  try {
    let url = '/requests';
    const params = new URLSearchParams();
    if (currentSearch) params.append('search', currentSearch);
    if (currentStatus && currentStatus !== 'All') params.append('status', currentStatus);
    if (currentIssueType && currentIssueType !== 'All') params.append('issues_type', currentIssueType);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await apiRequest(url);
    if (response.success) {
      requestsData = response.data;
      document.getElementById('requestsCountBadge').textContent = `${requestsData.length} Total Requests`;
      currentPage = 1;
      renderTable();
    }
  } catch (error) {
    console.error('Error fetching requests:', error);
    showToast('Failed to Load', 'Could not retrieve maintenance requests from server.', 'error');
  }
}

// Render paginated requests table
function renderTable() {
  const tbody = document.getElementById('requestsTableBody');
  const paginationInfo = document.getElementById('requestPaginationInfo');
  const paginationControls = document.getElementById('requestPaginationControls');

  if (requestsData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-clipboard-question"></i></div>
          <div class="empty-title">No maintenance requests found</div>
          <div class="empty-desc">${currentSearch || currentStatus !== 'All' || currentIssueType !== 'All' ? 'Try clearing or adjusting your search filters.' : 'Click "+ Submit New Request" above to log a complaint.'}</div>
        </td>
      </tr>
    `;
    paginationInfo.textContent = 'Showing 0 of 0 requests';
    paginationControls.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(requestsData.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, requestsData.length);
  const pageItems = requestsData.slice(startIdx, endIdx);

  tbody.innerHTML = pageItems.map(req => {
    const staffDisplay = req.staff_name ? `
      <div style="display: flex; align-items: center; gap: 0.35rem;">
        <span class="badge-tag" style="padding: 0.2rem 0.5rem; font-size: 0.76rem;">
          <i class="fa-solid fa-user-check"></i> ${escapeHtml(req.staff_name)}
        </span>
        <button class="btn-icon edit" style="width: 24px; height: 24px; font-size: 0.7rem;" title="Change Assigned Staff" onclick="openAssignModal(${req.request_id}, ${req.staff_id || 'null'}, '${escapeHtml(req.resident_name).replace(/'/g, "\\'")}', '${escapeHtml(req.flat_no)}')">
          <i class="fa-solid fa-user-gear"></i>
        </button>
      </div>
    ` : `
      <button class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.6rem; font-size: 0.74rem;" onclick="openAssignModal(${req.request_id}, null, '${escapeHtml(req.resident_name).replace(/'/g, "\\'")}', '${escapeHtml(req.flat_no)}')">
        <i class="fa-solid fa-plus"></i> Assign Staff
      </button>
    `;

    return `
      <tr>
        <td><strong>#REQ-${req.request_id}</strong></td>
        <td>
          <div style="font-weight: 700; color: var(--navy-900);">${escapeHtml(req.resident_name)}</div>
          <span style="background: var(--bg-muted); font-size: 0.76rem; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600; color: var(--navy-700);">
            Flat ${escapeHtml(req.flat_no)}
          </span>
        </td>
        <td>${getIssueBadge(req.issues_type)}</td>
        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(req.description)}">
          ${escapeHtml(req.description)}
        </td>
        <td>${staffDisplay}</td>
        <td>${formatDate(req.request_date, true)}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.35rem;">
            ${getStatusBadge(req.status)}
            <button class="btn-icon edit" style="width: 24px; height: 24px; font-size: 0.7rem;" title="Quick Update Status" onclick="openStatusModal(${req.request_id}, '${req.status}')">
              <i class="fa-solid fa-clock-rotate-left"></i>
            </button>
          </div>
        </td>
        <td style="text-align: right;">
          <div class="table-actions" style="justify-content: flex-end;">
            <button class="btn-icon view" title="View Full Ticket" onclick="viewRequestDetails(${req.request_id})">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-icon edit" title="Edit Request" onclick="editRequest(${req.request_id})">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-icon delete" title="Delete Request" onclick="confirmDeleteRequest(${req.request_id})">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  paginationInfo.textContent = `Showing ${startIdx + 1}-${endIdx} of ${requestsData.length} requests`;

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

// =====================================================================
// Request Modal: Add / Edit
// =====================================================================
const requestModal = document.getElementById('requestModalOverlay');
const requestForm = document.getElementById('requestForm');

function openAddModal() {
  document.getElementById('requestModalTitle').innerHTML = '<i class="fa-solid fa-plus-circle"></i><span>Submit Maintenance Request</span>';
  document.getElementById('requestIdField').value = '';
  requestForm.reset();
  document.getElementById('requestStatusSelect').value = 'Pending';
  requestModal.classList.add('active');
}

function closeRequestModal() {
  requestModal.classList.remove('active');
}

function editRequest(id) {
  const req = requestsData.find(r => r.request_id === id);
  if (!req) return;

  document.getElementById('requestModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i><span>Edit Maintenance Request</span>';
  document.getElementById('requestIdField').value = req.request_id;
  document.getElementById('requestResidentSelect').value = req.resident_id;
  document.getElementById('requestIssueTypeSelect').value = req.issues_type;
  document.getElementById('requestDescriptionField').value = req.description;
  document.getElementById('requestStaffSelect').value = req.staff_id || '';
  document.getElementById('requestStatusSelect').value = req.status;

  requestModal.classList.add('active');
}

requestForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('requestIdField').value;
  const resident_id = document.getElementById('requestResidentSelect').value;
  const issues_type = document.getElementById('requestIssueTypeSelect').value;
  const description = document.getElementById('requestDescriptionField').value.trim();
  const staff_id = document.getElementById('requestStaffSelect').value;
  const status = document.getElementById('requestStatusSelect').value;

  if (!resident_id || !issues_type || !description) {
    showToast('Validation Error', 'Please select resident, issue type, and describe the complaint.', 'warning');
    return;
  }

  const payload = {
    resident_id: parseInt(resident_id, 10),
    issues_type,
    description,
    staff_id: staff_id ? parseInt(staff_id, 10) : null,
    status
  };

  try {
    let result;
    if (id) {
      result = await apiRequest(`/requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Request Updated', result.message || 'Maintenance request updated.', 'success');
    } else {
      result = await apiRequest('/requests', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Request Submitted', result.message || 'Maintenance complaint logged.', 'success');
    }

    closeRequestModal();
    loadRequests();
  } catch (error) {
    showToast('Error', error.message || 'Failed to save maintenance request.', 'error');
  }
});

// =====================================================================
// Quick Assign Staff Modal
// =====================================================================
const assignModal = document.getElementById('assignModalOverlay');
const assignForm = document.getElementById('assignForm');

function openAssignModal(requestId, staffId, resName, flatNo) {
  document.getElementById('assignRequestIdField').value = requestId;
  document.getElementById('assignRequestSummary').innerHTML = `
    Assign technician for <strong>#REQ-${requestId}</strong> (Flat ${escapeHtml(flatNo)} &bull; ${escapeHtml(resName)})
  `;
  document.getElementById('quickStaffSelect').value = staffId || '';
  assignModal.classList.add('active');
}

assignForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const requestId = document.getElementById('assignRequestIdField').value;
  const staff_id = document.getElementById('quickStaffSelect').value;

  try {
    const result = await apiRequest(`/requests/${requestId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ staff_id: staff_id ? parseInt(staff_id, 10) : null })
    });

    showToast('Assignment Updated', result.message, 'success');
    assignModal.classList.remove('active');
    loadRequests();
  } catch (error) {
    showToast('Assignment Failed', error.message || 'Could not update staff assignment.', 'error');
  }
});

// =====================================================================
// Quick Update Status Modal
// =====================================================================
const statusModal = document.getElementById('statusModalOverlay');
const statusForm = document.getElementById('statusForm');

function openStatusModal(requestId, currentStatus) {
  document.getElementById('statusRequestIdField').value = requestId;
  document.getElementById('statusRequestSummary').innerHTML = `
    Select new status for Request <strong>#REQ-${requestId}</strong>:
  `;
  document.getElementById('quickStatusSelect').value = currentStatus || 'Pending';
  statusModal.classList.add('active');
}

statusForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const requestId = document.getElementById('statusRequestIdField').value;
  const status = document.getElementById('quickStatusSelect').value;

  try {
    const result = await apiRequest(`/requests/${requestId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    showToast('Status Updated', result.message, 'success');
    statusModal.classList.remove('active');
    loadRequests();
  } catch (error) {
    showToast('Update Failed', error.message || 'Could not update status.', 'error');
  }
});

// =====================================================================
// View Request Details & History Modal
// =====================================================================
async function viewRequestDetails(id) {
  try {
    const response = await apiRequest(`/requests/${id}`);
    if (!response.success) throw new Error(response.message);

    const req = response.data;
    const bodyEl = document.getElementById('viewRequestModalBody');

    const recordsHtml = req.records && req.records.length > 0 ? `
      <div style="margin-top: 1.5rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--navy-800); margin-bottom: 0.75rem;">
          <i class="fa-solid fa-file-invoice-dollar" style="color: var(--teal-600); margin-right: 6px;"></i>
          Linked Repair Records (${req.records.length})
        </h4>
        <div class="table-responsive" style="max-height: 220px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Rec ID</th>
                <th>Work Done</th>
                <th>Completed Date</th>
                <th>Repair Cost</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${req.records.map(rec => `
                <tr>
                  <td><strong>#REC-${rec.record_id}</strong></td>
                  <td>${escapeHtml(rec.work_description)}</td>
                  <td>${formatDate(rec.completion_date)}</td>
                  <td><strong style="color: var(--teal-700);">${formatCurrency(rec.repair_cost)}</strong></td>
                  <td>${escapeHtml(rec.remarks || 'None')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : `
      <div style="margin-top: 1.5rem; padding: 1.25rem; background: var(--bg-muted); border-radius: var(--radius-md); text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        <i class="fa-solid fa-file-invoice" style="font-size: 1.4rem; margin-bottom: 0.35rem; display: block; color: #94a3b8;"></i>
        No maintenance repair records entered yet for this request.
      </div>
    `;

    bodyEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
        <div>
          <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Ticket Identifier</span>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--navy-900);">#REQ-${req.request_id}</h3>
        </div>
        <div>
          ${getStatusBadge(req.status)}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1.25rem;">
        <div style="background: #f8fafc; padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Resident Information</div>
          <div style="font-size: 1.05rem; font-weight: 800; color: var(--navy-900); margin-top: 0.25rem;">${escapeHtml(req.resident_name)}</div>
          <div style="font-size: 0.85rem; color: var(--teal-700); font-weight: 700; margin-top: 0.2rem;">
            <i class="fa-solid fa-building"></i> Flat ${escapeHtml(req.flat_no)}
          </div>
          <div style="font-size: 0.82rem; color: var(--navy-600); margin-top: 0.35rem;">
            <i class="fa-solid fa-phone" style="margin-right: 4px; color: var(--teal-600);"></i> ${escapeHtml(req.resident_phone)}
          </div>
        </div>

        <div style="background: #f8fafc; padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Assigned Technician</div>
          ${req.staff_name ? `
            <div style="font-size: 1.05rem; font-weight: 800; color: var(--navy-900); margin-top: 0.25rem;">${escapeHtml(req.staff_name)}</div>
            <div style="font-size: 0.85rem; color: var(--navy-700); font-weight: 600; margin-top: 0.2rem;">
              <i class="fa-solid fa-wrench" style="color: var(--teal-600);"></i> ${escapeHtml(req.staff_specialization)}
            </div>
            <div style="font-size: 0.82rem; color: var(--navy-600); margin-top: 0.35rem;">
              <i class="fa-solid fa-phone" style="margin-right: 4px; color: var(--teal-600);"></i> ${escapeHtml(req.staff_phone || 'N/A')}
            </div>
          ` : `
            <div style="font-size: 0.95rem; color: var(--text-muted); margin-top: 0.4rem; font-style: italic;">
              <i class="fa-regular fa-clock"></i> No staff member assigned yet.
            </div>
          `}
        </div>
      </div>

      <div style="margin-top: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.78rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Issue Type</span>
          <span style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-regular fa-calendar"></i> Reported: ${formatDate(req.request_date, true)}</span>
        </div>
        <div style="margin-top: 0.35rem;">${getIssueBadge(req.issues_type)}</div>
      </div>

      <div style="margin-top: 1rem;">
        <span style="font-size: 0.78rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Complaint Description</span>
        <div style="margin-top: 0.35rem; padding: 0.85rem; background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem; line-height: 1.5; color: var(--navy-900);">
          ${escapeHtml(req.description)}
        </div>
      </div>

      ${recordsHtml}
    `;

    document.getElementById('viewRequestModalOverlay').classList.add('active');
  } catch (error) {
    showToast('Error', 'Could not fetch maintenance ticket details.', 'error');
  }
}

// Delete Confirmation
function confirmDeleteRequest(id) {
  showConfirmDialog({
    title: 'Delete Maintenance Request',
    message: `Are you sure you want to delete Request #REQ-${id}? Any recorded repairs and expenses linked to this request will also be deleted.`,
    confirmText: 'Delete Request',
    onConfirm: async () => {
      try {
        const response = await apiRequest(`/requests/${id}`, { method: 'DELETE' });
        showToast('Request Deleted', response.message || 'Maintenance request removed.', 'success');
        loadRequests();
      } catch (error) {
        showToast('Delete Failed', error.message || 'Could not delete request.', 'error');
      }
    }
  });
}

// Search & Filter Listeners
let searchTimer = null;
document.getElementById('searchRequestInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentSearch = e.target.value.trim();
    loadRequests();
  }, 300);
});

document.getElementById('filterStatusSelect').addEventListener('change', (e) => {
  currentStatus = e.target.value;
  loadRequests();
});

document.getElementById('filterIssueTypeSelect').addEventListener('change', (e) => {
  currentIssueType = e.target.value;
  loadRequests();
});

// Modal Close Triggers
document.getElementById('openAddRequestModalBtn').addEventListener('click', openAddModal);
document.getElementById('closeRequestModalBtn').addEventListener('click', closeRequestModal);
document.getElementById('cancelRequestModalBtn').addEventListener('click', closeRequestModal);
requestModal.addEventListener('click', (e) => {
  if (e.target === requestModal) closeRequestModal();
});

document.getElementById('closeAssignModalBtn').addEventListener('click', () => assignModal.classList.remove('active'));
document.getElementById('cancelAssignBtn').addEventListener('click', () => assignModal.classList.remove('active'));
assignModal.addEventListener('click', (e) => {
  if (e.target === assignModal) assignModal.classList.remove('active');
});

document.getElementById('closeStatusModalBtn').addEventListener('click', () => statusModal.classList.remove('active'));
document.getElementById('cancelStatusBtn').addEventListener('click', () => statusModal.classList.remove('active'));
statusModal.addEventListener('click', (e) => {
  if (e.target === statusModal) statusModal.classList.remove('active');
});

const viewModal = document.getElementById('viewRequestModalOverlay');
document.getElementById('closeViewRequestModalBtn').addEventListener('click', () => viewModal.classList.remove('active'));
document.getElementById('closeViewRequestBtn2').addEventListener('click', () => viewModal.classList.remove('active'));
viewModal.addEventListener('click', (e) => {
  if (e.target === viewModal) viewModal.classList.remove('active');
});

// URL Param Check
document.addEventListener('DOMContentLoaded', async () => {
  await loadDropdowns();
  
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get('search');
  if (searchParam) {
    document.getElementById('searchRequestInput').value = searchParam;
    currentSearch = searchParam;
  }
  
  await loadRequests();

  if (urlParams.get('action') === 'new') {
    openAddModal();
  }
});

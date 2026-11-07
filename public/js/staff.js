/**
 * Sruthi Apartment Maintenance Request Management System
 * Maintenance Staff Management: CRUD Operations, Specialization Filters & Allocation
 */

checkAuth(true);

let staffData = [];
let currentPage = 1;
const itemsPerPage = 8;
let currentSearchTerm = '';
let currentSpecialization = 'All';

// Load staff list from API
async function loadStaff() {
  try {
    let url = '/staff';
    const params = new URLSearchParams();
    if (currentSearchTerm) params.append('search', currentSearchTerm);
    if (currentSpecialization && currentSpecialization !== 'All') params.append('specialization', currentSpecialization);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await apiRequest(url);
    if (response.success) {
      staffData = response.data;
      document.getElementById('staffCountBadge').textContent = `${staffData.length} Staff Members`;
      currentPage = 1;
      renderTable();
    }
  } catch (error) {
    console.error('Error fetching staff:', error);
    showToast('Failed to Load', 'Could not retrieve maintenance staff from server.', 'error');
  }
}

// Render paginated table rows
function renderTable() {
  const tbody = document.getElementById('staffTableBody');
  const paginationInfo = document.getElementById('staffPaginationInfo');
  const paginationControls = document.getElementById('staffPaginationControls');

  if (staffData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-user-slash"></i></div>
          <div class="empty-title">No maintenance staff found</div>
          <div class="empty-desc">${currentSearchTerm || currentSpecialization !== 'All' ? 'Try adjusting your search filters.' : 'Click "+ Add Maintenance Staff" above to register technicians.'}</div>
        </td>
      </tr>
    `;
    paginationInfo.textContent = 'Showing 0 of 0 staff';
    paginationControls.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(staffData.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, staffData.length);
  const pageItems = staffData.slice(startIdx, endIdx);

  tbody.innerHTML = pageItems.map(st => `
    <tr>
      <td><strong>#STF-${st.staff_id}</strong></td>
      <td>
        <div style="font-weight: 700; color: var(--navy-900);">${escapeHtml(st.name)}</div>
      </td>
      <td>
        <span class="badge-tag">
          <i class="fa-solid ${getIssueIcon(st.specialization)}"></i>
          <span>${escapeHtml(st.specialization)}</span>
        </span>
      </td>
      <td>
        <a href="tel:${escapeHtml(st.phone)}" style="color: var(--navy-700); font-weight: 500;">
          <i class="fa-solid fa-phone" style="color: var(--teal-600); margin-right: 4px; font-size: 0.8rem;"></i>
          ${escapeHtml(st.phone)}
        </a>
      </td>
      <td>
        <a href="mailto:${escapeHtml(st.email)}" style="color: var(--navy-600);">
          <i class="fa-solid fa-envelope" style="color: #94a3b8; margin-right: 4px; font-size: 0.8rem;"></i>
          ${escapeHtml(st.email)}
        </a>
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem; align-items: center;">
          <span class="status-pill status-assigned" title="Total Assigned">
            ${st.total_assigned_requests || 0} Total
          </span>
          ${st.in_progress_requests > 0 ? `<span class="status-pill status-in-progress" title="In Progress">${st.in_progress_requests} Active</span>` : ''}
        </div>
      </td>
      <td style="text-align: right;">
        <div class="table-actions" style="justify-content: flex-end;">
          <button class="btn-icon view" title="View Assigned Requests" onclick="viewStaff(${st.staff_id})">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn-icon edit" title="Edit Staff Member" onclick="editStaff(${st.staff_id})">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon delete" title="Delete Staff Member" onclick="confirmDeleteStaff(${st.staff_id}, '${escapeHtml(st.name).replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  paginationInfo.textContent = `Showing ${startIdx + 1}-${endIdx} of ${staffData.length} staff members`;

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
    <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
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
const modalOverlay = document.getElementById('staffModalOverlay');
const staffForm = document.getElementById('staffForm');

function openAddModal() {
  document.getElementById('staffModalTitle').innerHTML = '<i class="fa-solid fa-user-plus"></i><span>Add Maintenance Staff</span>';
  document.getElementById('staffIdField').value = '';
  staffForm.reset();
  modalOverlay.classList.add('active');
  document.getElementById('staffNameField').focus();
}

function closeModal() {
  modalOverlay.classList.remove('active');
}

function editStaff(id) {
  const staff = staffData.find(s => s.staff_id === id);
  if (!staff) return;

  document.getElementById('staffModalTitle').innerHTML = '<i class="fa-solid fa-user-gear"></i><span>Edit Staff Member</span>';
  document.getElementById('staffIdField').value = staff.staff_id;
  document.getElementById('staffNameField').value = staff.name;
  document.getElementById('staffSpecializationField').value = staff.specialization;
  document.getElementById('staffPhoneField').value = staff.phone;
  document.getElementById('staffEmailField').value = staff.email;

  modalOverlay.classList.add('active');
}

// Save Staff Form Handler
staffForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('staffIdField').value;
  const name = document.getElementById('staffNameField').value.trim();
  const specialization = document.getElementById('staffSpecializationField').value;
  const phone = document.getElementById('staffPhoneField').value.trim();
  const email = document.getElementById('staffEmailField').value.trim();

  if (!name || !specialization || !phone || !email) {
    showToast('Validation Error', 'Please complete all required fields.', 'warning');
    return;
  }

  const payload = { name, specialization, phone, email };

  try {
    let result;
    if (id) {
      result = await apiRequest(`/staff/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Staff Updated', result.message || 'Staff details saved successfully.', 'success');
    } else {
      result = await apiRequest('/staff', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Staff Registered', result.message || 'Staff member added successfully.', 'success');
    }

    closeModal();
    loadStaff();
  } catch (error) {
    showToast('Error', error.message || 'Failed to save staff member.', 'error');
  }
});

// View Staff Details & Assigned Requests
async function viewStaff(id) {
  try {
    const response = await apiRequest(`/staff/${id}`);
    if (!response.success) throw new Error(response.message);

    const staff = response.data;
    const bodyEl = document.getElementById('viewStaffModalBody');

    const assignedHtml = staff.assigned_requests && staff.assigned_requests.length > 0 ? `
      <div style="margin-top: 1.5rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--navy-800); margin-bottom: 0.75rem;">
          <i class="fa-solid fa-clipboard-list" style="color: var(--teal-600); margin-right: 6px;"></i>
          Assigned Maintenance Requests (${staff.assigned_requests.length})
        </h4>
        <div class="table-responsive" style="max-height: 240px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Req ID</th>
                <th>Resident & Flat</th>
                <th>Issue Type</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${staff.assigned_requests.map(rq => `
                <tr>
                  <td><strong>#REQ-${rq.request_id}</strong></td>
                  <td>${escapeHtml(rq.resident_name)} (Flat ${escapeHtml(rq.flat_no)})</td>
                  <td>${getIssueBadge(rq.issues_type)}</td>
                  <td>${formatDate(rq.request_date)}</td>
                  <td>${getStatusBadge(rq.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : `
      <div style="margin-top: 1.5rem; padding: 1.25rem; background: var(--bg-muted); border-radius: var(--radius-md); text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        <i class="fa-solid fa-check-circle" style="font-size: 1.5rem; margin-bottom: 0.4rem; display: block; color: var(--teal-600);"></i>
        No active requests are currently assigned to this staff member.
      </div>
    `;

    bodyEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-color);">
        <div style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, var(--teal-600), var(--navy-900)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; font-weight: 700;">
          <i class="fa-solid ${getIssueIcon(staff.specialization)}"></i>
        </div>
        <div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--navy-900);">${escapeHtml(staff.name)}</h3>
          <span class="badge-tag" style="margin-top: 0.2rem;">
            <i class="fa-solid fa-wrench"></i>
            <span>${escapeHtml(staff.specialization)} Specialist</span>
          </span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1.25rem;">
        <div>
          <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Phone Number</span>
          <div style="font-size: 0.95rem; font-weight: 600; color: var(--navy-800); margin-top: 0.2rem;">
            <i class="fa-solid fa-phone" style="color: var(--teal-600); margin-right: 6px;"></i>${escapeHtml(staff.phone)}
          </div>
        </div>
        <div>
          <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Work Email</span>
          <div style="font-size: 0.95rem; font-weight: 600; color: var(--navy-800); margin-top: 0.2rem;">
            <i class="fa-solid fa-envelope" style="color: var(--teal-600); margin-right: 6px;"></i>${escapeHtml(staff.email)}
          </div>
        </div>
      </div>

      ${assignedHtml}
    `;

    document.getElementById('viewStaffModalOverlay').classList.add('active');
  } catch (error) {
    showToast('Error', 'Could not fetch staff details.', 'error');
  }
}

// Delete Confirmation
function confirmDeleteStaff(id, name) {
  showConfirmDialog({
    title: 'Delete Staff Member',
    message: `Are you sure you want to remove staff member "${name}"? Any active requests assigned to them will be unassigned automatically.`,
    confirmText: 'Delete Staff',
    onConfirm: async () => {
      try {
        const response = await apiRequest(`/staff/${id}`, { method: 'DELETE' });
        showToast('Staff Removed', response.message || 'Staff member deleted.', 'success');
        loadStaff();
      } catch (error) {
        showToast('Delete Failed', error.message || 'Could not delete staff member.', 'error');
      }
    }
  });
}

// Search debounce & specialization filter
let searchTimer = null;
document.getElementById('searchStaffInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentSearchTerm = e.target.value.trim();
    loadStaff();
  }, 300);
});

document.getElementById('filterSpecializationSelect').addEventListener('change', (e) => {
  currentSpecialization = e.target.value;
  loadStaff();
});

// Event Listeners
document.getElementById('openAddStaffModalBtn').addEventListener('click', openAddModal);
document.getElementById('closeStaffModalBtn').addEventListener('click', closeModal);
document.getElementById('cancelStaffModalBtn').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

const viewModal = document.getElementById('viewStaffModalOverlay');
document.getElementById('closeViewStaffModalBtn').addEventListener('click', () => viewModal.classList.remove('active'));
document.getElementById('closeViewStaffBtn2').addEventListener('click', () => viewModal.classList.remove('active'));
viewModal.addEventListener('click', (e) => {
  if (e.target === viewModal) viewModal.classList.remove('active');
});

// URL Action check: ?action=new
document.addEventListener('DOMContentLoaded', () => {
  loadStaff();
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'new') {
    openAddModal();
  }
});

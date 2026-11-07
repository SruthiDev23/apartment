/**
 * Sruthi Apartment Maintenance Request Management System
 * Residents Management: CRUD Operations, Search, Filter & History
 */

checkAuth(true);

let residentsData = [];
let currentPage = 1;
const itemsPerPage = 8;
let currentSearchTerm = '';

// Load residents list from MySQL API
async function loadResidents(search = '') {
  try {
    currentSearchTerm = search;
    const url = search ? `/residents?search=${encodeURIComponent(search)}` : '/residents';
    const response = await apiRequest(url);

    if (response.success) {
      residentsData = response.data;
      document.getElementById('residentCountBadge').textContent = `${residentsData.length} Total Residents`;
      currentPage = 1;
      renderTable();
    }
  } catch (error) {
    console.error('Error fetching residents:', error);
    showToast('Failed to Load', 'Could not retrieve residents data from server.', 'error');
  }
}

// Render paginated table rows
function renderTable() {
  const tbody = document.getElementById('residentsTableBody');
  const paginationInfo = document.getElementById('paginationInfo');
  const paginationControls = document.getElementById('paginationControls');

  if (residentsData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-users-slash"></i></div>
          <div class="empty-title">No residents found</div>
          <div class="empty-desc">${currentSearchTerm ? 'Try adjusting your search criteria.' : 'Click "+ Add Resident" above to register the first resident.'}</div>
        </td>
      </tr>
    `;
    paginationInfo.textContent = 'Showing 0 of 0 residents';
    paginationControls.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(residentsData.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, residentsData.length);
  const pageItems = residentsData.slice(startIdx, endIdx);

  tbody.innerHTML = pageItems.map(res => `
    <tr>
      <td><strong>#RES-${res.resident_id}</strong></td>
      <td>
        <div style="font-weight: 700; color: var(--navy-900);">${escapeHtml(res.name)}</div>
      </td>
      <td>
        <span style="background: var(--teal-50); color: var(--teal-700); font-weight: 700; padding: 0.25rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--teal-100);">
          <i class="fa-solid fa-building" style="margin-right: 4px; font-size: 0.75rem;"></i>
          ${escapeHtml(res.flat_no)}
        </span>
      </td>
      <td>
        <a href="tel:${escapeHtml(res.phone)}" style="color: var(--navy-700); font-weight: 500;">
          <i class="fa-solid fa-phone" style="color: var(--teal-600); margin-right: 4px; font-size: 0.8rem;"></i>
          ${escapeHtml(res.phone)}
        </a>
      </td>
      <td>
        <a href="mailto:${escapeHtml(res.email)}" style="color: var(--navy-600);">
          <i class="fa-solid fa-envelope" style="color: #94a3b8; margin-right: 4px; font-size: 0.8rem;"></i>
          ${escapeHtml(res.email)}
        </a>
      </td>
      <td>
        <span class="badge-tag">
          <i class="fa-solid fa-clipboard-check"></i>
          <span>${res.total_requests || 0} Requests</span>
        </span>
      </td>
      <td style="text-align: right;">
        <div class="table-actions" style="justify-content: flex-end;">
          <button class="btn-icon view" title="View Details & History" onclick="viewResident(${res.resident_id})">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="btn-icon edit" title="Edit Resident" onclick="editResident(${res.resident_id})">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-icon delete" title="Delete Resident" onclick="confirmDeleteResident(${res.resident_id}, '${escapeHtml(res.name).replace(/'/g, "\\'")}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  paginationInfo.textContent = `Showing ${startIdx + 1}-${endIdx} of ${residentsData.length} residents`;

  // Render pagination buttons
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
const modalOverlay = document.getElementById('residentModalOverlay');
const residentForm = document.getElementById('residentForm');

function openAddModal() {
  document.getElementById('residentModalTitle').innerHTML = '<i class="fa-solid fa-user-plus"></i><span>Add New Resident</span>';
  document.getElementById('residentIdField').value = '';
  residentForm.reset();
  modalOverlay.classList.add('active');
  document.getElementById('residentNameField').focus();
}

function closeModal() {
  modalOverlay.classList.remove('active');
}

function editResident(id) {
  const resident = residentsData.find(r => r.resident_id === id);
  if (!resident) return;

  document.getElementById('residentModalTitle').innerHTML = '<i class="fa-solid fa-user-pen"></i><span>Edit Resident Details</span>';
  document.getElementById('residentIdField').value = resident.resident_id;
  document.getElementById('residentNameField').value = resident.name;
  document.getElementById('residentFlatField').value = resident.flat_no;
  document.getElementById('residentPhoneField').value = resident.phone;
  document.getElementById('residentEmailField').value = resident.email;

  modalOverlay.classList.add('active');
}

// Save Resident Form Handler
residentForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('residentIdField').value;
  const name = document.getElementById('residentNameField').value.trim();
  const flat_no = document.getElementById('residentFlatField').value.trim();
  const phone = document.getElementById('residentPhoneField').value.trim();
  const email = document.getElementById('residentEmailField').value.trim();

  if (!name || !flat_no || !phone || !email) {
    showToast('Validation Error', 'Please fill in all mandatory fields.', 'warning');
    return;
  }

  const payload = { name, flat_no, phone, email };

  try {
    let result;
    if (id) {
      // Update
      result = await apiRequest(`/residents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Resident Updated', result.message || 'Resident details saved successfully.', 'success');
    } else {
      // Create
      result = await apiRequest('/residents', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Resident Created', result.message || 'Resident registered successfully.', 'success');
    }

    closeModal();
    loadResidents(currentSearchTerm);
  } catch (error) {
    showToast('Error', error.message || 'Failed to save resident.', 'error');
  }
});

// View Resident Details & History Modal
async function viewResident(id) {
  try {
    const response = await apiRequest(`/residents/${id}`);
    if (!response.success) throw new Error(response.message);

    const resident = response.data;
    const bodyEl = document.getElementById('viewResidentModalBody');

    const requestsHtml = resident.requests && resident.requests.length > 0 ? `
      <div style="margin-top: 1.5rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--navy-800); margin-bottom: 0.75rem;">
          <i class="fa-solid fa-list-check" style="color: var(--teal-600); margin-right: 6px;"></i>
          Maintenance History (${resident.requests.length})
        </h4>
        <div class="table-responsive" style="max-height: 240px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Req ID</th>
                <th>Category</th>
                <th>Date</th>
                <th>Status</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              ${resident.requests.map(rq => `
                <tr>
                  <td><strong>#REQ-${rq.request_id}</strong></td>
                  <td>${getIssueBadge(rq.issues_type)}</td>
                  <td>${formatDate(rq.request_date)}</td>
                  <td>${getStatusBadge(rq.status)}</td>
                  <td>${rq.staff_name ? escapeHtml(rq.staff_name) : '<em style="color:#94a3b8">Unassigned</em>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : `
      <div style="margin-top: 1.5rem; padding: 1.25rem; background: var(--bg-muted); border-radius: var(--radius-md); text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        <i class="fa-regular fa-clipboard" style="font-size: 1.5rem; margin-bottom: 0.4rem; display: block; color: #94a3b8;"></i>
        This resident has not submitted any maintenance requests yet.
      </div>
    `;

    bodyEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem; padding-bottom: 1.25rem; border-bottom: 1px solid var(--border-color);">
        <div style="width: 54px; height: 54px; border-radius: 50%; background: linear-gradient(135deg, var(--teal-500), var(--navy-800)); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; font-weight: 700;">
          ${escapeHtml(resident.name.substring(0, 2).toUpperCase())}
        </div>
        <div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: var(--navy-900);">${escapeHtml(resident.name)}</h3>
          <span style="background: var(--teal-50); color: var(--teal-700); font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 4px; font-size: 0.8rem; border: 1px solid var(--teal-100);">
            Flat ${escapeHtml(resident.flat_no)}
          </span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-top: 1.25rem;">
        <div>
          <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Phone Number</span>
          <div style="font-size: 0.95rem; font-weight: 600; color: var(--navy-800); margin-top: 0.2rem;">
            <i class="fa-solid fa-phone" style="color: var(--teal-600); margin-right: 6px;"></i>${escapeHtml(resident.phone)}
          </div>
        </div>
        <div>
          <span style="font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Email Address</span>
          <div style="font-size: 0.95rem; font-weight: 600; color: var(--navy-800); margin-top: 0.2rem;">
            <i class="fa-solid fa-envelope" style="color: var(--teal-600); margin-right: 6px;"></i>${escapeHtml(resident.email)}
          </div>
        </div>
      </div>

      ${requestsHtml}
    `;

    document.getElementById('viewResidentModalOverlay').classList.add('active');
  } catch (error) {
    showToast('Error', 'Could not fetch resident profile.', 'error');
  }
}

// Delete Confirmation
function confirmDeleteResident(id, name) {
  showConfirmDialog({
    title: 'Delete Resident Record',
    message: `Are you sure you want to permanently delete resident "${name}"? All associated maintenance requests and repair records will also be deleted.`,
    confirmText: 'Delete Resident',
    onConfirm: async () => {
      try {
        const response = await apiRequest(`/residents/${id}`, { method: 'DELETE' });
        showToast('Resident Removed', response.message || 'Resident record deleted.', 'success');
        loadResidents(currentSearchTerm);
      } catch (error) {
        showToast('Delete Failed', error.message || 'Could not delete resident.', 'error');
      }
    }
  });
}

// Search debounce
let searchTimer = null;
document.getElementById('searchResidentInput').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    loadResidents(e.target.value.trim());
  }, 300);
});

// Event Listeners
document.getElementById('openAddResidentModalBtn').addEventListener('click', openAddModal);
document.getElementById('closeResidentModalBtn').addEventListener('click', closeModal);
document.getElementById('cancelResidentModalBtn').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

const viewModal = document.getElementById('viewResidentModalOverlay');
document.getElementById('closeViewResidentModalBtn').addEventListener('click', () => viewModal.classList.remove('active'));
document.getElementById('closeViewModalBtn2').addEventListener('click', () => viewModal.classList.remove('active'));
viewModal.addEventListener('click', (e) => {
  if (e.target === viewModal) viewModal.classList.remove('active');
});

// URL Action check: ?action=new
document.addEventListener('DOMContentLoaded', () => {
  loadResidents();
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'new') {
    openAddModal();
  }
});

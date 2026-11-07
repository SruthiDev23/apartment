/**
 * Sruthi Apartment Maintenance Request Management System
 * Common Utilities, Authentication Guard, Notifications & Modals
 */

const API_BASE = '/api';

// Format currency
function formatCurrency(amount) {
  const num = parseFloat(amount || 0);
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Format date time string
function formatDate(dateStr, includeTime = false) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return d.toLocaleDateString('en-IN', options);
}

// Status Badges Generator
function getStatusBadge(status) {
  const s = (status || 'Pending').trim();
  const slug = s.toLowerCase().replace(/\s+/g, '-');
  return `<span class="status-pill status-${slug}">${escapeHtml(s)}</span>`;
}

// Issue Type Icons
function getIssueIcon(type) {
  switch ((type || '').toLowerCase()) {
    case 'plumbing':
      return 'fa-faucet-drip';
    case 'electrical':
      return 'fa-bolt';
    case 'cleaning':
      return 'fa-broom';
    case 'painting':
      return 'fa-paint-roller';
    case 'lift maintenance':
      return 'fa-elevator';
    case 'water supply':
      return 'fa-droplet';
    default:
      return 'fa-wrench';
  }
}

// Issue Badge Generator
function getIssueBadge(type) {
  const icon = getIssueIcon(type);
  return `
    <span class="issue-badge">
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHtml(type || 'General')}</span>
    </span>
  `;
}

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// =====================================================================
// Toast Notification System
// =====================================================================
function showToast(title, message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fa-solid ${icons[type] || icons.info}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 350);
  }, 4000);
}

// =====================================================================
// Confirmation Modal System
// =====================================================================
function showConfirmDialog({ title, message, confirmText = 'Delete', cancelText = 'Cancel', onConfirm }) {
  let modalOverlay = document.getElementById('confirmModalOverlay');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'confirmModalOverlay';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
      <div class="modal-container" style="max-width: 420px;">
        <div class="confirm-box">
          <div class="confirm-icon-danger">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <h3 class="confirm-title" id="confirmTitle">Confirm Action</h3>
          <p class="confirm-desc" id="confirmMessage">Are you sure you want to proceed?</p>
        </div>
        <div class="modal-footer" style="justify-content: center;">
          <button type="button" class="btn btn-secondary" id="confirmCancelBtn">Cancel</button>
          <button type="button" class="btn btn-danger" id="confirmOkBtn">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalOverlay);
  }

  document.getElementById('confirmTitle').textContent = title || 'Confirm Deletion';
  document.getElementById('confirmMessage').textContent = message || 'Are you sure you want to delete this record? This action cannot be undone.';
  
  const okBtn = document.getElementById('confirmOkBtn');
  const cancelBtn = document.getElementById('confirmCancelBtn');

  okBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;

  // Clear previous listeners by replacing
  const newOkBtn = okBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

  function closeModal() {
    modalOverlay.classList.remove('active');
  }

  newCancelBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  newOkBtn.addEventListener('click', async () => {
    closeModal();
    if (typeof onConfirm === 'function') {
      await onConfirm();
    }
  });

  modalOverlay.classList.add('active');
}

// =====================================================================
// Authentication Guard & User Session
// =====================================================================
function checkAuth(requireAuth = true) {
  const token = localStorage.getItem('sruthi_auth_token');
  const userJson = localStorage.getItem('sruthi_auth_user');

  if (requireAuth) {
    if (!token) {
      window.location.href = '/pages/login.html';
      return null;
    }
    try {
      const user = userJson ? JSON.parse(userJson) : null;
      updateUserUI(user);
      return user;
    } catch (e) {
      localStorage.removeItem('sruthi_auth_token');
      localStorage.removeItem('sruthi_auth_user');
      window.location.href = '/pages/login.html';
      return null;
    }
  } else {
    // On login page
    if (token) {
      window.location.href = '/pages/dashboard.html';
    }
    return null;
  }
}

function updateUserUI(user) {
  if (!user) return;
  const nameEls = document.querySelectorAll('.user-name-display');
  const roleEls = document.querySelectorAll('.user-role-display');
  const avatarEls = document.querySelectorAll('.user-avatar-display');

  nameEls.forEach(el => el.textContent = user.fullName || user.username || 'Admin');
  roleEls.forEach(el => el.textContent = user.role || 'Administrator');
  avatarEls.forEach(el => {
    const initials = (user.fullName || user.username || 'A')
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    el.textContent = initials;
  });
}

function logout() {
  localStorage.removeItem('sruthi_auth_token');
  localStorage.removeItem('sruthi_auth_user');
  showToast('Logged Out', 'You have been safely logged out.', 'info');
  setTimeout(() => {
    window.location.href = '/pages/login.html';
  }, 400);
}

// Helper to make authenticated API requests
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('sruthi_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => ({ success: false, message: 'Invalid response from server' }));

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      showToast('Session Expired', 'Please log in again.', 'warning');
      setTimeout(() => logout(), 1200);
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

// Initialize Mobile Sidebar toggle
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('mobileToggleBtn');
  const closeBtn = document.getElementById('sidebarCloseBtn');
  const sidebar = document.querySelector('.sidebar');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  if (closeBtn && sidebar) {
    closeBtn.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  // Bind logout buttons
  document.querySelectorAll('.btn-logout-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  });
});

/**
 * SocietyHub - Universal Notification Center Engine
 * Renders real-time society notifications, gate pass requests, maintenance dues, and announcements.
 */

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    initNotificationCenter();
  });
})();

function initNotificationCenter() {
  const notifBtns = document.querySelectorAll('.btn-nav-icon');
  if (!notifBtns.length) return;

  notifBtns.forEach(btn => {
    // Add wrapper class
    const wrapper = btn.parentElement;
    if (wrapper) wrapper.style.position = 'relative';

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleNotificationPanel(wrapper || btn.parentElement);
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('globalNotifDropdown');
    if (dropdown && !dropdown.contains(e.target) && !e.target.closest('.btn-nav-icon')) {
      dropdown.classList.remove('show');
    }
  });

  updateNotificationBadge();
}

function updateNotificationBadge() {
  const dots = document.querySelectorAll('.notif-dot');
  if (!dots.length) return;

  const count = getActiveNotificationCount();
  dots.forEach(dot => {
    if (count > 0) {
      dot.style.display = 'block';
      dot.setAttribute('title', `${count} New Notifications`);
    } else {
      dot.style.display = 'none';
    }
  });
}

function getActiveNotificationCount() {
  if (typeof SystemDB === 'undefined') return 0;
  const user = SystemDB.getCurrentUser();
  let count = 0;

  if (user) {
    // Visitor approvals for residents
    if (user.role === 'Resident') {
      const pendingVisitors = SystemDB.getVisitors().filter(
        v => (v.flat === user.flat || v.residentName === user.name) && v.status === 'Pending'
      );
      count += pendingVisitors.length;

      // Unpaid maintenance
      const unpaidBills = SystemDB.getMaintenance().filter(
        m => (m.flat === user.flat || m.residentName === user.name) && m.status === 'Unpaid'
      );
      count += unpaidBills.length;
    }

    // Pending registrations for admin
    if (user.role === 'Admin') {
      const pendingUsers = SystemDB.getUsers().filter(u => u.status === 'Pending');
      count += pendingUsers.length;
    }
  }

  // Active notices count
  const notices = SystemDB.getNotices ? SystemDB.getNotices() : [];
  count += Math.min(notices.length, 2);

  return count;
}

function toggleNotificationPanel(btnOrEvent) {
  let dropdown = document.getElementById('globalNotifDropdown');

  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'globalNotifDropdown';
    dropdown.className = 'notif-panel-dropdown';
    document.body.appendChild(dropdown);
  }

  const btn = (btnOrEvent && btnOrEvent.nodeType) ? btnOrEvent : (document.querySelector('.btn-nav-icon') || document.body);
  const rect = btn.getBoundingClientRect();

  dropdown.style.position = 'fixed';
  dropdown.style.top = (rect.bottom + 10) + 'px';
  dropdown.style.right = Math.max(16, (window.innerWidth - rect.right)) + 'px';
  dropdown.style.zIndex = '2100';

  if (dropdown.classList.contains('show')) {
    dropdown.classList.remove('show');
    return;
  }

  // Build Notification Content
  renderNotificationList(dropdown);
  dropdown.classList.add('show');
}

function renderNotificationList(dropdown) {
  if (typeof SystemDB === 'undefined') return;
  const user = SystemDB.getCurrentUser();
  const notices = SystemDB.getNotices ? SystemDB.getNotices() : [];
  const visitors = SystemDB.getVisitors ? SystemDB.getVisitors() : [];
  const bills = SystemDB.getMaintenance ? SystemDB.getMaintenance() : [];

  let itemsHTML = '';
  let notifCount = 0;

  // 1. Pending Gate Entry Requests (Resident)
  if (user && user.role === 'Resident') {
    const pendingVisitors = visitors.filter(v => (v.flat === user.flat || v.residentName === user.name) && v.status === 'Pending');
    pendingVisitors.forEach(v => {
      notifCount++;
      itemsHTML += `
        <div class="notif-item unread">
          <div class="notif-icon-box bg-warning bg-opacity-10 text-warning">
            <i class="fa-solid fa-shield-cat"></i>
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <strong class="small text-warning">Visitor Waiting at Gate</strong>
              <span class="caption-text text-muted" style="font-size:11px;">Gate Pass #${v.gatePassCode || '104'}</span>
            </div>
            <p class="mb-2 small" style="font-size:12.5px;">${v.name} (${v.purpose}) is waiting at ${v.gate || 'Gate 1'} for Flat ${v.flat}.</p>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-success rounded-pill px-2.5 py-1 text-white" style="font-size:11px;" onclick="handleNotifVisitor('${v.id}', 'Approved')">
                <i class="fa-solid fa-check me-1"></i> Approve
              </button>
              <button class="btn btn-sm btn-outline-danger rounded-pill px-2.5 py-1" style="font-size:11px;" onclick="handleNotifVisitor('${v.id}', 'Rejected')">
                <i class="fa-solid fa-xmark me-1"></i> Deny
              </button>
            </div>
          </div>
        </div>
      `;
    });

    // 2. Unpaid Maintenance Bills (Resident)
    const unpaidBills = bills.filter(m => (m.flat === user.flat || m.residentName === user.name) && m.status === 'Unpaid');
    unpaidBills.forEach(m => {
      notifCount++;
      itemsHTML += `
        <div class="notif-item unread">
          <div class="notif-icon-box bg-danger bg-opacity-10 text-danger">
            <i class="fa-solid fa-receipt"></i>
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <strong class="small text-danger">Pending Maintenance Bill</strong>
              <span class="caption-text text-muted" style="font-size:11px;">Due: ${m.dueDate}</span>
            </div>
            <p class="mb-1 small" style="font-size:12.5px;">July 2026 Society Dues: <strong>₹${m.amount.toLocaleString()}</strong></p>
            <a href="resident.html#bills" class="small text-warning fw-semibold text-decoration-none" style="font-size:11.5px;">Pay Bill Now →</a>
          </div>
        </div>
      `;
    });
  }

  // 3. Admin Pending Approvals
  if (user && user.role === 'Admin') {
    const pendingUsers = SystemDB.getUsers().filter(u => u.status === 'Pending');
    if (pendingUsers.length > 0) {
      notifCount += pendingUsers.length;
      itemsHTML += `
        <div class="notif-item unread">
          <div class="notif-icon-box bg-primary bg-opacity-10 text-primary">
            <i class="fa-solid fa-user-clock"></i>
          </div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <strong class="small text-primary">Pending Registration Requests</strong>
              <span class="badge bg-danger rounded-pill" style="font-size:10px;">${pendingUsers.length} Pending</span>
            </div>
            <p class="mb-1 small" style="font-size:12.5px;">New applicants are waiting for flat allotment & account approval.</p>
            <a href="admin.html" class="small text-warning fw-semibold text-decoration-none" style="font-size:11.5px;">Review Applicants →</a>
          </div>
        </div>
      `;
    }
  }

  // 4. Society Announcements & Notices
  notices.slice(0, 3).forEach(n => {
    itemsHTML += `
      <div class="notif-item">
        <div class="notif-icon-box bg-info bg-opacity-10 text-info">
          <i class="fa-solid fa-bullhorn"></i>
        </div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <strong class="small text-heading">${n.title || 'Society Announcement'}</strong>
            <span class="caption-text text-muted" style="font-size:10.5px;">${n.date || 'Today'}</span>
          </div>
          <p class="mb-0 text-muted small" style="font-size:12px;">${n.description || n.content || 'Important society update.'}</p>
        </div>
      </div>
    `;
  });

  if (!itemsHTML) {
    itemsHTML = `
      <div class="p-4 text-center text-muted">
        <i class="fa-solid fa-bell-slash fs-3 mb-2 d-block opacity-50"></i>
        <span class="small d-block">No unread notifications at this time.</span>
      </div>
    `;
  }

  dropdown.innerHTML = `
    <div class="notif-panel-header">
      <div class="d-flex align-items-center gap-2">
        <i class="fa-solid fa-bell text-warning"></i>
        <strong class="small mb-0">Society Notifications</strong>
        ${notifCount > 0 ? `<span class="badge bg-warning text-dark rounded-pill" style="font-size:10px;">${notifCount} New</span>` : ''}
      </div>
      <button class="btn btn-link btn-sm text-muted p-0 text-decoration-none caption-text" onclick="clearAllNotifications()">Mark Read</button>
    </div>
    <div class="notif-panel-body">
      ${itemsHTML}
    </div>
  `;
}

function handleNotifVisitor(id, status) {
  if (typeof SystemDB !== 'undefined' && SystemDB.updateVisitorStatus) {
    SystemDB.updateVisitorStatus(id, status);
  }
  updateNotificationBadge();
  const dropdown = document.getElementById('globalNotifDropdown');
  if (dropdown) renderNotificationList(dropdown);
  if (typeof loadResidentDashboard === 'function') loadResidentDashboard();
}

function clearAllNotifications() {
  const dots = document.querySelectorAll('.notif-dot');
  dots.forEach(dot => dot.style.display = 'none');
  const dropdown = document.getElementById('globalNotifDropdown');
  if (dropdown) dropdown.classList.remove('show');
}

function showToast(message, type = 'success') {
  let container = document.getElementById('globalToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'globalToastContainer';
    container.className = 'toast-container-custom';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-custom ${type}`;

  const iconClass = type === 'success' ? 'fa-circle-check text-success' :
                    type === 'error' ? 'fa-circle-xmark text-danger' :
                    type === 'warning' ? 'fa-triangle-exclamation text-warning' : 'fa-bell text-warning';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass} fs-5"></i>
    <div class="flex-grow-1">${message}</div>
    <button class="btn-close ms-2" style="font-size:10px;" onclick="this.parentElement.remove()"></button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'fadeOutRight 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

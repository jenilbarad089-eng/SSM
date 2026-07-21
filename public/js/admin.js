/**
 * Smart Society Management System - Admin Dashboard JS
 */

let billingChartInstance = null;
let complaintChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  await SystemDB.init();

  const currentUser = SystemDB.getCurrentUser();
  if (!currentUser || currentUser.role !== 'Admin') {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('adminName').textContent = currentUser.name;
  if (currentUser.avatar) {
    document.getElementById('adminAvatar').src = currentUser.avatar;
  }

  loadAdminDashboard();

  document.getElementById('changeRoleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('roleUserId').value;
    const newRole = document.getElementById('roleSelect').value;

    SystemDB.updateUserRole(id, newRole);
    const modalEl = document.getElementById('changeRoleModal');
    bootstrap.Modal.getInstance(modalEl).hide();
    loadAdminDashboard();
    alert(`Role updated to ${newRole}!`);
  });

  // Modal forms
  document.getElementById('addResidentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('resName').value;
    const flat = document.getElementById('resFlat').value;
    const phone = document.getElementById('resPhone').value;
    const email = document.getElementById('resEmail').value;

    SystemDB.addResident({ name, flat, phone, email });
    const modalEl = document.getElementById('addResidentModal');
    bootstrap.Modal.getInstance(modalEl).hide();
    document.getElementById('addResidentForm').reset();
    loadAdminDashboard();
  });

  document.getElementById('updateComplaintForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editCmpId').value;
    const status = document.getElementById('editCmpStatus').value;
    const notes = document.getElementById('editCmpNotes').value;

    SystemDB.updateComplaintStatus(id, status, notes);
    const modalEl = document.getElementById('updateComplaintModal');
    bootstrap.Modal.getInstance(modalEl).hide();
    loadAdminDashboard();
  });

  document.getElementById('addNoticeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('noticeTitle').value;
    const category = document.getElementById('noticeCategory').value;
    const content = document.getElementById('noticeContent').value;

    SystemDB.addNotice({ title, category, content });
    const modalEl = document.getElementById('addNoticeModal');
    bootstrap.Modal.getInstance(modalEl).hide();
    document.getElementById('addNoticeForm').reset();
    loadAdminDashboard();
  });
});

function loadAdminDashboard() {
  renderKPIs();
  renderCharts();
  renderResidentsTable();
  renderComplaintsTable();
  renderBillingTable();
  renderNotices();
  renderVisitorsTable();
  renderRoleSettingsTable();
  loadPendingApprovals();
}

function renderKPIs() {
  const residents = SystemDB.getResidents().filter(r => r.role === 'Resident');
  document.getElementById('kpiResidents').textContent = residents.length;

  const maintenance = SystemDB.getMaintenance();
  const julyBills = maintenance.filter(m => m.month.includes('July 2026'));
  const paidBills = julyBills.filter(m => m.status === 'Paid');
  const paidTotal = paidBills.reduce((acc, curr) => acc + curr.amount, 0);
  const rate = julyBills.length ? Math.round((paidBills.length / julyBills.length) * 100) : 0;

  document.getElementById('kpiCollection').textContent = `₹${paidTotal.toLocaleString()}`;
  document.getElementById('kpiCollectionRate').textContent = `${rate}% Collected (${paidBills.length}/${julyBills.length} Flatted)`;

  const complaints = SystemDB.getComplaints();
  const pending = complaints.filter(c => c.status === 'Pending' || c.status === 'In Progress');
  document.getElementById('kpiPendingComplaints').textContent = pending.length;

  const visitors = SystemDB.getVisitors();
  document.getElementById('kpiVisitors').textContent = visitors.length;
}

function renderCharts() {
  const maintenance = SystemDB.getMaintenance();
  const julyBills = maintenance.filter(m => m.month.includes('July 2026'));
  const paidSum = julyBills.filter(m => m.status === 'Paid').reduce((a, b) => a + b.amount, 0);
  const unpaidSum = julyBills.filter(m => m.status === 'Unpaid').reduce((a, b) => a + b.amount, 0);

  // Billing Bar Chart
  const ctxBilling = document.getElementById('billingChart').getContext('2d');
  if (billingChartInstance) billingChartInstance.destroy();

  billingChartInstance = new Chart(ctxBilling, {
    type: 'bar',
    data: {
      labels: ['Collected Amount', 'Pending Dues'],
      datasets: [{
        label: 'Maintenance (₹)',
        data: [paidSum, unpaidSum],
        backgroundColor: ['#10b981', '#ef4444'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });

  // Complaint Doughnut Chart
  const complaints = SystemDB.getComplaints();
  const pendingCount = complaints.filter(c => c.status === 'Pending').length;
  const progressCount = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedCount = complaints.filter(c => c.status === 'Resolved').length;

  const ctxCmp = document.getElementById('complaintChart').getContext('2d');
  if (complaintChartInstance) complaintChartInstance.destroy();

  complaintChartInstance = new Chart(ctxCmp, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'In Progress', 'Resolved'],
      datasets: [{
        data: [pendingCount, progressCount, resolvedCount],
        backgroundColor: ['#f59e0b', '#0ea5e9', '#10b981']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function renderResidentsTable() {
  const tbody = document.getElementById('residentsTableBody');
  const residents = SystemDB.getResidents();

  tbody.innerHTML = residents.map(r => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <img src="${r.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + r.name}" class="rounded-circle" width="32" height="32">
          <span class="fw-semibold">${r.name}</span>
        </div>
      </td>
      <td><span class="badge bg-light text-dark border">${r.flat}</span></td>
      <td class="text-muted fs-7">${r.email}</td>
      <td class="fs-7">${r.phone}</td>
      <td><span class="badge ${r.role === 'Admin' ? 'bg-danger-subtle text-danger' : 'bg-primary-subtle text-primary'}">${r.role}</span></td>
      <td class="text-end">
        ${r.role !== 'Admin' ? `
          <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteRes('${r.id}')" title="Delete Resident">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        ` : '<span class="text-muted small">System Admin</span>'}
      </td>
    </tr>
  `).join('');
}

function deleteRes(id) {
  if (confirm("Are you sure you want to remove this resident?")) {
    SystemDB.deleteResident(id);
    loadAdminDashboard();
  }
}

function renderComplaintsTable() {
  const tbody = document.getElementById('adminComplaintsTableBody');
  const complaints = SystemDB.getComplaints();

  tbody.innerHTML = complaints.map(c => `
    <tr>
      <td class="fw-bold fs-7">${c.id}</td>
      <td>
        <div class="fw-semibold">${c.residentName}</div>
        <small class="text-muted">Flat: ${c.flat}</small>
      </td>
      <td>
        <div class="fw-semibold">${c.title}</div>
        <small class="badge bg-light text-secondary border me-1">${c.category}</small>
        <small class="text-muted d-block mt-1">${c.description}</small>
      </td>
      <td>
        <span class="badge ${c.priority === 'High' ? 'bg-danger text-white' : 'bg-secondary-subtle text-dark'}">${c.priority}</span>
      </td>
      <td>
        <span class="${c.status === 'Pending' ? 'badge-pending' : c.status === 'In Progress' ? 'badge-progress' : 'badge-resolved'}">
          ${c.status}
        </span>
      </td>
      <td class="text-muted fs-7">${c.date}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="openUpdateCmpModal('${c.id}', '${c.title.replace(/'/g, "\\'")}', '${c.status}', '${(c.notes||'').replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-pen-to-square me-1"></i> Update
        </button>
      </td>
    </tr>
  `).join('');
}

function openUpdateCmpModal(id, title, status, notes) {
  document.getElementById('editCmpId').value = id;
  document.getElementById('editCmpTitle').value = `${id}: ${title}`;
  document.getElementById('editCmpStatus').value = status;
  document.getElementById('editCmpNotes').value = notes;
  new bootstrap.Modal(document.getElementById('updateComplaintModal')).show();
}

function renderBillingTable() {
  const tbody = document.getElementById('adminBillingTableBody');
  const maintenance = SystemDB.getMaintenance();

  tbody.innerHTML = maintenance.map(m => `
    <tr>
      <td class="fw-bold fs-7">${m.id}</td>
      <td>
        <div class="fw-semibold">${m.residentName}</div>
        <small class="text-muted">${m.flat}</small>
      </td>
      <td>${m.month}</td>
      <td class="fw-bold">₹${m.amount.toLocaleString()}</td>
      <td>
        <span class="${m.status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}">${m.status}</span>
      </td>
      <td class="text-muted fs-7">${m.paymentDate || '--'}</td>
      <td class="fs-7 text-primary">${m.receiptNo || '--'}</td>
    </tr>
  `).join('');
}

function renderNotices() {
  const container = document.getElementById('adminNoticesContainer');
  const notices = SystemDB.getNotices();

  container.innerHTML = notices.map(n => `
    <div class="col-md-6">
      <div class="card border-0 shadow-sm rounded-4 p-4 h-100 position-relative">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <span class="badge ${n.category === 'Emergency' ? 'bg-danger' : n.category === 'Meeting' ? 'bg-warning text-dark' : 'bg-primary'} px-3 py-2">
            ${n.category}
          </span>
          <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteNoticeItem('${n.id}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
        <h5 class="fw-bold text-dark mb-2">${n.title}</h5>
        <p class="text-muted fs-7 flex-grow-1">${n.content}</p>
        <div class="d-flex align-items-center justify-content-between pt-3 border-top mt-auto fs-8 text-muted">
          <span><i class="fa-solid fa-user me-1"></i> Posted by ${n.postedBy}</span>
          <span><i class="fa-solid fa-calendar me-1"></i> ${n.date}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function deleteNoticeItem(id) {
  if (confirm("Delete this notice announcement?")) {
    SystemDB.deleteNotice(id);
    loadAdminDashboard();
  }
}

function renderVisitorsTable() {
  const tbody = document.getElementById('adminVisitorsTableBody');
  const visitors = SystemDB.getVisitors();

  tbody.innerHTML = visitors.map(v => `
    <tr>
      <td><span class="badge bg-secondary text-white font-monospace">${v.gatePassCode}</span></td>
      <td>
        <div class="fw-semibold">${v.name}</div>
        <small class="text-muted">${v.phone}</small>
      </td>
      <td><span class="badge bg-light text-dark border">${v.flat}</span></td>
      <td class="fs-7">${v.purpose}</td>
      <td class="fs-7 text-muted">${v.entryTime}</td>
      <td class="fs-7 text-muted">${v.exitTime}</td>
      <td>
        <span class="badge ${v.status === 'Approved' ? 'bg-success' : v.status === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark'}">
          ${v.status}
        </span>
      </td>
    </tr>
  `).join('');
}

function renderRoleSettingsTable() {
  const tbody = document.getElementById('roleSettingsTableBody');
  if (!tbody) return;
  const users = SystemDB.data.users || [];

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <img src="${u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name}" class="rounded-circle" width="32" height="32">
          <span class="fw-semibold">${u.name}</span>
        </div>
      </td>
      <td class="fs-7 text-muted">${u.email}</td>
      <td><span class="badge bg-light text-dark border">${u.flat}</span></td>
      <td>
        <span class="badge ${u.role === 'Admin' ? 'bg-danger text-white' : u.role === 'Resident' ? 'bg-primary-subtle text-primary' : u.role === 'Security Guard' ? 'bg-warning text-dark' : 'bg-info-subtle text-info'}">
          ${u.role}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm ${u.role === 'Admin' ? 'btn-outline-danger' : 'btn-outline-success'} rounded-pill px-3 me-1" onclick="toggleAdminRole('${u.id}', '${u.role}')">
          <i class="fa-solid ${u.role === 'Admin' ? 'fa-user-minus' : 'fa-user-shield'} me-1"></i>
          ${u.role === 'Admin' ? 'Revoke Admin' : 'Grant Admin'}
        </button>
        <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="openChangeRoleModal('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.role}')">
          <i class="fa-solid fa-pen-to-square me-1"></i> Set Role
        </button>
      </td>
    </tr>
  `).join('');
}

function toggleAdminRole(userId, currentRole) {
  const newRole = currentRole === 'Admin' ? 'Resident' : 'Admin';
  if (confirm(`Are you sure you want to ${newRole === 'Admin' ? 'Grant Admin Rights to' : 'Remove Admin Rights from'} this user?`)) {
    SystemDB.updateUserRole(userId, newRole);
    loadAdminDashboard();
  }
}

function openChangeRoleModal(id, name, role) {
  document.getElementById('roleUserId').value = id;
  document.getElementById('roleUserName').value = name;
  document.getElementById('roleSelect').value = role;
  new bootstrap.Modal(document.getElementById('changeRoleModal')).show();
}

function logout() {
  SystemDB.logout();
  window.location.href = 'index.html';
}

// ─── Member Approval Center ─────────────────────────────────────

async function loadPendingApprovals() {
  const token = SystemDB.getToken();
  if (!token) return;

  try {
    const res = await fetch('/api/auth/pending', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success) {
      renderPendingResidents(data.users.filter(u => u.role === 'Resident'));
      renderPendingGuards(data.users.filter(u => u.role === 'Security Guard'));

      // Update badge
      const badge = document.getElementById('pendingCountBadge');
      if (badge) {
        const count = data.users.length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline' : 'none';
      }
    }
  } catch (err) {
    console.error('Failed to load pending approvals:', err);
  }

  // Also load all members
  loadAllMembers();
}

function renderPendingResidents(users) {
  const tbody = document.getElementById('pendingResidentsBody');
  const empty = document.getElementById('noPendingResidents');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <img src="${u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name}" class="rounded-circle" width="36" height="36">
          <div>
            <div class="fw-semibold">${u.name}</div>
            <small class="text-muted">${u.email}</small>
          </div>
        </div>
      </td>
      <td class="fs-7">${u.phone || '--'}</td>
      <td class="fs-7 text-muted">${u.registeredAt || '--'}</td>
      <td>
        ${u.aadhaar ? `<span class="badge bg-light text-dark border"><i class="fa-solid fa-id-card me-1"></i>${u.aadhaar}</span>` : '<span class="text-muted">None</span>'}
        ${u.familyMembers ? `<br><small class="text-muted">Family: ${u.familyMembers}</small>` : ''}
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-success rounded-pill px-3 me-1" onclick="openApproveModal('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.email}', '${u.role}', '${u.avatar || ''}')">
          <i class="fa-solid fa-check me-1"></i> Approve
        </button>
        <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="openRejectModal('${u.id}', '${u.name.replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-xmark me-1"></i> Reject
        </button>
      </td>
    </tr>
  `).join('');
}

function renderPendingGuards(users) {
  const tbody = document.getElementById('pendingGuardsBody');
  const empty = document.getElementById('noPendingGuards');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  tbody.innerHTML = users.map(u => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <img src="${u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name}" class="rounded-circle" width="36" height="36">
          <div>
            <div class="fw-semibold">${u.name}</div>
            <small class="text-muted">${u.email}</small>
          </div>
        </div>
      </td>
      <td class="fs-7">${u.phone || '--'}</td>
      <td class="fs-7">${u.employeeId || '--'}</td>
      <td class="fs-7 text-muted">${u.registeredAt || '--'}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-success rounded-pill px-3 me-1" onclick="openApproveModal('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.email}', '${u.role}', '${u.avatar || ''}')">
          <i class="fa-solid fa-check me-1"></i> Approve
        </button>
        <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="openRejectModal('${u.id}', '${u.name.replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-xmark me-1"></i> Reject
        </button>
      </td>
    </tr>
  `).join('');
}

function openApproveModal(userId, name, email, role, avatar) {
  document.getElementById('approveUserId').value = userId;
  document.getElementById('approveUserName').textContent = name;
  document.getElementById('approveUserEmail').textContent = email;
  document.getElementById('approveUserRole').textContent = role;
  document.getElementById('approveUserAvatar').src = avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + name;

  // Show/hide role-specific fields
  const isGuard = role === 'Security Guard';
  document.getElementById('residentAssignmentFields').classList.toggle('d-none', isGuard);
  document.getElementById('guardAssignmentFields').classList.toggle('d-none', !isGuard);

  new bootstrap.Modal(document.getElementById('approveMemberModal')).show();
}

function openRejectModal(userId, name) {
  document.getElementById('rejectUserId').value = userId;
  document.getElementById('rejectReason').value = '';
  new bootstrap.Modal(document.getElementById('rejectMemberModal')).show();
}

// Approve form handler
document.getElementById('approveMemberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = SystemDB.getToken();
  const userId = document.getElementById('approveUserId').value;
  const isGuard = document.getElementById('approveUserRole').textContent === 'Security Guard';

  const body = { userId };
  if (isGuard) {
    body.guardId = document.getElementById('approveGuardId').value;
    body.gateAssignment = document.getElementById('approveGate').value;
    body.shift = document.getElementById('approveShift').value;
    body.salary = document.getElementById('approveSalary').value;
    body.joiningDate = document.getElementById('approveJoiningDate').value;
  } else {
    body.tower = document.getElementById('approveTower').value;
    body.floor = document.getElementById('approveFloor').value;
    body.flat = document.getElementById('approveFlat').value;
    body.residentType = document.getElementById('approveResidentType').value;
    body.moveInDate = document.getElementById('approveMoveInDate').value;
    body.parkingSlot = document.getElementById('approveParking').value;
    body.rent = document.getElementById('approveRent').value;
    body.maintenanceAmount = document.getElementById('approveMaintenance').value;
    body.emergencyContact = document.getElementById('approveEmergency').value;
    body.vehicleNumbers = document.getElementById('approveVehicles').value;
    body.waterMeter = document.getElementById('approveWaterMeter').value;
    body.electricMeter = document.getElementById('approveElectricMeter').value;
  }
  body.notes = document.getElementById('approveNotes').value;

  try {
    const res = await fetch('/api/auth/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      bootstrap.Modal.getInstance(document.getElementById('approveMemberModal')).hide();
      alert('Member approved successfully!');
      loadPendingApprovals();
      loadAdminDashboard();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Server error. Please try again.');
  }
});

// Reject form handler
document.getElementById('rejectMemberForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const token = SystemDB.getToken();
  const userId = document.getElementById('rejectUserId').value;
  const reason = document.getElementById('rejectReason').value;

  try {
    const res = await fetch('/api/auth/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ userId, reason }),
    });
    const data = await res.json();
    if (data.success) {
      bootstrap.Modal.getInstance(document.getElementById('rejectMemberModal')).hide();
      alert('Member registration rejected.');
      loadPendingApprovals();
    } else {
      alert('Error: ' + data.message);
    }
  } catch (err) {
    alert('Server error. Please try again.');
  }
});

// Load all members
async function loadAllMembers() {
  const token = SystemDB.getToken();
  if (!token) return;

  try {
    const res = await fetch('/api/auth/all', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if (data.success) {
      renderAllMembers(data.users);
    }
  } catch (err) {
    console.error('Failed to load all members:', err);
  }
}

function renderAllMembers(users) {
  const tbody = document.getElementById('allMembersBody');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => {
    const statusBadge = u.status === 'Approved' ? 'bg-success' :
                        u.status === 'Pending' ? 'bg-warning text-dark' :
                        u.status === 'Rejected' ? 'bg-danger' : 'bg-secondary';
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${u.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name}" class="rounded-circle" width="32" height="32">
            <div>
              <div class="fw-semibold">${u.name}</div>
              <small class="text-muted">${u.email}</small>
            </div>
          </div>
        </td>
        <td><span class="badge ${u.role === 'Admin' ? 'bg-danger' : u.role === 'Resident' ? 'bg-primary' : u.role === 'Security Guard' ? 'bg-warning text-dark' : 'bg-info'}">${u.role}</span></td>
        <td class="fs-7">${u.flat || '--'}</td>
        <td><span class="badge ${statusBadge}">${u.status || 'Approved'}</span></td>
        <td class="fs-7 text-muted">${u.registeredAt || '--'}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-primary border-0 rounded-pill px-2" onclick="viewMemberDetails('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.email}', '${u.role}', '${u.flat || ''}', '${u.phone || ''}', '${u.status || 'Approved'}', '${u.registeredAt || ''}', '${u.approvedAt || ''}')" title="View Details">
            <i class="fa-solid fa-eye"></i>
          </button>
          ${u.status === 'Pending' ? `
            <button class="btn btn-sm btn-outline-success border-0 rounded-pill px-2" onclick="openApproveModal('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.email}', '${u.role}', '${u.avatar || ''}')" title="Approve">
              <i class="fa-solid fa-check"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger border-0 rounded-pill px-2" onclick="openRejectModal('${u.id}', '${u.name.replace(/'/g, "\\'")}')" title="Reject">
              <i class="fa-solid fa-xmark"></i>
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

function viewMemberDetails(id, name, email, role, flat, phone, status, registeredAt, approvedAt) {
  const body = document.getElementById('memberDetailsBody');
  body.innerHTML = `
    <div class="row g-3">
      <div class="col-6"><strong>Name:</strong> ${name}</div>
      <div class="col-6"><strong>Email:</strong> ${email}</div>
      <div class="col-6"><strong>Role:</strong> ${role}</div>
      <div class="col-6"><strong>Status:</strong> <span class="badge ${status === 'Approved' ? 'bg-success' : status === 'Pending' ? 'bg-warning text-dark' : 'bg-danger'}">${status}</span></div>
      <div class="col-6"><strong>Flat/Gate:</strong> ${flat || 'Not assigned'}</div>
      <div class="col-6"><strong>Phone:</strong> ${phone || '--'}</div>
      <div class="col-6"><strong>Registered:</strong> ${registeredAt || '--'}</div>
      <div class="col-6"><strong>Approved:</strong> ${approvedAt || '--'}</div>
    </div>
  `;
  new bootstrap.Modal(document.getElementById('memberDetailsModal')).show();
}

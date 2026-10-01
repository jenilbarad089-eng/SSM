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
  startRealtimeDashboard();

  document.getElementById('changeRoleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('roleUserId').value;
    const newRole = document.getElementById('roleSelect').value;

    SystemDB.updateUserRole(id, newRole);
    safeHideModal('changeRoleModal');
    loadAdminDashboard();
    if (typeof showToast === 'function') {
      showToast(`User role successfully updated to ${newRole}!`, "success");
    }
  });

  // Modal forms
  document.getElementById('addResidentForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('resName').value;
    const flat = document.getElementById('resFlat').value;
    const phone = document.getElementById('resPhone').value;
    const email = document.getElementById('resEmail').value;

    SystemDB.addResident({ name, flat, phone, email });
    safeHideModal('addResidentModal');
    document.getElementById('addResidentForm').reset();
    loadAdminDashboard();
    if (typeof showToast === 'function') {
      showToast(`Resident ${name} registered successfully!`, "success");
    }
  });

  // Admin Lodge Complaint on Behalf
  const adminLodgeForm = document.getElementById('adminLodgeComplaintForm');
  if (adminLodgeForm) {
    adminLodgeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const resVal = document.getElementById('adminLodgeResidentSelect').value;
      const [flat, residentName] = resVal.split('||');
      const category = document.getElementById('adminLodgeCategory').value;
      const priority = document.getElementById('adminLodgePriority').value;
      const title = document.getElementById('adminLodgeTitle').value;
      const description = document.getElementById('adminLodgeDesc').value;
      const assignedTo = document.getElementById('adminLodgeAssignedTo').value;
      const status = document.getElementById('adminLodgeStatus').value;
      const adminDirections = document.getElementById('adminLodgeDirections').value;

      const res = SystemDB.addComplaint({
        residentName: residentName || 'Resident',
        flat: flat || 'A-101',
        category,
        priority,
        title,
        description,
        assignedTo,
        status,
        adminDirections,
        notes: adminDirections || 'Admin registered ticket.'
      });

      safeHideModal('adminLodgeComplaintModal');
      adminLodgeForm.reset();
      loadAdminDashboard();
      if (typeof showToast === 'function') {
        showToast(`Complaint ${res.complaint ? res.complaint.id : ''} lodged successfully for Flat ${flat}!`, "success");
      }
    });
  }

  // Admin Update Complaint & Directives
  document.getElementById('updateComplaintForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editCmpId').value;
    const status = document.getElementById('editCmpStatus').value;
    const priority = document.getElementById('editCmpPriority').value;
    const assignedTo = document.getElementById('editCmpAssignedTo').value;
    const adminDirections = document.getElementById('editCmpDirections').value;

    SystemDB.updateComplaintStatus(id, {
      status,
      priority,
      assignedTo,
      adminDirections,
      notes: adminDirections || `Status changed to ${status}.`
    });

    safeHideModal('updateComplaintModal');
    loadAdminDashboard();
    if (typeof showToast === 'function') {
      showToast(`Complaint ${id} updated & directives issued to ${assignedTo}.`, "success");
    }
  });

  document.getElementById('addNoticeForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('noticeTitle').value;
    const category = document.getElementById('noticeCategory').value;
    const content = document.getElementById('noticeContent').value;

    SystemDB.addNotice({ title, category, content });
    safeHideModal('addNoticeModal');
    document.getElementById('addNoticeForm').reset();
    loadAdminDashboard();
    if (typeof showToast === 'function') {
      showToast("Society Announcement Notice published!", "success");
    }
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
  renderAuditLogs();
  loadPendingApprovals();
}

function renderKPIs() {
  const residents = SystemDB.getResidents().filter(r => r.role === 'Resident');
  document.getElementById('kpiResidents').textContent = residents.length;

  const maintenance = SystemDB.getMaintenance();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now = new Date();
  const currentMonthLabel = monthNames[now.getMonth()] + ' ' + now.getFullYear();
  const currentBills = maintenance.filter(m => m.month === currentMonthLabel);
  const paidBills = currentBills.filter(m => m.status === 'Paid');
  const paidTotal = paidBills.reduce((a, b) => a + b.amount, 0);
  const rate = currentBills.length ? Math.round((paidBills.length / currentBills.length) * 100) : 0;

  document.getElementById('kpiCollection').textContent = `₹${paidTotal.toLocaleString()}`;
  document.getElementById('kpiCollectionRate').textContent = `${rate}% Collected (${paidBills.length}/${currentBills.length} Flatted)`;

  const complaints = SystemDB.getComplaints();
  const pending = complaints.filter(c => c.status === 'Pending' || c.status === 'In Progress');
  document.getElementById('kpiPendingComplaints').textContent = pending.length;

  const visitors = SystemDB.getVisitors();
  document.getElementById('kpiVisitors').textContent = visitors.length;
}

function renderCharts() {
  const maint = SystemDB.getMaintenance();
  const complaints = SystemDB.getComplaints();

  // --- Multi-Month Revenue Trend Bar Chart ---
  const monthMap = { 'May 2026': 'May', 'June 2026': 'Jun', 'July 2026': 'Jul', 'August 2026': 'Aug', 'September 2026': 'Sep', 'October 2026': 'Oct' };
  const monthLabels = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const collected = monthLabels.map(() => 0);
  const outstanding = monthLabels.map(() => 0);

  maint.forEach(m => {
    const label = monthMap[m.month];
    const idx = monthLabels.indexOf(label);
    if (idx !== -1) {
      if (m.status === 'Paid') collected[idx] += m.amount;
      else outstanding[idx] += m.amount;
    }
  });

  const billingCtx = document.getElementById('billingChart');
  if (billingCtx) {
    if (billingChartInstance) billingChartInstance.destroy();
    billingChartInstance = new Chart(billingCtx.getContext('2d'), {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [
          { label: 'Collected (₹)', data: collected, backgroundColor: 'rgba(16,185,129,0.85)', borderRadius: 6 },
          { label: 'Outstanding (₹)', data: outstanding, backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 12 } } } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
          y: { ticks: { color: '#94a3b8', callback: v => '₹' + v.toLocaleString() }, grid: { color: 'rgba(148,163,184,0.1)' } }
        }
      }
    });
  }

  // --- Complaint Status Doughnut ---
  const pending = complaints.filter(c => c.status === 'Pending').length;
  const inProgress = complaints.filter(c => c.status === 'In Progress').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;

  const complaintCtx = document.getElementById('complaintChart');
  if (complaintCtx) {
    if (complaintChartInstance) complaintChartInstance.destroy();
    complaintChartInstance = new Chart(complaintCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'In Progress', 'Resolved'],
        datasets: [{
          data: [pending, inProgress, resolved],
          backgroundColor: ['#f59e0b', '#0ea5e9', '#10b981'],
          borderWidth: 0,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 13 }, padding: 16 } } }
      }
    });
  }
}

function renderResidentsTable() {
  const tbody = document.getElementById('residentsTableBody');
  if (!tbody) return;

  // Show ALL members, sorted: Admin → Committee → Resident → Security Guard
  const roleOrder = { 'Admin': 0, 'Committee Member': 1, 'Resident': 2, 'Security Guard': 3 };
  const allUsers = (SystemDB.data && SystemDB.data.users) ? [...SystemDB.data.users] : [];
  allUsers.sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));

  const roleBadgeClass = {
    'Admin': 'bg-danger text-white',
    'Committee Member': 'bg-info text-dark',
    'Resident': 'bg-primary text-white',
    'Security Guard': 'bg-warning text-dark'
  };

  tbody.innerHTML = allUsers.map(r => {
    const avatarUrl = getMemberAvatar(r);
    const badgeCls = roleBadgeClass[r.role] || 'bg-secondary text-white';

    // Role-specific detail line
    let detailLine = '';
    if (r.role === 'Resident') {
      detailLine = `
        <small class="text-muted d-block">
          ${r.residentType || 'Owner'} · ${r.tower || ''}
          ${r.parkingSlot ? `· <i class="fa-solid fa-square-parking text-primary"></i> ${r.parkingSlot}` : ''}
          ${r.familyCount ? `· <i class="fa-solid fa-users text-success"></i> ${r.familyCount}` : ''}
        </small>`;
    } else if (r.role === 'Security Guard') {
      detailLine = `<small class="text-muted d-block"><i class="fa-solid fa-clock me-1"></i>${r.shift || 'Morning Shift'} · ${r.gateAssigned || 'Gate 1'}</small>`;
    } else if (r.role === 'Committee Member') {
      detailLine = `<small class="text-muted d-block"><i class="fa-solid fa-star me-1 text-warning"></i>${r.designation || 'Managing Executive'}</small>`;
    } else if (r.role === 'Admin') {
      detailLine = `<small class="text-muted d-block"><i class="fa-solid fa-shield-halved me-1 text-danger"></i>${r.designation || 'Super Administrator'}</small>`;
    }

    return `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-3">
          <img src="${avatarUrl}" class="rounded-circle border border-2" width="40" height="40" alt="${r.name}" 
               style="object-fit:cover; flex-shrink:0;">
          <div>
            <div class="fw-bold text-heading">${r.name}</div>
            ${detailLine}
          </div>
        </div>
      </td>
      <td>
        <span class="badge bg-secondary bg-opacity-15 text-heading border" style="font-size:12px; padding:5px 10px;">
          <i class="fa-solid fa-building me-1"></i>${r.flat || r.gateAssigned || '—'}
        </span>
      </td>
      <td class="text-muted" style="font-size:13px; max-width:200px;">
        <a href="mailto:${r.email}" class="text-muted text-decoration-none">${r.email}</a>
      </td>
      <td style="font-size:13px;">
        ${r.phone ? `<a href="tel:${r.phone}" class="text-decoration-none text-heading">${r.phone}</a>` : '<span class="text-muted">—</span>'}
      </td>
      <td>
        <span class="badge ${badgeCls} px-3 py-1 rounded-pill">${r.role}</span>
      </td>
      <td>
        <span class="badge ${r.status === 'Approved' ? 'bg-success' : r.status === 'Pending' ? 'bg-warning text-dark' : 'bg-danger'} bg-opacity-15 
              text-${r.status === 'Approved' ? 'success' : r.status === 'Pending' ? 'warning' : 'danger'} border 
              border-${r.status === 'Approved' ? 'success' : r.status === 'Pending' ? 'warning' : 'danger'} border-opacity-25">
          ${r.status || 'Approved'}
        </span>
      </td>
      <td class="text-end">
        <div class="d-flex gap-1 justify-content-end">
          <button class="btn btn-sm btn-outline-info rounded-pill px-2" 
            onclick="openAllocateModal('${r.id}','${r.name.replace(/'/g,"\\'")}','${r.email}','${r.role}','${r.flat||''}')" 
            title="Allot Flat / Update Details">
            <i class="fa-solid fa-building-circle-check"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary rounded-pill px-2"
            onclick="openChangeRoleModal('${r.id}','${r.name.replace(/'/g,"\\'")}','${r.role}')"
            title="Change Role">
            <i class="fa-solid fa-user-gear"></i>
          </button>
          ${r.role !== 'Admin' ? `
          <button class="btn btn-sm btn-outline-danger rounded-pill px-2" 
            onclick="deleteRes('${r.id}')" title="Remove Member">
            <i class="fa-solid fa-trash-can"></i>
          </button>` : '<span class="text-muted small px-2">System&nbsp;Admin</span>'}
        </div>
      </td>
    </tr>`;
  }).join('');
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

  // Also populate resident select for the Lodge Complaint Modal
  const resSelect = document.getElementById('adminLodgeResidentSelect');
  if (resSelect) {
    const residents = SystemDB.getResidents ? SystemDB.getResidents().filter(r => r.role === 'Resident' && r.status === 'Approved') : [];
    if (residents.length) {
      resSelect.innerHTML = residents.map(r => 
        `<option value="${r.flat || 'A-101'}||${r.name}">${r.flat || 'Flat'} — ${r.name} (${r.tower || 'Tower A'})</option>`
      ).join('');
    } else {
      resSelect.innerHTML = `
        <option value="A-302||Amit Patel">A-302 — Amit Patel (Tower A)</option>
        <option value="C-501||Priya Verma">C-501 — Priya Verma (Tower C)</option>
        <option value="B-104||Rahul Sharma">B-104 — Rahul Sharma (Tower B)</option>
        <option value="B-202||Neha Gupta">B-202 — Neha Gupta (Tower B)</option>
        <option value="A-604||Ananya Deshmukh">A-604 — Ananya Deshmukh (Tower A)</option>
      `;
    }
  }

  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No complaint tickets logged.</td></tr>`;
    return;
  }

  tbody.innerHTML = complaints.map(c => {
    const assigned = c.assignedTo || 'Maintenance Desk';
    const directive = c.adminDirections || c.notes || 'No active directive issued.';
    const isEmergency = c.priority === 'Emergency' || c.priority === 'High';
    
    return `
    <tr>
      <td class="fw-bold fs-7">${c.id}</td>
      <td>
        <div class="fw-semibold">${c.residentName}</div>
        <small class="badge bg-primary-subtle text-primary border-0">Flat ${c.flat}</small>
      </td>
      <td>
        <div class="fw-semibold">${c.title}</div>
        <small class="badge bg-light text-secondary border me-1">${c.category}</small>
        <small class="text-muted d-block mt-1">${c.description}</small>
      </td>
      <td>
        <span class="badge ${isEmergency ? 'bg-danger text-white' : c.priority === 'Medium' ? 'bg-warning text-dark' : 'bg-secondary-subtle text-dark'}">
          <i class="fa-solid ${isEmergency ? 'fa-triangle-exclamation' : 'fa-circle-info'} me-1"></i>${c.priority || 'Medium'}
        </span>
      </td>
      <td>
        <span class="${c.status === 'Pending' ? 'badge-pending' : c.status === 'In Progress' ? 'badge-progress' : c.status === 'Resolved' ? 'badge-resolved' : 'badge bg-secondary text-white'}">
          ${c.status === 'In Progress' ? '<i class="fa-solid fa-spinner fa-spin me-1"></i>' : c.status === 'Resolved' ? '<i class="fa-solid fa-circle-check me-1"></i>' : ''}${c.status}
        </span>
      </td>
      <td>
        <div class="d-flex flex-column gap-1" style="max-width: 240px;">
          <span class="badge bg-info-subtle text-info text-start text-truncate" title="${assigned}">
            <i class="fa-solid fa-user-gear me-1"></i>${assigned}
          </span>
          <small class="text-muted fs-8 fst-italic text-truncate" title="${directive}">
            "${directive}"
          </small>
        </div>
      </td>
      <td class="text-muted fs-8">${c.date}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-warning rounded-pill px-3" onclick="openUpdateCmpModal('${c.id}')">
          <i class="fa-solid fa-pen-to-square me-1"></i> Direct
        </button>
      </td>
    </tr>`;
  }).join('');
}

function openUpdateCmpModal(id) {
  const complaints = SystemDB.getComplaints();
  const c = complaints.find(item => item.id === id);
  if (!c) return;

  document.getElementById('editCmpId').value = c.id;
  document.getElementById('editCmpTitle').value = `${c.id}: ${c.title} (${c.residentName} - Flat ${c.flat})`;
  document.getElementById('editCmpStatus').value = c.status || 'Pending';
  document.getElementById('editCmpPriority').value = c.priority || 'Medium';
  document.getElementById('editCmpAssignedTo').value = c.assignedTo || 'Maintenance Desk';
  document.getElementById('editCmpDirections').value = c.adminDirections || c.notes || '';
  
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

  const roleOrder = { 'Admin': 0, 'Committee Member': 1, 'Resident': 2, 'Security Guard': 3 };
  const users = [...(SystemDB.data.users || [])];
  users.sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));

  const roleBadge = {
    'Admin': 'bg-danger text-white',
    'Resident': 'bg-primary text-white',
    'Security Guard': 'bg-warning text-dark',
    'Committee Member': 'bg-info text-dark'
  };

  tbody.innerHTML = users.map(u => {
    const avatarUrl = getMemberAvatar(u);
    const badge = roleBadge[u.role] || 'bg-secondary text-white';

    const detailInfo = u.role === 'Security Guard'
      ? `<small class="d-block text-muted"><i class="fa-solid fa-clock me-1"></i>${u.shift || 'Morning Shift'}</small>
         <small class="d-block text-muted"><i class="fa-solid fa-door-open me-1"></i>${u.gateAssigned || 'Gate 1'} · ${u.empId || '—'}</small>`
      : u.role === 'Resident'
      ? `<small class="d-block text-muted">${u.residentType || 'Owner'} · ${u.tower || 'Tower A'}
         ${u.familyCount ? `· <i class="fa-solid fa-users"></i> ${u.familyCount}` : ''}</small>
         <small class="d-block text-muted">Move-in: ${u.moveInDate || '—'}</small>`
      : u.role === 'Committee Member'
      ? `<small class="d-block text-muted"><i class="fa-solid fa-star me-1 text-warning"></i>${u.designation || 'Managing Executive'}</small>`
      : `<small class="d-block text-muted"><i class="fa-solid fa-shield-halved me-1 text-danger"></i>${u.designation || 'Super Administrator'}</small>`;

    const duesOrSalary = u.role === 'Security Guard'
      ? `<span class="fw-bold text-success">${u.salary || '₹18,000/month'}</span><small class="d-block text-muted">Monthly Salary</small>`
      : u.role === 'Resident'
      ? `<span class="fw-bold text-warning">${u.maintenanceDues || '₹3,500/month'}</span><small class="d-block text-muted">Maintenance</small>`
      : u.role === 'Committee Member'
      ? `<span class="badge bg-success bg-opacity-15 text-success border border-success border-opacity-25">Society Service</span>`
      : `<span class="badge bg-danger bg-opacity-15 text-danger border border-danger border-opacity-25">Full Access</span>`;

    const flatOrGate = u.flat || u.gateAssigned || '—';
    const parking = u.parkingSlot || (u.role === 'Security Guard' ? u.gateAssigned : '—');

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-3">
            <img src="${avatarUrl}" class="rounded-circle border border-2" width="42" height="42" alt="${u.name}" style="object-fit:cover;flex-shrink:0;">
            <div>
              <div class="fw-bold text-heading">${u.name}</div>
              <small class="text-muted d-block" style="font-size:12px;">${u.email}</small>
              ${u.phone ? `<small class="text-muted" style="font-size:11px;"><i class="fa-solid fa-phone me-1"></i>${u.phone}</small>` : ''}
            </div>
          </div>
        </td>
        <td><span class="badge ${badge} px-3 py-1 rounded-pill" style="font-size:12px;">${u.role}</span></td>
        <td>
          <span class="badge bg-secondary bg-opacity-15 text-heading border" style="font-size:12px; padding:5px 10px;">
            <i class="fa-solid fa-building me-1"></i>${flatOrGate}
          </span>
          ${u.tower ? `<small class="d-block text-muted mt-1">${u.tower}</small>` : ''}
        </td>
        <td>${detailInfo}</td>
        <td>${duesOrSalary}</td>
        <td>
          <span class="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">
            ${parking}
          </span>
        </td>
        <td class="text-end">
          <div class="d-flex gap-1 justify-content-end flex-wrap">
            <button class="btn btn-sm ${u.role === 'Admin' ? 'btn-outline-danger' : 'btn-outline-success'} rounded-pill"
              onclick="toggleAdminRole('${u.id}', '${u.role}')"
              title="${u.role === 'Admin' ? 'Revoke Admin' : 'Grant Admin'}">
              <i class="fa-solid ${u.role === 'Admin' ? 'fa-user-minus' : 'fa-user-shield'} me-1"></i>
              ${u.role === 'Admin' ? 'Revoke' : 'Grant Admin'}
            </button>
            <button class="btn btn-sm btn-outline-primary rounded-pill"
              onclick="openChangeRoleModal('${u.id}', '${u.name.replace(/'/g,"\\'")}', '${u.role}')"
              title="Change Role">
              <i class="fa-solid fa-pen-to-square me-1"></i> Role
            </button>
            <button class="btn btn-sm btn-outline-info rounded-pill"
              onclick="openAllocateModal('${u.id}', '${u.name.replace(/'/g,"\\'")}', '${u.email}', '${u.role}', '${u.flat || ''}')"
              title="Allot Flat & Dues">
              <i class="fa-solid fa-building-circle-check me-1"></i> Allot
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
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
      safeHideModal('approveMemberModal');
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
      safeHideModal('rejectMemberModal');
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

function getMemberAvatar(user) {
  if (user.avatar && (user.avatar.includes('gender=male') || user.avatar.includes('gender=female'))) {
    return user.avatar;
  }
  const name = user.name || '';
  const isFemale = /(Priya|Neha|Kavya|Ananya|Sneha|Pooja|Ritu|Anita|Sunita|Simran|Aarti|Mrs|Ms|Girl|Female)/i.test(name);
  const gender = isFemale ? 'female' : 'male';
  const seed = name.split(' ')[0] || 'User';
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&gender=${gender}`;
}

function renderAllMembers(users) {
  const tbody = document.getElementById('allMembersBody');
  if (!tbody) return;

  tbody.innerHTML = users.map(u => {
    const statusBadge = u.status === 'Approved' ? 'bg-success' :
                        u.status === 'Pending' ? 'bg-warning text-dark' :
                        u.status === 'Rejected' ? 'bg-danger' : 'bg-secondary';
    const avatarUrl = getMemberAvatar(u);
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <img src="${avatarUrl}" class="rounded-circle border" width="36" height="36" alt="${u.name}">
            <div>
              <div class="fw-semibold text-heading">${u.name}</div>
              <small class="text-muted">${u.email}</small>
            </div>
          </div>
        </td>
        <td><span class="badge ${u.role === 'Admin' ? 'bg-danger' : u.role === 'Resident' ? 'bg-primary' : u.role === 'Security Guard' ? 'bg-warning text-dark' : 'bg-info'}">${u.role}</span></td>
        <td class="fs-7">${u.flat || '--'}</td>
        <td><span class="badge ${statusBadge}">${u.status || 'Approved'}</span></td>
        <td class="fs-7 text-muted">${u.registeredAt || '--'}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-info border-0 rounded-pill px-2" onclick="openAllocateModal('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.email}', '${u.role}', '${u.flat || ''}')" title="Allot Flat Details">
            <i class="fa-solid fa-building-circle-check"></i>
          </button>
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

function openAllocateModal(userId, name, email, role, flat) {
  document.getElementById('allocUserId').value = userId;
  document.getElementById('allocUserName').value = `${name} (${email})`;
  document.getElementById('allocRole').value = role || 'Resident';
  document.getElementById('allocFlat').value = flat || '';
  document.getElementById('allocTower').value = 'Tower A';
  document.getElementById('allocFloor').value = '3rd Floor';
  document.getElementById('allocMaintenance').value = 3500;
  document.getElementById('allocParking').value = 'P-' + Math.floor(10 + Math.random() * 80);

  const modalEl = document.getElementById('allocateFlatModal');
  if (modalEl) {
    new bootstrap.Modal(modalEl).show();
  }
}

// Allocate Flat Form Submit
const allocForm = document.getElementById('allocateFlatForm');
if (allocForm) {
  allocForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userId = document.getElementById('allocUserId').value;
    const allocData = {
      role: document.getElementById('allocRole').value,
      tower: document.getElementById('allocTower').value,
      floor: document.getElementById('allocFloor').value,
      flat: document.getElementById('allocFlat').value,
      type: document.getElementById('allocType').value,
      maintenance: document.getElementById('allocMaintenance').value,
      parking: document.getElementById('allocParking').value
    };

    SystemDB.updateUserAllocation(userId, allocData);
    const modalEl = document.getElementById('allocateFlatModal');
    if (modalEl && bootstrap.Modal.getInstance(modalEl)) {
      bootstrap.Modal.getInstance(modalEl).hide();
    }
    alert(`Flat ${allocData.flat} allotted to user and account approved successfully!`);
    loadAdminDashboard();
    loadAllMembers();
  });
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

function renderAuditLogs() {
  const tbody = document.getElementById('auditLogsTableBody');
  if (!tbody) return;
  const logs = SystemDB.getAuditLogs();

  tbody.innerHTML = logs.map(l => `
    <tr>
      <td class="fw-bold fs-7 font-monospace">${l.id}</td>
      <td class="fs-7 text-muted">${l.timestamp}</td>
      <td>
        <div class="fw-semibold text-heading">${l.user}</div>
        <small class="badge bg-secondary bg-opacity-25 text-heading border" style="font-size:10px;">${l.role}</small>
      </td>
      <td><span class="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25">${l.action}</span></td>
      <td><span class="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25">${l.module}</span></td>
      <td class="fs-7 text-secondary">${l.details}</td>
    </tr>
  `).join('');
}

function exportAuditLogsCSV() {
  const logs = SystemDB.getAuditLogs();
  if (!logs || !logs.length) {
    if (typeof showToast === 'function') showToast("No audit logs available for export.", "warning");
    return;
  }
  SystemDB.exportToCSV('SocietyHub_AuditLogs_' + new Date().toISOString().slice(0,10) + '.csv', logs);
  if (typeof showToast === 'function') showToast("Audit logs exported to CSV successfully!", "success");
}

function safeHideModal(modalOrId) {
  const el = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
  if (!el || typeof bootstrap === 'undefined') return;
  const inst = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
  if (inst) inst.hide();
}

// ===== REALTIME DASHBOARD ENGINE =====

let dashboardRefreshInterval = null;
let lastRefreshTime = Date.now();

function startRealtimeDashboard() {
  // Refresh every 30 seconds
  if (dashboardRefreshInterval) clearInterval(dashboardRefreshInterval);
  dashboardRefreshInterval = setInterval(() => {
    silentDashboardRefresh();
  }, 30000);

  // Update timestamp every second
  setInterval(updateLastRefreshTimestamp, 1000);

  // Initial activity feed
  renderActivityFeed();
}

function silentDashboardRefresh() {
  // Re-read data from SystemDB (picks up any localStorage changes)
  try {
    renderKPIs();
    renderCharts();
    renderActivityFeed();
    lastRefreshTime = Date.now();
  } catch(e) {
    console.warn('Dashboard refresh error:', e);
  }
}

function refreshDashboardNow() {
  // Animate refresh
  const btn = event && event.currentTarget;
  if (btn) {
    const icon = btn.querySelector('i');
    if (icon) icon.classList.add('fa-spin');
    setTimeout(() => { if (icon) icon.classList.remove('fa-spin'); }, 1000);
  }

  loadAdminDashboard();
  renderActivityFeed();
  lastRefreshTime = Date.now();
  updateLastRefreshTimestamp();
}

function updateLastRefreshTimestamp() {
  const el = document.getElementById('adminLastUpdated');
  if (!el) return;
  const seconds = Math.floor((Date.now() - lastRefreshTime) / 1000);
  if (seconds < 5) el.textContent = 'Updated just now';
  else if (seconds < 60) el.textContent = `Updated ${seconds}s ago`;
  else el.textContent = `Updated ${Math.floor(seconds / 60)}m ago`;
}

function animateValue(elementId, newValue) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.classList.add('metric-animate', 'updating');
  setTimeout(() => {
    el.classList.remove('updating');
  }, 300);
}

function renderActivityFeed() {
  const container = document.getElementById('adminActivityFeed');
  if (!container) return;

  const activities = [];

  // Recent complaints
  const complaints = SystemDB.getComplaints();
  complaints.slice(0, 3).forEach(c => {
    activities.push({
      icon: 'fa-triangle-exclamation',
      iconBg: c.status === 'Resolved' ? 'bg-success' : c.status === 'In Progress' ? 'bg-info' : 'bg-warning',
      title: c.title,
      detail: `${c.residentName} (${c.flat}) — ${c.status}`,
      time: c.date,
      sort: c.date
    });
  });

  // Recent maintenance payments
  const maintenance = SystemDB.getMaintenance();
  maintenance.filter(m => m.status === 'Paid').slice(0, 3).forEach(m => {
    activities.push({
      icon: 'fa-indian-rupee-sign',
      iconBg: 'bg-success',
      title: `₹${m.amount.toLocaleString()} collected — ${m.month}`,
      detail: `${m.residentName} (${m.flat}) via ${m.txnId || 'Online'}`,
      time: m.paymentDate || m.dueDate,
      sort: m.paymentDate || m.dueDate
    });
  });

  // Recent visitors
  const visitors = SystemDB.getVisitors();
  visitors.slice(0, 3).forEach(v => {
    activities.push({
      icon: 'fa-person-walking',
      iconBg: v.status === 'Approved' ? 'bg-primary' : 'bg-warning',
      title: `${v.name} — ${v.purpose}`,
      detail: `Flat ${v.flat} (${v.residentName}) — ${v.status}`,
      time: v.entryTime ? v.entryTime.split(' ')[0] : '',
      sort: v.entryTime ? v.entryTime.split(' ')[0] : ''
    });
  });

  // Recent notices
  const notices = SystemDB.getNotices();
  notices.slice(0, 2).forEach(n => {
    activities.push({
      icon: 'fa-bullhorn',
      iconBg: 'bg-info',
      title: n.title,
      detail: `Published by ${n.postedBy}`,
      time: n.date,
      sort: n.date
    });
  });

  // Sort by date descending
  activities.sort((a, b) => (b.sort || '').localeCompare(a.sort || ''));

  if (!activities.length) {
    container.innerHTML = '<div class="text-center text-muted py-3">No recent activity</div>';
    return;
  }

  container.innerHTML = activities.slice(0, 10).map(a => `
    <div class="activity-item">
      <div class="activity-icon ${a.iconBg} bg-opacity-10">
        <i class="fa-solid ${a.icon} ${a.iconBg.replace('bg-', 'text-')}"></i>
      </div>
      <div class="flex-grow-1">
        <div class="fw-semibold fs-7 text-heading">${a.title}</div>
        <div class="text-muted fs-8">${a.detail}</div>
      </div>
      <small class="text-muted fs-8 flex-shrink-0">${a.time}</small>
    </div>
  `).join('');
}

// Instant Multi-Tab Realtime Sync
window.addEventListener('storage', (e) => {
  if (e.key === 'ssm_database_v1') {
    try {
      SystemDB.init().then(() => {
        silentDashboardRefresh();
      });
    } catch(err) {
      console.warn('Storage sync error:', err);
    }
  }
});

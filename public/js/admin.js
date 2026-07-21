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

function logout() {
  SystemDB.logout();
  window.location.href = 'index.html';
}

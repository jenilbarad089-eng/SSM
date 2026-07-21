/**
 * Smart Society Management System - Committee Governance JS
 */

let finChartInstance = null;
let priorityChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  await SystemDB.init();

  const currentUser = SystemDB.getCurrentUser();
  if (!currentUser || (currentUser.role !== 'Committee Member' && currentUser.role !== 'Admin')) {
    window.location.href = 'index.html';
    return;
  }
  // Check approval status
  if (currentUser.status && currentUser.status !== 'Approved') {
    window.location.href = 'waiting-approval.html';
    return;
  }

  document.getElementById('commName').textContent = currentUser.name;

  loadCommitteeDashboard();
});

function loadCommitteeDashboard() {
  const maintenance = SystemDB.getMaintenance();
  const bookings = SystemDB.getBookings();
  const complaints = SystemDB.getComplaints();

  // KPIs
  const paidMaint = maintenance.filter(m => m.status === 'Paid').reduce((a, b) => a + b.amount, 0);
  const paidBookings = bookings.filter(b => b.status === 'Confirmed').reduce((a, b) => a + b.amount, 0);
  const totalRev = paidMaint + paidBookings;

  const unpaidDues = maintenance.filter(m => m.status === 'Unpaid').reduce((a, b) => a + b.amount, 0);

  const resolvedCmp = complaints.filter(c => c.status === 'Resolved').length;
  const resRate = complaints.length ? Math.round((resolvedCmp / complaints.length) * 100) : 0;

  document.getElementById('commTotalRev').textContent = `₹${totalRev.toLocaleString()}`;
  document.getElementById('commPendingDues').textContent = `₹${unpaidDues.toLocaleString()}`;
  document.getElementById('commResolutionRate').textContent = `${resRate}%`;
  document.getElementById('commAmenityRev').textContent = `₹${paidBookings.toLocaleString()}`;

  // Charts
  renderFinChart(paidMaint, paidBookings, unpaidDues);
  renderPriorityChart(complaints);

  // Audit Table
  renderAuditTable(maintenance, bookings);
}

function renderFinChart(maint, amenity, pending) {
  const ctx = document.getElementById('commFinChart').getContext('2d');
  if (finChartInstance) finChartInstance.destroy();

  finChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Maintenance Collections', 'Amenity Bookings', 'Pending Dues'],
      datasets: [{
        label: 'Financial Audit (₹)',
        data: [maint, amenity, pending],
        backgroundColor: ['#10b981', '#0ea5e9', '#ef4444'],
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function renderPriorityChart(complaints) {
  const high = complaints.filter(c => c.priority === 'High').length;
  const med = complaints.filter(c => c.priority === 'Medium').length;
  const low = complaints.filter(c => c.priority === 'Low').length;

  const ctx = document.getElementById('commPriorityChart').getContext('2d');
  if (priorityChartInstance) priorityChartInstance.destroy();

  priorityChartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['High Priority', 'Medium Priority', 'Low Priority'],
      datasets: [{
        data: [high, med, low],
        backgroundColor: ['#ef4444', '#f59e0b', '#64748b']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function renderAuditTable(maintenance, bookings) {
  const tbody = document.getElementById('commAuditTableBody');

  const combined = [
    ...maintenance.map(m => ({
      id: m.id,
      source: `${m.residentName} (${m.flat})`,
      type: 'Maintenance Bill',
      date: m.paymentDate || m.dueDate,
      value: `₹${m.amount.toLocaleString()}`,
      status: m.status
    })),
    ...bookings.map(b => ({
      id: b.id,
      source: `${b.residentName} (${b.flat})`,
      type: `Amenity: ${b.amenityName}`,
      date: b.date,
      value: `₹${b.amount.toLocaleString()}`,
      status: b.status
    }))
  ];

  tbody.innerHTML = combined.map(item => `
    <tr>
      <td class="fw-bold fs-7">${item.id}</td>
      <td class="fw-semibold">${item.source}</td>
      <td><span class="badge bg-light text-dark border">${item.type}</span></td>
      <td class="text-muted fs-7">${item.date}</td>
      <td class="fw-bold">${item.value}</td>
      <td><span class="badge ${item.status === 'Paid' || item.status === 'Confirmed' ? 'bg-success' : 'bg-warning text-dark'}">${item.status}</span></td>
    </tr>
  `).join('');
}

function logout() {
  SystemDB.logout();
  window.location.href = 'index.html';
}

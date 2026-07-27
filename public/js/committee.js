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

  // Poll creation form submit
  const pollForm = document.getElementById('createPollForm');
  if (pollForm) {
    pollForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('pollTitle').value;
      const category = document.getElementById('pollCategory').value;
      const endDate = document.getElementById('pollEndDate').value;
      const description = document.getElementById('pollDesc').value;
      const rawOptions = document.getElementById('pollOptionsInput').value;

      const options = rawOptions.split(',').map(o => o.trim()).filter(o => o.length > 0);
      if (!options.length) {
        if (typeof showToast === 'function') showToast("Please provide at least one valid voting option.", "error");
        return;
      }

      const res = SystemDB.addPoll({ title, category, endDate, description, options });
      if (res.success) {
        const modalEl = document.getElementById('createPollModal');
        if (modalEl && bootstrap.Modal.getInstance(modalEl)) {
          bootstrap.Modal.getInstance(modalEl).hide();
        }
        pollForm.reset();
        loadCommitteeDashboard();
        if (typeof showToast === 'function') showToast("Society Voting Poll published successfully!", "success");
      }
    });
  }

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

  // Polls & Audit Table
  renderCommitteePolls();
  renderAuditTable(maintenance, bookings);
}

function renderCommitteePolls() {
  const container = document.getElementById('commPollsContainer');
  if (!container) return;
  const polls = SystemDB.getPolls();

  if (!polls || !polls.length) {
    container.innerHTML = `
      <div class="col-12 text-center text-muted py-4">
        <i class="fa-solid fa-square-poll-vertical fs-2 mb-2 d-block opacity-50"></i>
        <span>No active polls published yet. Click "Create New Poll" to start voting.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = polls.map(p => {
    const total = p.totalVotes || 1;
    const optionsHTML = p.options.map(o => {
      const pct = Math.round((o.votes / total) * 100);
      return `
        <div class="mb-3">
          <div class="d-flex justify-content-between align-items-center mb-1 fs-7">
            <span class="fw-semibold text-heading">${o.text}</span>
            <span class="text-warning fw-bold">${o.votes} votes (${pct}%)</span>
          </div>
          <div class="progress rounded-pill bg-secondary bg-opacity-25" style="height: 10px;">
            <div class="progress-bar bg-warning" role="progressbar" style="width: ${pct}%"></div>
          </div>
          <button class="btn btn-sm btn-outline-warning rounded-pill mt-2 py-1 px-3 fs-8" onclick="castPollVote('${p.id}', '${o.id}')">
            <i class="fa-solid fa-check me-1"></i> Vote for "${o.text}"
          </button>
        </div>
      `;
    }).join('');

    return `
      <div class="col-md-6">
        <div class="hub-card p-4 h-100 border">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <span class="badge bg-warning text-dark px-3 py-1.5 rounded-pill">${p.category}</span>
            <small class="text-muted"><i class="fa-solid fa-clock me-1"></i> Ends: ${p.endDate}</small>
          </div>
          <h5 class="fw-bold text-heading mb-2">${p.title}</h5>
          <p class="text-muted fs-7 mb-3">${p.description}</p>
          <div class="p-3 rounded-3 bg-secondary bg-opacity-10 mb-3">
            ${optionsHTML}
          </div>
          <div class="d-flex align-items-center justify-content-between fs-8 text-muted pt-2 border-top">
            <span><i class="fa-solid fa-user-pen me-1"></i> ${p.createdBy}</span>
            <span class="fw-semibold text-warning"><i class="fa-solid fa-users me-1"></i> Total Votes: ${p.totalVotes}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function castPollVote(pollId, optionId) {
  const res = SystemDB.votePoll(pollId, optionId);
  if (res.success) {
    if (typeof showToast === 'function') showToast("Your vote has been cast and logged!", "success");
    renderCommitteePolls();
  }
}

function logout() {
  SystemDB.logout();
  window.location.href = 'index.html';
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

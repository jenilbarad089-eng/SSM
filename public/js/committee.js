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
  startCommitteeRealtime();
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

  document.getElementById('commTotalColl').textContent = `₹${totalRev.toLocaleString()}`;
  document.getElementById('commDues').textContent = `₹${unpaidDues.toLocaleString()}`;
  document.getElementById('commResolutionRate').textContent = `${resRate}%`;
  const residentsCount = SystemDB.getUsers ? SystemDB.getUsers().filter(u => u.role === 'Resident' && u.status === 'Approved').length : 0;
  document.getElementById('commResidentsCount').textContent = residentsCount;

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
  const ctx = document.getElementById('committeeRevenueChart').getContext('2d');
  if (finChartInstance) finChartInstance.destroy();

  // Build monthly trend from maintenance data
  const maintenance = SystemDB.getMaintenance();
  const months = ['May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026'];
  const monthLabels = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const monthMap = { 'May 2026': 'May', 'June 2026': 'Jun', 'July 2026': 'Jul', 'August 2026': 'Aug', 'September 2026': 'Sep', 'October 2026': 'Oct' };

  const revenue = monthLabels.map(() => 0);
  const dues = monthLabels.map(() => 0);

  maintenance.forEach(m => {
    const label = monthMap[m.month];
    const idx = monthLabels.indexOf(label);
    if (idx !== -1) {
      if (m.status === 'Paid') revenue[idx] += m.amount;
      else dues[idx] += m.amount;
    }
  });

  finChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: 'Collections (₹)',
          data: revenue,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderRadius: 6
        },
        {
          label: 'Outstanding (₹)',
          data: dues,
          backgroundColor: 'rgba(239, 68, 68, 0.85)',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 12 } } }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8', callback: v => '₹' + v.toLocaleString() }, grid: { color: 'rgba(148,163,184,0.1)' } }
      }
    }
  });
}

function renderPriorityChart(complaints) {
  const maintenance = SystemDB.getMaintenance();
  const paid = maintenance.filter(m => m.status === 'Paid').length;
  const unpaid = maintenance.filter(m => m.status === 'Unpaid').length;

  const ctx = document.getElementById('committeeRatioChart').getContext('2d');
  if (priorityChartInstance) priorityChartInstance.destroy();

  priorityChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Paid', 'Unpaid'],
      datasets: [{
        data: [paid, unpaid],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 13 }, padding: 16 } }
      }
    }
  });
}

function renderAuditTable(maintenance, bookings) {
  const tbody = document.getElementById('commAuditTableBody');

  const combined = [
    ...maintenance.map(m => ({
      id: m.id,
      source: `${m.residentName} (${m.flat})`,
      month: m.month || '—',
      value: `₹${m.amount.toLocaleString()}`,
      status: m.status,
      receipt: m.receiptNo || '—'
    })),
    ...bookings.map(b => ({
      id: b.id,
      source: `${b.residentName} (${b.flat})`,
      month: `Amenity: ${b.amenityName}`,
      value: `₹${b.amount.toLocaleString()}`,
      status: b.status,
      receipt: b.date || '—'
    }))
  ];

  tbody.innerHTML = combined.map(item => `
    <tr>
      <td class="fw-bold fs-7">${item.id}</td>
      <td class="fw-semibold">${item.source}</td>
      <td class="text-muted fs-7">${item.month}</td>
      <td class="fw-bold">${item.value}</td>
      <td><span class="badge ${item.status === 'Paid' || item.status === 'Confirmed' ? 'bg-success' : 'bg-warning text-dark'}">${item.status}</span></td>
      <td class="text-muted fs-7">${item.receipt}</td>
    </tr>
  `).join('');
}

// ===== REALTIME COMMITTEE DASHBOARD ENGINE =====

let commRefreshInterval = null;
let commLastRefreshTime = Date.now();

function startCommitteeRealtime() {
  if (commRefreshInterval) clearInterval(commRefreshInterval);
  commRefreshInterval = setInterval(() => {
    silentCommitteeRefresh();
  }, 30000);

  setInterval(updateCommLastRefresh, 1000);
  renderCommActivityFeed();
}

function silentCommitteeRefresh() {
  try {
    loadCommitteeDashboard();
    renderCommActivityFeed();
    commLastRefreshTime = Date.now();
  } catch(e) {
    console.warn('Committee refresh error:', e);
  }
}

function refreshCommitteeNow() {
  const btn = event && event.currentTarget;
  if (btn) {
    const icon = btn.querySelector('i');
    if (icon) icon.classList.add('fa-spin');
    setTimeout(() => { if (icon) icon.classList.remove('fa-spin'); }, 1000);
  }
  loadCommitteeDashboard();
  renderCommActivityFeed();
  commLastRefreshTime = Date.now();
  updateCommLastRefresh();
}

function updateCommLastRefresh() {
  const el = document.getElementById('commLastUpdated');
  if (!el) return;
  const seconds = Math.floor((Date.now() - commLastRefreshTime) / 1000);
  if (seconds < 5) el.textContent = 'Updated just now';
  else if (seconds < 60) el.textContent = `Updated ${seconds}s ago`;
  else el.textContent = `Updated ${Math.floor(seconds / 60)}m ago`;
}

function renderCommActivityFeed() {
  const container = document.getElementById('commActivityFeed');
  if (!container) return;

  const activities = [];
  const maintenance = SystemDB.getMaintenance();
  const complaints = SystemDB.getComplaints();
  const bookings = SystemDB.getBookings();
  const polls = SystemDB.getPolls();

  // Maintenance payments
  maintenance.filter(m => m.status === 'Paid').slice(0, 3).forEach(m => {
    activities.push({
      icon: 'fa-indian-rupee-sign', iconBg: 'bg-success',
      title: `₹${m.amount.toLocaleString()} collected — ${m.month}`,
      detail: `${m.residentName} (${m.flat})`,
      time: m.paymentDate || m.dueDate
    });
  });

  // Outstanding dues
  maintenance.filter(m => m.status === 'Unpaid').slice(0, 3).forEach(m => {
    activities.push({
      icon: 'fa-file-invoice-dollar', iconBg: 'bg-danger',
      title: `₹${m.amount.toLocaleString()} overdue — ${m.month}`,
      detail: `${m.residentName} (${m.flat}) — Due: ${m.dueDate}`,
      time: m.dueDate
    });
  });

  // Complaints
  complaints.slice(0, 3).forEach(c => {
    activities.push({
      icon: 'fa-triangle-exclamation',
      iconBg: c.status === 'Resolved' ? 'bg-success' : c.status === 'In Progress' ? 'bg-info' : 'bg-warning',
      title: c.title,
      detail: `${c.residentName} (${c.flat}) — ${c.status} — ${c.priority} Priority`,
      time: c.date
    });
  });

  // Bookings
  bookings.slice(0, 2).forEach(b => {
    activities.push({
      icon: 'fa-calendar-check', iconBg: 'bg-primary',
      title: `${b.amenityName} booked`,
      detail: `${b.residentName} (${b.flat}) — ${b.timeSlot}`,
      time: b.date
    });
  });

  // Poll activity
  polls.slice(0, 2).forEach(p => {
    activities.push({
      icon: 'fa-square-poll-vertical', iconBg: 'bg-warning',
      title: `Poll: ${p.title}`,
      detail: `${p.totalVotes} votes cast — Ends: ${p.endDate}`,
      time: p.createdDate
    });
  });

  activities.sort((a, b) => (b.time || '').localeCompare(a.time || ''));

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

// Instant Multi-Tab Realtime Sync for Committee
window.addEventListener('storage', (e) => {
  if (e.key === 'ssm_database_v1') {
    try {
      SystemDB.init().then(() => {
        silentCommitteeRefresh();
      });
    } catch(err) {
      console.warn('Committee storage sync error:', err);
    }
  }
});


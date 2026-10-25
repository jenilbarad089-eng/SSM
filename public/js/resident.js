/**
 * Smart Society Management System - Resident Portal JS
 */

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  await SystemDB.init();

  currentUser = SystemDB.getCurrentUser();
  if (!currentUser || currentUser.role !== 'Resident') {
    if (currentUser && currentUser.role === 'Admin') {
      window.location.href = 'admin.html';
      return;
    }
    window.location.href = 'index.html';
    return;
  }
  // Check approval status
  if (currentUser.status && currentUser.status !== 'Approved') {
    window.location.href = 'waiting-approval.html';
    return;
  }

  // Set Profile Details
  document.getElementById('resName').textContent = currentUser.name;
  document.getElementById('resFlat').textContent = `Flat: ${currentUser.flat}`;
  document.getElementById('homeResName').textContent = currentUser.name;
  document.getElementById('homeResFlat').textContent = currentUser.flat;
  if (currentUser.avatar) {
    document.getElementById('resAvatar').src = currentUser.avatar;
  }

  // Set minimum date for amenity booking datepicker to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('bookDate').min = today;
  document.getElementById('bookDate').value = today;

  loadResidentDashboard();

  // Forms
  document.getElementById('payBillForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('payBillId').value;
    const method = document.getElementById('payMethod').value;

    const res = SystemDB.payMaintenance(id, method);
    if (res.success) {
      safeHideModal('payBillModal');
      loadResidentDashboard();
      if (typeof showToast === 'function') {
        showToast("Payment successful! Maintenance invoice status updated to Paid.", "success");
      }
      setTimeout(() => {
        downloadPDFReceipt(id);
      }, 500);
    }
  });

  document.getElementById('newComplaintForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('cmpCategory').value;
    const title = document.getElementById('cmpTitle').value;
    const priority = document.getElementById('cmpPriority').value;
    const description = document.getElementById('cmpDesc').value;

    const res = SystemDB.addComplaint({ category, title, priority, description });
    safeHideModal('newComplaintModal');
    document.getElementById('newComplaintForm').reset();
    loadResidentDashboard();
    if (typeof showToast === 'function') {
      showToast(`Complaint Ticket registered successfully! Ticket ID: ${res.complaint ? res.complaint.id : 'CMP-101'}`, "success");
    }
  });

  document.getElementById('bookAmenityForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const amenityId = document.getElementById('bookAmenitySelect').value;
    const date = document.getElementById('bookDate').value;
    const timeSlot = document.getElementById('bookTimeSlot').value;
    const purpose = document.getElementById('bookPurpose').value;

    const alertEl = document.getElementById('bookingConflictAlert');
    alertEl.classList.add('d-none');

    const res = SystemDB.bookAmenity({ amenityId, date, timeSlot, purpose });
    if (res.success) {
      safeHideModal('bookAmenityModal');
      document.getElementById('bookAmenityForm').reset();
      loadResidentDashboard();
      if (typeof showToast === 'function') {
        showToast("Facility Reservation Confirmed!", "success");
      }
    } else {
      alertEl.textContent = res.message;
      alertEl.classList.remove('d-none');
    }
  });
});

function loadResidentDashboard() {
  checkVisitorApprovalsBanner();
  renderHomeKPIs();
  renderBills();
  renderComplaints();
  renderVisitors();
  renderAmenities();
  renderBookings();
  renderNotices();
  renderResidentPolls();
}

function checkVisitorApprovalsBanner() {
  const visitors = SystemDB.getVisitors().filter(
    v => (v.flat === currentUser.flat || v.residentName === currentUser.name) && v.status === 'Pending'
  );

  const banner = document.getElementById('visitorApprovalBanner');
  const details = document.getElementById('bannerVisitorDetails');
  const btns = document.getElementById('bannerActionBtns');

  if (visitors.length > 0) {
    const v = visitors[0];
    details.textContent = `${v.name} (${v.purpose}) is waiting at gate for your flat (${v.flat}). Pass: ${v.gatePassCode}`;
    btns.innerHTML = `
      <button class="btn btn-sm btn-success rounded-pill px-3" onclick="respondVisitor('${v.id}', 'Approved')">
        <i class="fa-solid fa-circle-check me-1"></i> Approve Entry
      </button>
      <button class="btn btn-sm btn-danger rounded-pill px-3" onclick="respondVisitor('${v.id}', 'Rejected')">
        <i class="fa-solid fa-circle-xmark me-1"></i> Deny Entry
      </button>
    `;
    banner.classList.remove('d-none');
  } else {
    banner.classList.add('d-none');
  }
}

function respondVisitor(id, status) {
  SystemDB.updateVisitorStatus(id, status);
  loadResidentDashboard();
  if (typeof showToast === 'function') {
    showToast(`Visitor gate pass request ${status.toLowerCase()}!`, status === 'Approved' ? 'success' : 'error');
  }
}

function renderHomeKPIs() {
  const profEl = document.getElementById('resProfileDetails');
  if (profEl && currentUser) {
    profEl.innerHTML = `
      <div class="row g-3 small">
        <div class="col-6 col-md-3"><span class="text-muted d-block">Tower / Block</span><strong class="fw-bold">${currentUser.tower || 'Tower A'} (${currentUser.block || 'Phase 1'})</strong></div>
        <div class="col-6 col-md-3"><span class="text-muted d-block">Flat Number</span><strong class="text-warning fw-bold">${currentUser.flat || 'A-302'}</strong></div>
        <div class="col-6 col-md-3"><span class="text-muted d-block">Occupancy Status</span><strong class="fw-bold">${currentUser.residentType || 'Owner'}</strong></div>
        <div class="col-6 col-md-3"><span class="text-muted d-block">Move-In Date</span><strong class="fw-bold">${currentUser.moveInDate || '2024-01-15'}</strong></div>
        <div class="col-6 col-md-3"><span class="text-muted d-block">Monthly Rent</span><strong class="fw-bold">${currentUser.rentAmount || '₹15,000/month'}</strong></div>
        <div class="col-6 col-md-3"><span class="text-muted d-block">Maintenance Dues</span><strong class="fw-bold">${currentUser.maintenanceDues || '₹3,500/month'}</strong></div>
        <div class="col-6 col-md-3"><span class="text-muted d-block">Parking Slot</span><strong class="text-warning fw-bold">${currentUser.parkingSlot || 'P-14'}</strong></div>
        <div class="col-6 col-md-3"><span class="text-muted d-block">Household Count</span><strong class="fw-bold">${currentUser.familyCount || '3 Members'}</strong></div>
      </div>
    `;
  }

  const bills = SystemDB.getMaintenance().filter(m => m.flat === currentUser.flat);
  const unpaid = bills.filter(m => m.status === 'Unpaid');
  const unpaidTotal = unpaid.reduce((a, b) => a + b.amount, 0);

  document.getElementById('homeDues').textContent = `₹${unpaidTotal.toLocaleString()}`;
  document.getElementById('homeDuesBadge').textContent = unpaid.length > 0 ? `${unpaid.length} Pending Bill(s)` : 'All Dues Paid';
  document.getElementById('homeDuesBadge').className = unpaid.length > 0 ? 'badge bg-danger-subtle text-danger fs-8' : 'badge bg-success-subtle text-success fs-8';

  const complaints = SystemDB.getComplaints().filter(c => c.flat === currentUser.flat);
  document.getElementById('homeComplaintsCount').textContent = complaints.length;

  const bookings = SystemDB.getBookings().filter(b => b.flat === currentUser.flat && b.status === 'Confirmed');
  document.getElementById('homeBookingsCount').textContent = bookings.length;
}

function renderBills() {
  const tbody = document.getElementById('resBillsTableBody');
  const bills = SystemDB.getMaintenance().filter(m => m.flat === currentUser.flat || m.residentName === currentUser.name);

  tbody.innerHTML = bills.map(m => `
    <tr>
      <td class="fw-bold fs-7">${m.id}</td>
      <td class="fw-semibold">${m.month}</td>
      <td class="fw-bold text-dark">₹${m.amount.toLocaleString()}</td>
      <td class="text-muted fs-7">${m.dueDate}</td>
      <td><span class="${m.status === 'Paid' ? 'badge-paid' : 'badge-unpaid'}">${m.status}</span></td>
      <td class="text-end">
        ${m.status === 'Unpaid' ? `
          <button class="btn btn-sm btn-success rounded-pill px-3" onclick="openPayModal('${m.id}', '${m.month}', ${m.amount})">
            <i class="fa-solid fa-credit-card me-1"></i> Pay Now
          </button>
        ` : `
          <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="downloadPDFReceipt('${m.id}')">
            <i class="fa-solid fa-file-pdf me-1"></i> PDF Receipt
          </button>
        `}
      </td>
    </tr>
  `).join('');
}

function openPayModal(id, month, amount) {
  document.getElementById('payBillId').value = id;
  document.getElementById('payBillMonth').textContent = month;
  document.getElementById('payBillAmount').textContent = `₹${amount.toLocaleString()}`;
  new bootstrap.Modal(document.getElementById('payBillModal')).show();
}

function renderComplaints() {
  const tbody = document.getElementById('resComplaintsTableBody');
  const complaints = SystemDB.getComplaints().filter(c => c.flat === currentUser.flat || c.residentName === currentUser.name);

  if (!complaints.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No complaints lodged yet. Click "Lodge New Complaint" to raise a ticket.</td></tr>`;
    return;
  }

  tbody.innerHTML = complaints.map(c => {
    const isEmergency = c.priority === 'High' || c.priority === 'Emergency';
    const assigned = c.assignedTo || 'Maintenance Desk';
    const directive = c.adminDirections || c.notes || 'Awaiting admin review and technician allocation.';

    return `
    <tr>
      <td class="fw-bold fs-7 font-monospace">${c.id}</td>
      <td>
        <div class="fw-semibold text-heading">${c.title}</div>
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
        <div class="p-2 rounded-3 bg-secondary bg-opacity-10 border border-secondary border-opacity-25" style="max-width: 280px;">
          <div class="d-flex align-items-center gap-1 mb-1">
            <span class="badge bg-info-subtle text-info fs-8 py-0.5"><i class="fa-solid fa-user-gear me-1"></i>${assigned}</span>
            <span class="badge bg-warning-subtle text-warning fs-8 py-0.5">Admin Directive</span>
          </div>
          <div class="fs-8 text-secondary fst-italic text-truncate" title="${directive}">
            "${directive}"
          </div>
        </div>
      </td>
      <td class="text-muted fs-8">${c.date}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-info rounded-pill px-3" onclick="openComplaintTracker('${c.id}')">
          <i class="fa-solid fa-timeline me-1"></i> Track
        </button>
      </td>
    </tr>`;
  }).join('');
}

function renderVisitors() {
  const tbody = document.getElementById('resVisitorsTableBody');
  const visitors = SystemDB.getVisitors().filter(v => v.flat === currentUser.flat || v.residentName === currentUser.name);

  tbody.innerHTML = visitors.map(v => `
    <tr>
      <td><span class="badge bg-secondary text-white font-monospace">${v.gatePassCode}</span></td>
      <td>
        <div class="fw-semibold">${v.name}</div>
        <small class="text-muted">${v.phone}</small>
      </td>
      <td class="fs-7">${v.purpose}</td>
      <td class="fs-7 text-muted">${v.entryTime}</td>
      <td>
        <span class="badge ${v.status === 'Approved' ? 'bg-success' : v.status === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark'}">
          ${v.status}
        </span>
      </td>
      <td class="text-end">
        ${v.status === 'Pending' ? `
          <button class="btn btn-sm btn-success rounded-pill px-2.5 me-1" onclick="respondVisitor('${v.id}', 'Approved')">Approve</button>
          <button class="btn btn-sm btn-danger rounded-pill px-2.5" onclick="respondVisitor('${v.id}', 'Rejected')">Reject</button>
        ` : `<span class="text-muted small">Action Taken</span>`}
      </td>
    </tr>
  `).join('');
}

function renderAmenities() {
  const grid = document.getElementById('amenitiesGrid');
  const select = document.getElementById('bookAmenitySelect');
  const amenities = SystemDB.getAmenities();

  grid.innerHTML = amenities.map(a => `
    <div class="col-md-4">
      <div class="card border-0 shadow-sm rounded-4 p-4 h-100">
        <div class="metric-icon bg-icon-primary mb-3"><i class="fa-solid ${a.icon || 'fa-building'}"></i></div>
        <h5 class="fw-bold mb-1">${a.name}</h5>
        <p class="text-muted small flex-grow-1 mb-3">${a.description}</p>
        <div class="d-flex align-items-center justify-content-between pt-3 border-top mt-auto fs-7">
          <span><i class="fa-solid fa-users text-muted me-1"></i> Cap: ${a.capacity}</span>
          <span class="fw-bold text-primary">₹${a.rate.toLocaleString()} / slot</span>
        </div>
      </div>
    </div>
  `).join('');

  select.innerHTML = amenities.map(a => `<option value="${a.id}">${a.name} (₹${a.rate}/slot)</option>`).join('');
}

function renderBookings() {
  const tbody = document.getElementById('resBookingsTableBody');
  const bookings = SystemDB.getBookings().filter(b => b.flat === currentUser.flat || b.residentName === currentUser.name);

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td class="fw-bold fs-7">${b.id}</td>
      <td class="fw-semibold">${b.amenityName}</td>
      <td>${b.date}</td>
      <td class="fs-7 text-muted">${b.timeSlot}</td>
      <td class="fs-7">${b.purpose}</td>
      <td class="fw-bold">₹${b.amount.toLocaleString()}</td>
      <td><span class="badge ${b.status === 'Confirmed' ? 'bg-success' : 'bg-secondary'}">${b.status}</span></td>
      <td class="text-end">
        ${b.status === 'Confirmed' ? `
          <button class="btn btn-sm btn-outline-danger border-0" onclick="cancelBookingItem('${b.id}')" title="Cancel Booking">
            <i class="fa-solid fa-ban"></i> Cancel
          </button>
        ` : '--'}
      </td>
    </tr>
  `).join('');
}

function cancelBookingItem(id) {
  if (confirm("Cancel this amenity reservation?")) {
    SystemDB.cancelBooking(id);
    loadResidentDashboard();
  }
}

function renderNotices() {
  const container = document.getElementById('resNoticesContainer');
  const notices = SystemDB.getNotices();

  container.innerHTML = notices.map(n => `
    <div class="col-md-6">
      <div class="card border-0 shadow-sm rounded-4 p-4 h-100">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <span class="badge ${n.category === 'Emergency' ? 'bg-danger' : n.category === 'Meeting' ? 'bg-warning text-dark' : 'bg-primary'} px-3 py-2">
            ${n.category}
          </span>
          <small class="text-muted"><i class="fa-solid fa-calendar me-1"></i> ${n.date}</small>
        </div>
        <h5 class="fw-bold text-dark mb-2">${n.title}</h5>
        <p class="text-muted fs-7 flex-grow-1">${n.content}</p>
        <small class="text-muted d-block border-top pt-2 mt-auto"><i class="fa-solid fa-bullhorn me-1"></i> Issued by ${n.postedBy}</small>
      </div>
    </div>
  `).join('');
}

function renderResidentPolls() {
  const container = document.getElementById('resPollsContainer');
  if (!container) return;

  const polls = SystemDB.getPolls();
  const currentUser = SystemDB.getCurrentUser();
  const userVotesKey = 'ssm_user_votes_' + (currentUser ? currentUser.id : 'anon');
  let userVotes = {};
  try {
    userVotes = JSON.parse(localStorage.getItem(userVotesKey) || '{}');
  } catch (e) {
    userVotes = {};
  }

  if (!polls || polls.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center text-muted py-5">
        <i class="fa-solid fa-check-to-slot fs-1 mb-3 text-secondary"></i>
        <h5>No active society polls at the moment</h5>
        <p class="caption-text">Check back during AGM or when the committee opens new community proposals.</p>
      </div>`;
    return;
  }

  container.innerHTML = polls.map(p => {
    const hasVoted = Boolean(userVotes[p.id]);
    const votedOptionId = userVotes[p.id];
    const totalVotes = p.totalVotes || p.options.reduce((sum, opt) => sum + (opt.votes || 0), 0) || 1;

    return `
      <div class="col-lg-6">
        <div class="hub-card p-4 h-100 d-flex flex-column">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <span class="badge bg-primary-subtle text-primary border border-primary-subtle fs-8">${p.category || 'General'}</span>
            <span class="badge ${p.status === 'Active' ? 'bg-success' : 'bg-secondary'} fs-8">
              <i class="fa-solid ${p.status === 'Active' ? 'fa-circle-check' : 'fa-clock'} me-1"></i> ${p.status}
            </span>
          </div>

          <h5 class="fw-bold mb-2 text-heading">${p.title}</h5>
          <p class="caption-text mb-3 flex-grow-1">${p.description}</p>

          <div class="p-3 rounded-3 mb-3" style="background: var(--surface-card, rgba(0,0,0,0.03)); border: 1px solid var(--border-color, rgba(0,0,0,0.08));">
            <div class="d-flex justify-content-between small text-muted mb-2">
              <span><i class="fa-solid fa-users me-1"></i> Total Community Votes: <strong>${p.totalVotes || 0}</strong></span>
              <span><i class="fa-solid fa-calendar me-1"></i> Ends: ${p.endDate}</span>
            </div>

            <div class="d-flex flex-column gap-2">
              ${p.options.map(opt => {
                const votes = opt.votes || 0;
                const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                const isSelected = votedOptionId === opt.id;

                return `
                  <div class="border rounded-3 p-2.5 ${isSelected ? 'border-primary bg-primary bg-opacity-10' : ''}">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <span class="fw-semibold fs-7 ${isSelected ? 'text-primary' : ''}">
                        ${isSelected ? '<i class="fa-solid fa-circle-check text-primary me-1"></i>' : ''}${opt.text}
                      </span>
                      <span class="fs-8 fw-bold text-muted">${votes} votes (${pct}%)</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                      <div class="progress-bar ${isSelected ? 'bg-primary' : 'bg-info'}" style="width: ${pct}%"></div>
                    </div>
                    ${!hasVoted && p.status === 'Active' ? `
                      <button class="btn btn-sm btn-outline-primary rounded-pill py-1 px-3 mt-2 fs-8" onclick="castResidentVote('${p.id}', '${opt.id}')">
                        <i class="fa-solid fa-check me-1"></i> Vote for this option
                      </button>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="d-flex justify-content-between align-items-center pt-2 border-top text-muted fs-8">
            <span>Posted by: <strong>${p.createdBy || 'Society Committee'}</strong></span>
            ${hasVoted ? '<span class="badge bg-success-subtle text-success"><i class="fa-solid fa-check me-1"></i> Vote Recorded</span>' : '<span class="badge bg-warning-subtle text-warning">Action Required</span>'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function castResidentVote(pollId, optionId) {
  const currentUser = SystemDB.getCurrentUser();
  if (!currentUser) return;

  const userVotesKey = 'ssm_user_votes_' + currentUser.id;
  let userVotes = {};
  try {
    userVotes = JSON.parse(localStorage.getItem(userVotesKey) || '{}');
  } catch (e) {
    userVotes = {};
  }

  if (userVotes[pollId]) {
    alert('You have already cast your vote for this poll.');
    return;
  }

  const res = SystemDB.votePoll(pollId, optionId);
  if (res.success) {
    userVotes[pollId] = optionId;
    localStorage.setItem(userVotesKey, JSON.stringify(userVotes));
    renderResidentPolls();
    if (typeof showToast === 'function') {
      showToast('Your vote has been counted successfully!', 'success');
    } else {
      alert('Thank you! Your vote has been recorded.');
    }
  }
}

function logout() {
  SystemDB.logout();
  window.location.href = 'index.html';
}

function safeHideModal(modalOrId) {
  const el = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
  if (!el || typeof bootstrap === 'undefined') return;
  const inst = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
  if (inst) inst.hide();
}

function openComplaintTracker(id) {
  const complaints = SystemDB.getComplaints();
  const c = complaints.find(item => item.id === id);
  if (!c) return;

  document.getElementById('trackTicketId').textContent = c.id;
  document.getElementById('trackCategory').textContent = c.category || 'General';
  
  const statusBadge = document.getElementById('trackStatusBadge');
  statusBadge.textContent = c.status;
  statusBadge.className = c.status === 'Pending' ? 'badge-pending' : c.status === 'In Progress' ? 'badge-progress' : c.status === 'Resolved' ? 'badge-resolved' : 'badge bg-secondary text-white';

  document.getElementById('trackAssignedTo').textContent = c.assignedTo || 'Maintenance Desk';
  
  const directiveText = document.getElementById('trackDirectiveText');
  directiveText.textContent = c.adminDirections || c.notes || 'Awaiting admin directive and action schedule.';

  document.getElementById('trackDescription').textContent = c.description || c.title;

  // Render Timeline
  const container = document.getElementById('trackTimelineContainer');
  let timeline = c.timeline;
  if (!timeline || !timeline.length) {
    timeline = [
      {
        status: 'Created',
        title: 'Ticket Submitted',
        details: `Submitted on ${c.date} for Flat ${c.flat}`,
        timestamp: c.date
      }
    ];
    if (c.notes || c.adminDirections) {
      timeline.push({
        status: c.status,
        title: `Admin Action (${c.status})`,
        details: `${c.adminDirections || c.notes} (Assigned: ${c.assignedTo || 'Maintenance Desk'})`,
        timestamp: c.updatedAt || c.date
      });
    }
  }

  container.innerHTML = timeline.map((step, idx) => `
    <div class="d-flex align-items-start gap-3 mb-3 position-relative">
      <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${step.status === 'Resolved' ? 'bg-success text-white' : step.status === 'In Progress' ? 'bg-info text-white' : 'bg-warning text-dark'}" style="width: 32px; height: 32px; font-size: 0.8rem; z-index: 2;">
        <i class="fa-solid ${step.status === 'Resolved' ? 'fa-check' : step.status === 'In Progress' ? 'fa-screwdriver-wrench' : 'fa-clock'}"></i>
      </div>
      <div class="flex-grow-1 p-2.5 rounded-3 bg-light bg-opacity-10 border">
        <div class="d-flex align-items-center justify-content-between mb-1">
          <strong class="text-heading fs-7">${step.title}</strong>
          <small class="text-muted fs-8">${step.timestamp || ''}</small>
        </div>
        <p class="mb-0 text-secondary fs-8">${step.details || ''}</p>
      </div>
    </div>
  `).join('');

  new bootstrap.Modal(document.getElementById('complaintTrackerModal')).show();
}

// Background Realtime Sync for Resident Portal (every 20s + instant storage sync)
setInterval(() => {
  if (currentUser) {
    loadResidentDashboard();
  }
}, 20000);

window.addEventListener('storage', (e) => {
  if (e.key === 'ssm_database_v1' && currentUser) {
    try {
      SystemDB.init().then(() => {
        loadResidentDashboard();
      });
    } catch(err) {
      console.warn('Resident storage sync error:', err);
    }
  }
});

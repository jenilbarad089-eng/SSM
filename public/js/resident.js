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
      bootstrap.Modal.getInstance(document.getElementById('payBillModal')).hide();
      loadResidentDashboard();
      // Prompt download PDF receipt
      setTimeout(() => {
        if (confirm("Payment successful! Would you like to view and download your official PDF receipt now?")) {
          downloadPDFReceipt(id);
        }
      }, 300);
    }
  });

  document.getElementById('newComplaintForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('cmpCategory').value;
    const title = document.getElementById('cmpTitle').value;
    const priority = document.getElementById('cmpPriority').value;
    const description = document.getElementById('cmpDesc').value;

    SystemDB.addComplaint({ category, title, priority, description });
    bootstrap.Modal.getInstance(document.getElementById('newComplaintModal')).hide();
    document.getElementById('newComplaintForm').reset();
    loadResidentDashboard();
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
      bootstrap.Modal.getInstance(document.getElementById('bookAmenityModal')).hide();
      document.getElementById('bookAmenityForm').reset();
      loadResidentDashboard();
      alert("Amenity Booking Confirmed!");
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
}

function renderHomeKPIs() {
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

  tbody.innerHTML = complaints.map(c => `
    <tr>
      <td class="fw-bold fs-7">${c.id}</td>
      <td>
        <div class="fw-semibold">${c.title}</div>
        <small class="badge bg-light text-secondary border">${c.category}</small>
        <small class="text-muted d-block mt-1">${c.description}</small>
      </td>
      <td><span class="badge ${c.priority === 'High' ? 'bg-danger text-white' : 'bg-secondary-subtle text-dark'}">${c.priority}</span></td>
      <td><span class="${c.status === 'Pending' ? 'badge-pending' : c.status === 'In Progress' ? 'badge-progress' : 'badge-resolved'}">${c.status}</span></td>
      <td class="text-muted fs-7">${c.date}</td>
      <td class="fs-7 text-secondary">${c.notes || 'Awaiting admin review.'}</td>
    </tr>
  `).join('');
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

function logout() {
  SystemDB.logout();
  window.location.href = 'index.html';
}

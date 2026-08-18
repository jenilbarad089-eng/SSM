/**
 * Smart Society Management System - Security Guard Gate Pass JS
 */

document.addEventListener('DOMContentLoaded', async () => {
  await SystemDB.init();

  const currentUser = SystemDB.getCurrentUser();
  if (!currentUser || (currentUser.role !== 'Security Guard' && currentUser.role !== 'Admin')) {
    window.location.href = 'index.html';
    return;
  }
  // Check approval status
  if (currentUser.status && currentUser.status !== 'Approved') {
    window.location.href = 'waiting-approval.html';
    return;
  }

  document.getElementById('guardName').textContent = currentUser.name;

  populateFlatDropdown();
  loadGuardDashboard();

  document.getElementById('newVisitorForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('visName').value;
    const phone = document.getElementById('visPhone').value;
    const flatSelect = document.getElementById('visFlat');
    const flat = flatSelect.value;
    const residentName = flatSelect.options[flatSelect.selectedIndex].dataset.resident || ('Resident of ' + flat);
    const purpose = document.getElementById('visPurpose').value;
    const vehicleNo = document.getElementById('visVehicle').value;

    const res = SystemDB.addVisitor({ name, phone, flat, residentName, purpose, vehicleNo });
    if (res.success) {
      document.getElementById('newVisitorForm').reset();
      loadGuardDashboard();
      alert(`Gate Pass Issued! Code: ${res.visitor.gatePassCode}\nApproval notification sent to resident of ${flat}.`);
    }
  });
});

function populateFlatDropdown() {
  const select = document.getElementById('visFlat');
  if (!select) return;

  const flatMap = new Map();

  // 1. Add from physical flats list
  const flats = SystemDB.getFlats ? SystemDB.getFlats() : [];
  flats.forEach(f => {
    if (f.flatNo) {
      flatMap.set(f.flatNo, f.owner || f.tenant || 'Resident');
    }
  });

  // 2. Add from users list to ensure all active/committee members are covered
  const users = SystemDB.getUsers ? SystemDB.getUsers() : [];
  users.forEach(u => {
    if (u.flat && u.role !== 'Security Guard') {
      flatMap.set(u.flat, u.name);
    }
  });

  // Sort flats alphabetically
  const sortedFlats = Array.from(flatMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  select.innerHTML = sortedFlats.map(([flatNo, resident]) => `
    <option value="${flatNo}" data-resident="${resident}">${flatNo}</option>
  `).join('');
}

function loadGuardDashboard() {
  const tbody = document.getElementById('guardVisitorsTableBody');
  const visitors = SystemDB.getVisitors();

  // Calculate gate stats
  const checkedIn = visitors.filter(v => v.exitTime === 'Still In Society' && v.status === 'Approved').length;
  const checkedOut = visitors.filter(v => v.exitTime !== 'Still In Society' && v.exitTime !== '').length;
  const totalToday = visitors.length;

  const statCheckedIn = document.getElementById('statCheckedIn');
  if (statCheckedIn) statCheckedIn.textContent = checkedIn;

  const statCheckedOut = document.getElementById('statCheckedOut');
  if (statCheckedOut) statCheckedOut.textContent = checkedOut;

  const statTotalToday = document.getElementById('statTotalToday');
  if (statTotalToday) statTotalToday.textContent = totalToday;

  tbody.innerHTML = visitors.map(v => `
    <tr>
      <td><span class="badge bg-dark text-warning font-monospace fs-7 px-2.5 py-1.5">${v.gatePassCode}</span></td>
      <td>
        <div class="fw-semibold text-dark">${v.name}</div>
        <small class="text-muted"><i class="fa-solid fa-phone me-1"></i>${v.phone}</small>
        ${v.vehicleNo && v.vehicleNo !== 'N/A' ? `<small class="badge bg-light text-secondary border ms-1">${v.vehicleNo}</small>` : ''}
      </td>
      <td>
        <span class="badge bg-primary-subtle text-primary border border-primary-subtle fs-7">${v.flat}</span>
      </td>
      <td class="fs-7 text-secondary">${v.purpose}</td>
      <td class="fs-7 text-muted">${v.entryTime}</td>
      <td>
        <span class="badge ${v.status === 'Approved' ? 'bg-success' : v.status === 'Rejected' ? 'bg-danger' : 'bg-warning text-dark'}">
          ${v.status}
        </span>
      </td>
      <td class="text-end">
        ${v.exitTime === 'Still In Society' ? `
          <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="markExit('${v.id}')">
            <i class="fa-solid fa-right-from-bracket me-1"></i> Mark Exit
          </button>
        ` : `
          <span class="text-muted fs-8"><i class="fa-solid fa-check me-1 text-success"></i> ${v.exitTime}</span>
        `}
      </td>
    </tr>
  `).join('');
}

function markExit(id) {
  SystemDB.markVisitorExit(id);
  loadGuardDashboard();
}

function logout() {
  SystemDB.logout();
  window.location.href = 'index.html';
}

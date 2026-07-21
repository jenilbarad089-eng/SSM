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

  document.getElementById('guardName').textContent = currentUser.name;

  populateFlatDropdown();
  loadGuardDashboard();

  document.getElementById('newVisitorForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('visName').value;
    const phone = document.getElementById('visPhone').value;
    const flatSelect = document.getElementById('visFlatSelect');
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
  const select = document.getElementById('visFlatSelect');
  const residents = SystemDB.getResidents();

  select.innerHTML = residents.map(r => `
    <option value="${r.flat}" data-resident="${r.name}">${r.flat} (${r.name})</option>
  `).join('');
}

function loadGuardDashboard() {
  const tbody = document.getElementById('guardVisitorsTableBody');
  const visitors = SystemDB.getVisitors();

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

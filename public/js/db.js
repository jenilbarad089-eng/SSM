/**
 * Smart Society Management System - Database Engine & State Manager
 */

const STORAGE_KEY = 'ssm_database_v1';
const SESSION_KEY = 'ssm_current_user';
const TOKEN_KEY = 'ssm_auth_token';

const SystemDB = {
  data: null,

  async init() {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        this.data = JSON.parse(cached);
      } catch (e) {
        console.error("Failed to parse local DB cache, re-initializing", e);
      }
    }

    if (!this.data) {
      try {
        const res = await fetch('../data/seed.json');
        if (res.ok) {
          this.data = await res.json();
        } else {
          this.data = this.getDefaultData();
        }
      } catch (err) {
        this.data = this.getDefaultData();
      }
    }

    // Ensure all default seed members are merged into users array
    const defaults = this.getDefaultData().users;
    if (this.data && this.data.users) {
      defaults.forEach(defUser => {
        if (!this.data.users.some(u => u.id === defUser.id || u.email === defUser.email)) {
          this.data.users.push(defUser);
        }
      });
    }
    this.save();
  },

  save() {
    if (this.data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }
  },

  resetToSeed() {
    localStorage.removeItem(STORAGE_KEY);
    return this.init();
  },

  // ──────────────────────────────────────────────
  // JWT Token Management
  // ──────────────────────────────────────────────

  setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },

  authHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  },

  // Auth Operations
  login(username, password) {
    // Auth now handled server-side via firebase-auth.js -> /api/auth/login
    // This method is kept as a synchronous fallback for the local data layer
    // but no longer performs password comparison (passwords are hashed server-side).
    return { success: false, message: 'Authentication is handled server-side. Please use the login form.' };
  },

  getCurrentUser() {
    const sess = sessionStorage.getItem(SESSION_KEY);
    return sess ? JSON.parse(sess) : null;
  },

  logout() {
    this.clearToken();
    sessionStorage.removeItem(SESSION_KEY);
  },

  // Residents Operations
  getResidents() {
    return this.data.users.filter(u => u.role === 'Resident' || u.role === 'Admin');
  },

  addResident(residentData) {
    // Note: password hashing is handled server-side via /api/auth/register
    // The password field is not stored in localStorage for security
    const newId = 'USR-' + Math.floor(100 + Math.random() * 900);
    const newResident = {
      id: newId,
      username: residentData.username || residentData.email.split('@')[0],
      name: residentData.name,
      role: 'Resident',
      flat: residentData.flat,
      email: residentData.email,
      phone: residentData.phone,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(residentData.name)}`
    };
    this.data.users.push(newResident);

    // Also auto-generate July maintenance bill for new resident
    this.data.maintenance.push({
      id: 'INV-2026-07-' + Math.floor(100 + Math.random() * 900),
      residentName: newResident.name,
      flat: newResident.flat,
      month: 'July 2026',
      amount: 3500,
      status: 'Unpaid',
      dueDate: '2026-07-31',
      txnId: null,
      paymentDate: null,
      receiptNo: null
    });

    this.save();
    return { success: true, resident: newResident };
  },

  updateUserRole(userId, newRole) {
    const user = this.data.users.find(u => u.id === userId || u.email === userId);
    if (user) {
      user.role = newRole;
      this.save();
      // If current logged in user changed their own role, update session
      const curr = this.getCurrentUser();
      if (curr && (curr.id === userId || curr.email === userId)) {
        curr.role = newRole;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(curr));
      }
      return { success: true, user };
    }
    return { success: false, message: 'User not found' };
  },

  updateUserAllocation(userId, allocData) {
    const user = this.data.users.find(u => u.id === userId || u.email === userId);
    if (user) {
      user.status = 'Approved';
      user.role = allocData.role || user.role;
      user.tower = allocData.tower || user.tower;
      user.floor = allocData.floor || user.floor;
      user.flat = allocData.flat || user.flat;
      user.residentType = allocData.type || user.residentType;
      user.maintenanceAmount = allocData.maintenance || user.maintenanceAmount || 3500;
      user.parkingSlot = allocData.parking || user.parkingSlot;

      // Auto-generate July 2026 Maintenance Bill for allotted flat if not existing
      if (user.flat) {
        let bill = this.data.maintenance.find(b => b.flat === user.flat && b.month === 'July 2026');
        if (!bill) {
          this.data.maintenance.push({
            id: 'INV-2026-07-' + Math.floor(100 + Math.random() * 900),
            residentName: user.name,
            flat: user.flat,
            month: 'July 2026',
            amount: Number(user.maintenanceAmount) || 3500,
            status: 'Unpaid',
            dueDate: '2026-07-31',
            txnId: null,
            paymentDate: null,
            receiptNo: null
          });
        }
      }
      this.save();

      // If current logged in user, sync session
      const curr = this.getCurrentUser();
      if (curr && (curr.id === userId || curr.email === userId)) {
        Object.assign(curr, user);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(curr));
      }
      return { success: true, user };
    }
    return { success: false, message: 'User not found' };
  },

  deleteResident(userId) {
    this.data.users = this.data.users.filter(u => u.id !== userId);
    this.save();
    return { success: true };
  },

  // Complaints
  getComplaints() {
    return this.data.complaints || [];
  },

  addComplaint(complaint) {
    const user = this.getCurrentUser();
    const newComplaint = {
      id: 'CMP-' + Math.floor(100 + Math.random() * 900),
      residentName: user ? user.name : complaint.residentName,
      flat: user ? user.flat : complaint.flat,
      category: complaint.category,
      title: complaint.title,
      description: complaint.description,
      status: 'Pending',
      priority: complaint.priority || 'Medium',
      date: new Date().toISOString().split('T')[0],
      notes: 'Complaint submitted by resident.'
    };
    this.data.complaints.unshift(newComplaint);
    this.save();
    return { success: true, complaint: newComplaint };
  },

  updateComplaintStatus(id, status, notes) {
    const cmp = this.data.complaints.find(c => c.id === id);
    if (cmp) {
      cmp.status = status;
      if (notes) cmp.notes = notes;
      this.save();
      return { success: true, complaint: cmp };
    }
    return { success: false, message: 'Complaint not found' };
  },

  // Maintenance
  getMaintenance() {
    return this.data.maintenance || [];
  },

  payMaintenance(billId, paymentMethod) {
    const bill = this.data.maintenance.find(m => m.id === billId);
    if (!bill) return { success: false, message: 'Bill not found' };
    if (bill.status === 'Paid') return { success: false, message: 'Bill is already paid' };

    bill.status = 'Paid';
    bill.paymentDate = new Date().toISOString().split('T')[0];
    bill.txnId = 'TXN' + Math.floor(100000000 + Math.random() * 900000000);
    bill.receiptNo = 'REC-2026-' + Math.floor(100 + Math.random() * 900);
    bill.paymentMethod = paymentMethod || 'UPI / Online Card';

    this.save();
    return { success: true, bill: bill };
  },

  // Visitor Operations
  getVisitors() {
    return this.data.visitors || [];
  },

  addVisitor(visitorData) {
    const newVisitor = {
      id: 'VIS-' + Math.floor(100 + Math.random() * 900),
      name: visitorData.name,
      phone: visitorData.phone,
      flat: visitorData.flat,
      residentName: visitorData.residentName || 'Resident of ' + visitorData.flat,
      purpose: visitorData.purpose,
      vehicleNo: visitorData.vehicleNo || 'N/A',
      entryTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
      exitTime: 'Still In Society',
      status: 'Pending',
      gatePassCode: 'GP-' + Math.floor(1000 + Math.random() * 9000)
    };
    this.data.visitors.unshift(newVisitor);
    this.save();
    return { success: true, visitor: newVisitor };
  },

  updateVisitorStatus(id, status) {
    const vis = this.data.visitors.find(v => v.id === id);
    if (vis) {
      vis.status = status;
      this.save();
      return { success: true, visitor: vis };
    }
    return { success: false };
  },

  markVisitorExit(id) {
    const vis = this.data.visitors.find(v => v.id === id);
    if (vis) {
      vis.exitTime = new Date().toISOString().replace('T', ' ').substring(0, 16);
      this.save();
      return { success: true, visitor: vis };
    }
    return { success: false };
  },

  // Notices
  getNotices() {
    return this.data.notices || [];
  },

  addNotice(notice) {
    const user = this.getCurrentUser();
    const newNotice = {
      id: 'NOT-' + Math.floor(100 + Math.random() * 900),
      title: notice.title,
      category: notice.category || 'General',
      postedBy: user ? user.name : 'Admin',
      date: new Date().toISOString().split('T')[0],
      content: notice.content
    };
    this.data.notices.unshift(newNotice);
    this.save();
    return { success: true, notice: newNotice };
  },

  deleteNotice(id) {
    this.data.notices = this.data.notices.filter(n => n.id !== id);
    this.save();
    return { success: true };
  },

  // Amenities & Booking
  getAmenities() {
    return this.data.amenities || [];
  },

  getBookings() {
    return this.data.bookings || [];
  },

  bookAmenity(bookingData) {
    const user = this.getCurrentUser();

    // Check for double booking conflict
    const existing = this.data.bookings.find(
      b => b.amenityId === bookingData.amenityId &&
           b.date === bookingData.date &&
           b.timeSlot === bookingData.timeSlot &&
           b.status !== 'Cancelled'
    );

    if (existing) {
      return {
        success: false,
        message: `Conflict: This amenity is already booked by ${existing.residentName} (${existing.flat}) for ${bookingData.date} [${bookingData.timeSlot}]!`
      };
    }

    const amenity = this.data.amenities.find(a => a.id === bookingData.amenityId);
    const newBooking = {
      id: 'BK-' + Math.floor(100 + Math.random() * 900),
      amenityId: bookingData.amenityId,
      amenityName: amenity ? amenity.name : bookingData.amenityName,
      residentName: user ? user.name : bookingData.residentName,
      flat: user ? user.flat : bookingData.flat,
      date: bookingData.date,
      timeSlot: bookingData.timeSlot,
      purpose: bookingData.purpose,
      amount: amenity ? amenity.rate : 1000,
      status: 'Confirmed'
    };

    this.data.bookings.unshift(newBooking);
    this.save();
    return { success: true, booking: newBooking };
  },

  updateUserAllocation(userId, allocData) {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'User not found' };

    user.status = 'Approved';

    if (allocData.role === 'Security Guard') {
      user.role = 'Security Guard';
      user.empId = allocData.empId || 'EMP-' + Math.floor(100 + Math.random() * 900);
      user.shift = allocData.shift || 'Morning (06:00 - 14:00)';
      user.gateAssigned = allocData.gateAssigned || 'Gate 1';
      user.salary = allocData.salary || '₹18,000/month';
      user.permissions = allocData.permissions || 'Gate Pass Logging & Visitor Verification';
      user.flat = user.gateAssigned;
    } else {
      user.role = 'Resident';
      user.tower = allocData.tower || 'Tower A';
      user.flat = allocData.flatNo || user.flat || 'A-302';
      user.flatNo = user.flat;
      user.residentType = allocData.residentType || 'Owner';
      user.rentAmount = allocData.rentAmount || '₹15,000/month';
      user.maintenanceDues = allocData.maintenanceDues || '₹3,500/month';
      user.parkingSlot = allocData.parkingSlot || 'P-14';
      user.block = allocData.block || 'Phase 1';
      user.moveInDate = allocData.moveInDate || '2024-01-15';
      user.familyCount = allocData.familyCount || '4 Members';
      user.vehicles = allocData.vehicles || ['MH 02 EQ 8829 (Car)', 'MH 02 CB 1029 (Bike)'];
      user.familyMembers = allocData.familyMembers || ['Priya Barad (Spouse)', 'Kavya Barad (Child)'];

      // Generate invoice
      const newBill = {
        id: 'INV-2026-' + Math.floor(1000 + Math.random() * 9000),
        flat: user.flat,
        residentName: user.name,
        month: 'July 2026',
        amount: parseInt(user.maintenanceDues.replace(/[^0-9]/g, '')) || 3500,
        dueDate: '2026-07-31',
        status: 'Unpaid',
        paidDate: null
      };

      if (!this.data.maintenance) this.data.maintenance = [];
      this.data.maintenance.unshift(newBill);
    }

    this.save();
    return { success: true, user: user };
  },

  getTowers() {
    return (this.data && this.data.towers) ? this.data.towers : [];
  },

  getFlats() {
    return (this.data && this.data.flats) ? this.data.flats : [];
  },

  getAuditLogs() {
    return (this.data && this.data.auditLogs) ? this.data.auditLogs : [];
  },

  getPolls() {
    return (this.data && this.data.polls) ? this.data.polls : [];
  },

  addPoll(pollData) {
    if (!this.data) return;
    if (!this.data.polls) this.data.polls = [];
    const curUser = this.getCurrentUser();
    const userName = curUser ? curUser.name : 'Committee Member';

    const newPoll = {
      id: 'POL-' + Math.floor(100 + Math.random() * 900),
      title: pollData.title,
      category: pollData.category || 'General',
      description: pollData.description || '',
      options: pollData.options.map((opt, i) => ({ id: 'opt' + (i+1), text: opt, votes: 0 })),
      totalVotes: 0,
      status: 'Active',
      createdDate: new Date().toISOString().split('T')[0],
      endDate: pollData.endDate || '2026-08-31',
      createdBy: userName
    };

    this.data.polls.unshift(newPoll);
    this.logAudit('Created Society Voting Poll', 'Committee Governance', `Published poll: "${newPoll.title}"`);
    this.save();
    return { success: true, poll: newPoll };
  },

  votePoll(pollId, optionId) {
    if (!this.data || !this.data.polls) return { success: false };
    const poll = this.data.polls.find(p => p.id === pollId);
    if (!poll) return { success: false, message: 'Poll not found' };

    const opt = poll.options.find(o => o.id === optionId);
    if (opt) {
      opt.votes += 1;
      poll.totalVotes += 1;
      this.logAudit('Voted in Society Poll', 'Committee Governance', `Voted on "${poll.title}" for "${opt.text}"`);
      this.save();
      return { success: true, poll: poll };
    }
    return { success: false };
  },

  logAudit(action, module, details) {
    if (!this.data) return;
    if (!this.data.auditLogs) this.data.auditLogs = [];
    const curUser = this.getCurrentUser();
    const userName = curUser ? curUser.name : 'System';
    const userRole = curUser ? curUser.role : 'System';

    const now = new Date();
    const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);

    const newLog = {
      id: 'LOG-' + Math.floor(1000 + Math.random() * 9000),
      timestamp: dateStr,
      user: userName,
      role: userRole,
      action: action,
      module: module,
      details: details || ''
    };

    this.data.auditLogs.unshift(newLog);
    this.save();
  },

  exportToCSV(filename, rows) {
    if (!rows || !rows.length) return;
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows.map(row => {
        return keys.map(k => {
          let cell = row[k] === null || row[k] === undefined ? '' : row[k].toString();
          cell = cell.replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) {
            cell = `"${cell}"`;
          }
          return cell;
        }).join(separator);
      }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  getDefaultData() {
    return {
      users: [
        { id: "USR-101", username: "admin", name: "Jenil Barad (Admin)", role: "Admin", status: "Approved", flat: "A-101", email: "jenilbarad089@gmail.com", phone: "9876543210", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&gender=male", registeredAt: "2026-01-15", approvedAt: "2026-01-15" },
        { id: "USR-102", username: "resident1", name: "Amit Patel", role: "Resident", status: "Approved", tower: "Tower A", flat: "A-302", flatNo: "A-302", residentType: "Owner", rentAmount: "₹18,000/month", maintenanceDues: "₹3,500/month", parkingSlot: "P-14", block: "Phase 1", moveInDate: "2024-01-15", familyCount: "3 Members", email: "amit.patel@gmail.com", phone: "9812345678", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit&gender=male", vehicles: ["MH 02 EQ 8829 (SUV)", "MH 02 CB 1029 (Bike)"], familyMembers: ["Priya Barad (Spouse)", "Kavya Barad (Child)"], registeredAt: "2026-01-15", approvedAt: "2026-01-15" },
        { id: "USR-103", username: "resident2", name: "Priya Verma", role: "Resident", status: "Approved", tower: "Tower C", flat: "C-501", flatNo: "C-501", residentType: "Tenant", rentAmount: "₹22,000/month", maintenanceDues: "₹4,000/month", parkingSlot: "P-22", block: "Phase 2", moveInDate: "2024-03-01", familyCount: "2 Members", email: "priya.v@gmail.com", phone: "9823456789", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya&gender=female", vehicles: ["MH 04 AX 4410 (Sedan)"], familyMembers: ["Rohan Verma (Spouse)"], registeredAt: "2026-01-15", approvedAt: "2026-01-15" },
        { id: "USR-104", username: "guard", name: "Bahadur Singh", role: "Security Guard", status: "Approved", empId: "EMP-104", shift: "Morning (06:00 - 14:00)", gateAssigned: "Gate 1", salary: "₹18,000/month", flat: "Gate 1", email: "guard@smartsociety.com", phone: "9988776655", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bahadur&gender=male", registeredAt: "2026-01-15", approvedAt: "2026-01-15" },
        { id: "USR-105", username: "committee", name: "Suresh Kumar", role: "Committee Member", status: "Approved", flat: "A-402", email: "suresh@smartsociety.com", phone: "9765432109", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Suresh&gender=male", registeredAt: "2026-01-15", approvedAt: "2026-01-15" },
        { id: "USR-106", username: "rahul.sharma", name: "Rahul Sharma", role: "Resident", status: "Approved", tower: "Tower B", flat: "B-104", flatNo: "B-104", residentType: "Owner", rentAmount: "₹19,000/month", maintenanceDues: "₹3,500/month", parkingSlot: "P-08", block: "Phase 1", moveInDate: "2024-02-10", familyCount: "3 Members", email: "rahul.sharma@gmail.com", phone: "9811223344", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul&gender=male", registeredAt: "2026-02-01", approvedAt: "2026-02-01" },
        { id: "USR-107", username: "neha.gupta", name: "Neha Gupta", role: "Resident", status: "Approved", tower: "Tower B", flat: "B-202", flatNo: "B-202", residentType: "Tenant", rentAmount: "₹20,000/month", maintenanceDues: "₹3,500/month", parkingSlot: "P-19", block: "Phase 1", moveInDate: "2024-04-15", familyCount: "2 Members", email: "neha.gupta@gmail.com", phone: "9822334455", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Neha&gender=female", registeredAt: "2026-04-10", approvedAt: "2026-04-10" },
        { id: "USR-108", username: "vikram.yadav", name: "Vikram Yadav", role: "Security Guard", status: "Approved", empId: "EMP-108", shift: "Evening (14:00 - 22:00)", gateAssigned: "Gate 2", salary: "₹18,000/month", flat: "Gate 2", email: "vikram.yadav@gmail.com", phone: "9833445566", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram&gender=male", registeredAt: "2026-05-01", approvedAt: "2026-05-01" },
        { id: "USR-109", username: "ananya.d", name: "Ananya Deshmukh", role: "Resident", status: "Approved", tower: "Tower A", flat: "A-604", flatNo: "A-604", residentType: "Owner", rentAmount: "₹25,000/month", maintenanceDues: "₹4,200/month", parkingSlot: "P-33", block: "Phase 2", moveInDate: "2024-05-01", familyCount: "4 Members", email: "ananya.d@gmail.com", phone: "9844556677", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya&gender=female", registeredAt: "2026-05-15", approvedAt: "2026-05-15" },
        { id: "USR-110", username: "rohan.m", name: "Rohan Mehta", role: "Committee Member", status: "Approved", flat: "B-301", email: "rohan.secretary@smartsociety.com", phone: "9855667788", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan&gender=male", registeredAt: "2026-01-15", approvedAt: "2026-01-15" }
      ],
      complaints: [],
      maintenance: [],
      visitors: [],
      notices: [],
      amenities: [],
      bookings: [],
      towers: [],
      flats: [],
      auditLogs: []
    };
  }
};

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
          this.save();
        } else {
          console.warn("Could not fetch seed.json, falling back to default memory");
          this.data = this.getDefaultData();
          this.save();
        }
      } catch (err) {
        console.warn("Fetch failed, using default data", err);
        this.data = this.getDefaultData();
        this.save();
      }
    }
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

  cancelBooking(id) {
    const bk = this.data.bookings.find(b => b.id === id);
    if (bk) {
      bk.status = 'Cancelled';
      this.save();
      return { success: true };
    }
    return { success: false };
  },

  getDefaultData() {
    return {
      users: [
        { id: "USR-101", username: "admin", name: "Rajesh Sharma", role: "Admin", flat: "A-101", email: "admin@smartsociety.com", phone: "9876543210" },
        { id: "USR-102", username: "resident1", name: "Amit Patel", role: "Resident", flat: "B-204", email: "amit.patel@gmail.com", phone: "9812345678" },
        { id: "USR-103", username: "resident2", name: "Priya Verma", role: "Resident", flat: "C-501", email: "priya.v@gmail.com", phone: "9823456789" },
        { id: "USR-104", username: "guard", name: "Bahadur Singh", role: "Security Guard", flat: "Main Gate 1", email: "guard@smartsociety.com", phone: "9988776655" },
        { id: "USR-105", username: "committee", name: "Suresh Kumar", role: "Committee Member", flat: "A-402", email: "suresh@smartsociety.com", phone: "9765432109" }
      ],
      complaints: [],
      maintenance: [],
      visitors: [],
      notices: [],
      amenities: [],
      bookings: []
    };
  }
};

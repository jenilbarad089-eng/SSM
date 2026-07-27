/**
 * SocietyHub - Auth API Routes with Approval Workflow
 * POST /api/auth/login     - Login (checks approval status)
 * POST /api/auth/register  - Register (Pending by default, Resident/Guard only)
 * POST /api/auth/google    - Google OAuth login/register
 * GET  /api/auth/me        - Get current user profile
 * GET  /api/auth/pending   - List pending users (Admin/Committee)
 * POST /api/auth/approve   - Approve a user (Admin only)
 * POST /api/auth/reject    - Reject a user (Admin only)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { authenticateToken, requireRole, JWT_SECRET } = require('./auth-middleware');

const router = express.Router();
const SEED_PATH = path.join(__dirname, 'data', 'seed.json');
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '24h';

function readSeed() {
  return JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
}
function writeSeed(data) {
  fs.writeFileSync(SEED_PATH, JSON.stringify(data, null, 2), 'utf8');
}
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, flat: user.flat, status: user.status || 'Approved' },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}
function safeUser(user) {
  return {
    id: user.id, name: user.name, email: user.email, role: user.role,
    flat: user.flat, phone: user.phone || '', avatar: user.avatar || '',
    status: user.status || 'Approved', tower: user.tower, floor: user.floor,
    residentType: user.residentType, rent: user.rent,
    maintenanceAmount: user.maintenanceAmount, parkingSlot: user.parkingSlot,
    moveInDate: user.moveInDate, emergencyContact: user.emergencyContact,
    familyMembers: user.familyMembers, vehicleNumbers: user.vehicleNumbers,
    guardId: user.guardId, gateAssignment: user.gateAssignment,
    shift: user.shift, salary: user.salary,
    registeredAt: user.registeredAt, approvedAt: user.approvedAt,
  };
}

// ─── POST /api/auth/login ──────────────────────
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const seed = readSeed();
    const lookup = email.toLowerCase().trim();
    const user = seed.users.find(u =>
      u.email.toLowerCase() === lookup || u.username.toLowerCase() === lookup
    );
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    // Google users have no password
    if (!user.password) {
      return res.status(401).json({ success: false, message: 'This account uses Google Sign-In. Please use that method.' });
    }
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    // Check approval status
    if (user.status === 'Pending') {
      return res.status(403).json({ success: false, message: 'Your account is pending approval. Please wait for the administrator to review your registration.', status: 'Pending' });
    }
    if (user.status === 'Rejected') {
      return res.status(403).json({ success: false, message: 'Your registration has been rejected. Please contact the Society Office.', status: 'Rejected' });
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact the Society Office.', status: 'Suspended' });
    }
    const token = generateToken(user);
    return res.json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// ─── POST /api/auth/register ───────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, aadhaar, employeeId, familyMembers } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    // Only allow Resident and Security Guard self-registration
    const allowedRoles = ['Resident', 'Security Guard'];
    const userRole = role || 'Resident';
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Only Resident and Security Guard accounts can be self-registered.' });
    }

    const seed = readSeed();
    const lookup = email.toLowerCase().trim();
    if (seed.users.find(u => u.email.toLowerCase() === lookup)) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const maxId = seed.users.reduce((max, u) => {
      const num = parseInt(u.id.replace('USR-', ''), 10);
      return num > max ? num : max;
    }, 0);

    const now = new Date().toISOString().split('T')[0];
    const newUser = {
      id: 'USR-' + (maxId + 1),
      username: email.split('@')[0],
      password: hashedPassword,
      name: name,
      role: userRole,
      flat: '',
      email: email,
      phone: phone || '',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      status: 'Pending',
      registeredAt: now,
      approvedAt: null,
      approvedBy: null,
      aadhaar: aadhaar || '',
      familyMembers: familyMembers || '',
      employeeId: employeeId || '',
    };

    seed.users.push(newUser);
    writeSeed(seed);

    const token = generateToken(newUser);
    return res.status(201).json({ success: true, token, user: safeUser(newUser) });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// ─── POST /api/auth/google ─────────────────────
router.post('/google', (req, res) => {
  try {
    const { email, displayName, photoURL, uid } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google email is required.' });
    }
    const seed = readSeed();
    const lookup = email.toLowerCase().trim();
    let user = seed.users.find(u => u.email.toLowerCase() === lookup);

    if (!user) {
      const maxId = seed.users.reduce((max, u) => {
        const num = parseInt(u.id.replace('USR-', ''), 10);
        return num > max ? num : max;
      }, 0);
      const now = new Date().toISOString().split('T')[0];
      user = {
        id: 'USR-' + (maxId + 1),
        username: email.split('@')[0],
        password: '',
        name: displayName || email.split('@')[0],
        role: 'Resident',
        flat: '',
        email: email,
        phone: '',
        avatar: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName || email)}`,
        status: 'Pending',
        registeredAt: now,
        approvedAt: null,
        approvedBy: null,
      };
      seed.users.push(user);
      writeSeed(seed);
    }
    const token = generateToken(user);
    return res.json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(500).json({ success: false, message: 'Server error during Google authentication.' });
  }
});

// ─── GET /api/auth/me ──────────────────────────
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ success: true, user: req.user });
});

// ─── GET /api/auth/pending ─────────────────────
router.get('/pending', authenticateToken, requireRole('Admin', 'Committee Member'), (req, res) => {
  try {
    const seed = readSeed();
    const pending = seed.users.filter(u => u.status === 'Pending').map(safeUser);
    return res.json({ success: true, users: pending });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── GET /api/auth/all ─────────────────────────
router.get('/all', authenticateToken, requireRole('Admin'), (req, res) => {
  try {
    const seed = readSeed();
    const users = seed.users.map(safeUser);
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ─── POST /api/auth/approve ────────────────────
router.post('/approve', authenticateToken, requireRole('Admin'), (req, res) => {
  try {
    const { userId, tower, floor, flat, residentType, rent, maintenanceAmount, parkingSlot, moveInDate, emergencyContact, familyMembers, vehicleNumbers, waterMeter, electricMeter, notes, guardId, gateAssignment, shift, salary, joiningDate, permissions } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const seed = readSeed();
    const user = seed.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'User is not pending approval.' });
    }

    const now = new Date().toISOString().split('T')[0];
    user.status = 'Approved';
    user.approvedAt = now;
    user.approvedBy = req.user.id;
    user.flat = flat || user.flat;
    user.tower = tower || '';
    user.floor = floor || '';
    user.residentType = residentType || '';
    user.rent = rent || '';
    user.maintenanceAmount = maintenanceAmount || '';
    user.parkingSlot = parkingSlot || '';
    user.moveInDate = moveInDate || '';
    user.emergencyContact = emergencyContact || '';
    user.familyMembers = familyMembers || user.familyMembers || '';
    user.vehicleNumbers = vehicleNumbers || '';
    user.waterMeter = waterMeter || '';
    user.electricMeter = electricMeter || '';
    user.approvalNotes = notes || '';

    // Guard-specific fields
    if (user.role === 'Security Guard') {
      user.guardId = guardId || '';
      user.gateAssignment = gateAssignment || '';
      user.shift = shift || '';
      user.salary = salary || '';
      user.joiningDate = joiningDate || '';
      user.permissions = permissions || [];
    }

    writeSeed(seed);
    return res.json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error('Approve error:', err);
    return res.status(500).json({ success: false, message: 'Server error during approval.' });
  }
});

// ─── POST /api/auth/reject ─────────────────────
router.post('/reject', authenticateToken, requireRole('Admin'), (req, res) => {
  try {
    const { userId, reason } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }
    const seed = readSeed();
    const user = seed.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    if (user.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'User is not pending approval.' });
    }
    user.status = 'Rejected';
    user.rejectionReason = reason || '';
    writeSeed(seed);
    return res.json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error('Reject error:', err);
    return res.status(500).json({ success: false, message: 'Server error during rejection.' });
  }
});

// ─── POST /api/auth/update-status ──────────────
router.post('/update-status', authenticateToken, requireRole('Admin'), (req, res) => {
  try {
    const { userId, status } = req.body;
    const seed = readSeed();
    const user = seed.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    user.status = status;
    writeSeed(seed);
    return res.json({ success: true, user: safeUser(user) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;

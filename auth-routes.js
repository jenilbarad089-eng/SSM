/**
 * Smart Society Management System - Auth API Routes
 * POST /api/auth/login    - Login with email/username + password
 * POST /api/auth/register - Register a new user
 * GET  /api/auth/me       - Get current user profile (protected)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { authenticateToken, JWT_SECRET } = require('./auth-middleware');

const router = express.Router();
const SEED_PATH = path.join(__dirname, 'data', 'seed.json');
const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '24h';

// Helper: read/write seed data
function readSeed() {
  return JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
}

function writeSeed(data) {
  fs.writeFileSync(SEED_PATH, JSON.stringify(data, null, 2), 'utf8');
}

// Helper: generate JWT for a user
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, flat: user.flat },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

// Helper: build safe user object (no password)
function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    flat: user.flat,
    phone: user.phone || '',
    avatar: user.avatar || '',
  };
}

// ────────────────────────────────────────────────
// POST /api/auth/login
// Accepts email or username + password
// ────────────────────────────────────────────────
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const seed = readSeed();
    const lookup = email.toLowerCase().trim();

    // Match by email or username (case-insensitive)
    const user = seed.users.find(u =>
      u.email.toLowerCase() === lookup || u.username.toLowerCase() === lookup
    );

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Compare password with bcrypt
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    return res.json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// ────────────────────────────────────────────────
// POST /api/auth/register
// Creates a new user with hashed password
// ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, flat, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const seed = readSeed();
    const lookup = email.toLowerCase().trim();

    // Check duplicate email
    if (seed.users.find(u => u.email.toLowerCase() === lookup)) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate ID
    const maxId = seed.users.reduce((max, u) => {
      const num = parseInt(u.id.replace('USR-', ''), 10);
      return num > max ? num : max;
    }, 0);

    const newUser = {
      id: 'USR-' + (maxId + 1),
      username: email.split('@')[0],
      password: hashedPassword,
      name: name,
      role: role || 'Resident',
      flat: flat || 'C-101',
      email: email,
      phone: phone || '9876543210',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
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

// ────────────────────────────────────────────────
// GET /api/auth/me
// Returns current user profile from JWT
// ────────────────────────────────────────────────
router.get('/me', authenticateToken, (req, res) => {
  return res.json({ success: true, user: req.user });
});

module.exports = router;

/**
 * Smart Society Management System - Authentication Service
 * Server-side auth via /api/auth endpoints with bcrypt + JWT.
 */

// ────────────────────────────────────────────────
// POST /api/auth/login  —  Email/username + password
// ────────────────────────────────────────────────
async function firebaseLoginWithEmail(email, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.success && data.token && data.user) {
      SystemDB.setToken(data.token);
      sessionStorage.setItem('ssm_current_user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    }

    return { success: false, message: data.message || 'Login failed' };
  } catch (err) {
    console.error('Login API error:', err);
    return { success: false, message: 'Server unreachable. Please try again.' };
  }
}

// ────────────────────────────────────────────────
// POST /api/auth/register  —  Create new account
// ────────────────────────────────────────────────
async function firebaseRegisterWithEmail(name, email, password, role, flat) {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, flat }),
    });

    const data = await res.json();

    if (data.success && data.token && data.user) {
      SystemDB.setToken(data.token);
      sessionStorage.setItem('ssm_current_user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    }

    return { success: false, message: data.message || 'Registration failed' };
  } catch (err) {
    console.error('Register API error:', err);
    return { success: false, message: 'Server unreachable. Please try again.' };
  }
}

// ────────────────────────────────────────────────
// Google Sign-In (future: link to server auth)
// ────────────────────────────────────────────────
async function firebaseLoginWithGoogle() {
  return {
    success: false,
    message: 'Google Sign-In will be available in a future update. Please use email/password login.',
  };
}

// ────────────────────────────────────────────────
// Sign out — clear token + session
// ────────────────────────────────────────────────
function firebaseSignOut() {
  SystemDB.clearToken();
  SystemDB.logout();
}

// Keep initFirebaseAuth as a no-op for backward compat with index.html inline script
function initFirebaseAuth() {
  // Server-side auth handles initialization
}

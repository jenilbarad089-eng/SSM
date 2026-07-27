/**
 * Smart Society Management System - Authentication Service
 * Server-side auth via /api/auth endpoints with bcrypt + JWT.
 * Google Sign-In via Firebase SDK (client-side) + server JWT.
 */

const firebaseConfig = {
  apiKey: "AIzaSyAQKGxFLBwKpE-Rg5SkqhXGBNMoLzOz_as",
  authDomain: "smart-sm-c30db.firebaseapp.com",
  projectId: "smart-sm-c30db",
  storageBucket: "smart-sm-c30db.firebasestorage.app",
  messagingSenderId: "730008445249",
  appId: "1:730008445249:web:477cd1cba54490b39481c0",
  measurementId: "G-7WEFSX4VFV"
};

let firebaseApp = null;
let firebaseAuth = null;
let googleProvider = null;
let isFirebaseInitialized = false;

// Initialize Firebase (for Google Auth only)
function initFirebaseAuth() {
  try {
    if (typeof firebase !== 'undefined' && firebase.apps) {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
      } else {
        firebaseApp = firebase.app();
      }
      firebaseAuth = firebase.auth();
      googleProvider = new firebase.auth.GoogleAuthProvider();
      isFirebaseInitialized = true;
      console.log("Firebase initialized for Google Sign-In");
    }
  } catch (err) {
    console.warn("Firebase init skipped:", err);
  }
}

// ────────────────────────────────────────────────
// POST /api/auth/login  —  Email/username + password
// ────────────────────────────────────────────────
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

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.token && data.user) {
        SystemDB.setToken(data.token);
        sessionStorage.setItem('ssm_current_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else if (data.message && data.message.includes('Pending')) {
        return { success: false, message: data.message, status: 'Pending' };
      }
    }
  } catch (err) {
    console.warn('Backend API login unavailable, using SystemDB fallback:', err);
  }

  // Fallback for demo logins & Vercel static deployments
  const lookup = (email || '').toLowerCase().trim();
  let users = (SystemDB.data && SystemDB.data.users) ? SystemDB.data.users : [];

  // Direct email/username match first
  let user = users.find(u =>
    (u.email && u.email.toLowerCase() === lookup) ||
    (u.username && u.username.toLowerCase() === lookup)
  );

  // Demo presets / shorthand fallback matching
  if (!user) {
    if (['admin', 'admin@smartsociety.com', 'jenilbarad089@gmail.com', 'jenilbarad089'].includes(lookup)) {
      user = users.find(u => u.role === 'Admin');
    } else if (['resident', 'resident1', 'amit.patel@gmail.com', 'amit'].includes(lookup)) {
      user = users.find(u => u.email === 'amit.patel@gmail.com');
    } else if (['guard', 'guard@smartsociety.com', 'bahadur'].includes(lookup)) {
      user = users.find(u => u.role === 'Security Guard' && u.gateAssigned === 'Gate 1');
    } else if (['committee', 'suresh@smartsociety.com', 'suresh.treasurer@smartsociety.com', 'suresh'].includes(lookup)) {
      user = users.find(u => u.email === 'suresh.treasurer@smartsociety.com');
    } else if (['rohan', 'rohan.secretary@smartsociety.com'].includes(lookup)) {
      user = users.find(u => u.email === 'rohan.secretary@smartsociety.com');
    } else if (['vikram', 'vikram.yadav@gmail.com'].includes(lookup)) {
      user = users.find(u => u.email === 'vikram.yadav@gmail.com');
    } else if (['priya', 'priya.v@gmail.com'].includes(lookup)) {
      user = users.find(u => u.email === 'priya.v@gmail.com');
    } else if (['rahul', 'rahul.sharma@gmail.com'].includes(lookup)) {
      user = users.find(u => u.email === 'rahul.sharma@gmail.com');
    } else if (['neha', 'neha.gupta@gmail.com'].includes(lookup)) {
      user = users.find(u => u.email === 'neha.gupta@gmail.com');
    } else if (['ananya', 'ananya.d@gmail.com'].includes(lookup)) {
      user = users.find(u => u.email === 'ananya.d@gmail.com');
    }
  }

  if (user) {
    // Skip status check for Approved users — allow all preset member logins
    if (user.status && user.status !== 'Approved') {
      return { success: false, message: `Your account is ${user.status}. Please wait for Admin approval.`, status: user.status };
    }
    sessionStorage.setItem('ssm_current_user', JSON.stringify(user));
    return { success: true, user: user };
  }

  return { success: false, message: 'Invalid email or password. Please check your credentials or use a 1-Click Demo preset.' };
}

// ────────────────────────────────────────────────
// POST /api/auth/register  —  Create new account
// ────────────────────────────────────────────────
async function firebaseRegisterWithEmail(name, email, password, role, extra) {
  try {
    const body = { name, email, password, role, ...(extra || {}) };
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.user) {
        if (data.token) SystemDB.setToken(data.token);
        sessionStorage.setItem('ssm_current_user', JSON.stringify(data.user));
        return { success: true, user: data.user };
      }
    }
  } catch (err) {
    console.warn('Backend API register unavailable, using SystemDB fallback:', err);
  }

  // Fallback registration for Vercel static deployment
  let users = SystemDB.data ? SystemDB.data.users : [];
  const lookup = (email || '').toLowerCase().trim();

  let existing = users.find(u => u.email && u.email.toLowerCase() === lookup);
  if (existing) {
    return { success: false, message: 'An account with this email address already exists.' };
  }

  const newUser = {
    id: 'USR-' + (users.length + 101),
    username: email.split('@')[0],
    name: name,
    email: email,
    role: role || 'Resident',
    status: 'Pending',
    flat: extra || 'A-302',
    registeredAt: new Date().toISOString().split('T')[0]
  };

  users.push(newUser);
  SystemDB.save();
  sessionStorage.setItem('ssm_current_user', JSON.stringify(newUser));

  return { success: true, user: newUser };
}

// ────────────────────────────────────────────────
// ────────────────────────────────────────────────
// Google Sign-In  —  Firebase popup → Server JWT / Client Fallback
// ────────────────────────────────────────────────
async function firebaseLoginWithGoogle() {
  initFirebaseAuth();

  if (!isFirebaseInitialized || !firebaseAuth || !googleProvider) {
    return { success: false, message: 'Google Sign-In is not initialized. Check Firebase SDK.' };
  }

  try {
    const result = await firebaseAuth.signInWithPopup(googleProvider);
    const fbUser = result.user;

    // 1. Try Express Backend API (/api/auth/google)
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          uid: fbUser.uid,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.token && data.user) {
          SystemDB.setToken(data.token);
          sessionStorage.setItem('ssm_current_user', JSON.stringify(data.user));
          return { success: true, user: data.user };
        }
      }
    } catch (apiErr) {
      console.warn("Backend API unavailable, executing client-side auth fallback for Vercel:", apiErr);
    }

    // 2. Client-side fallback for static Vercel hosting
    let users = SystemDB.getUsers();
    let existing = users.find(u => u.email && u.email.toLowerCase() === fbUser.email.toLowerCase());

    if (!existing) {
      const isUserAdmin = fbUser.email.toLowerCase() === 'jenilbarad089@gmail.com';
      existing = {
        id: 'USR-' + (users.length + 101),
        username: fbUser.email.split('@')[0],
        name: fbUser.displayName || fbUser.email.split('@')[0],
        role: isUserAdmin ? 'Admin' : 'Resident',
        flat: isUserAdmin ? 'A-101' : 'B-101',
        email: fbUser.email,
        phone: fbUser.phoneNumber || '',
        avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fbUser.displayName || fbUser.email)}`,
        status: 'Approved',
        registeredAt: new Date().toISOString().split('T')[0]
      };
      users.push(existing);
      SystemDB.saveUsers(users);
    }

    sessionStorage.setItem('ssm_current_user', JSON.stringify(existing));
    return { success: true, user: existing };

  } catch (error) {
    console.error('Google Sign-In error:', error);
    if (error.code === 'auth/unauthorized-domain') {
      return {
        success: false,
        message: 'Domain unauthorized! Please add "societyhub11.vercel.app" to Authorized Domains in Firebase Console > Authentication > Settings.'
      };
    }
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, message: 'Google sign-in window was closed.' };
    }
    return { success: false, message: error.message || 'Google sign-in failed.' };
  }
}

// ────────────────────────────────────────────────
// Sign out — clear token + session
// ────────────────────────────────────────────────
function firebaseSignOut() {
  if (isFirebaseInitialized && firebaseAuth) {
    firebaseAuth.signOut().catch(() => {});
  }
  SystemDB.clearToken();
  SystemDB.logout();
}

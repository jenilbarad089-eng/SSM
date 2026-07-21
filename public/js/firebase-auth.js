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
// Google Sign-In  —  Firebase popup → server JWT
// ────────────────────────────────────────────────
async function firebaseLoginWithGoogle() {
  initFirebaseAuth();

  if (!isFirebaseInitialized || !firebaseAuth || !googleProvider) {
    return { success: false, message: 'Google Sign-In is not available. Please use email/password.' };
  }

  try {
    const result = await firebaseAuth.signInWithPopup(googleProvider);
    const fbUser = result.user;

    // Send Google profile to server to find/create user and get JWT
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

    const data = await res.json();

    if (data.success && data.token && data.user) {
      SystemDB.setToken(data.token);
      sessionStorage.setItem('ssm_current_user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    }

    return { success: false, message: data.message || 'Google sign-in failed on server.' };
  } catch (error) {
    console.error('Google Sign-In error:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, message: 'Sign-in cancelled.' };
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

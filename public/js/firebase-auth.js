/**
 * Smart Society Management System - Firebase Authentication Service
 */

// Firebase Project Configuration
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
      if (typeof firebase.analytics === 'function') {
        try { firebase.analytics(); } catch(e){}
      }
      isFirebaseInitialized = true;
      console.log("Firebase Auth & Analytics Initialized Successfully for project smart-sm-c30db");
    }
  } catch (err) {
    console.warn("Firebase Auth Init Warning (Using fallback simulation if config unlinked):", err);
  }
}

// Real Firebase Email/Password Login
async function firebaseLoginWithEmail(email, password) {
  initFirebaseAuth();
  if (isFirebaseInitialized && firebaseAuth) {
    try {
      const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
      const fbUser = userCredential.user;
      
      // Determine role from database or email prefix
      let role = 'Resident';
      let flat = 'B-204';
      if (email.includes('admin')) { role = 'Admin'; flat = 'A-101'; }
      else if (email.includes('guard')) { role = 'Security Guard'; flat = 'Main Gate 1'; }
      else if (email.includes('committee')) { role = 'Committee Member'; flat = 'A-402'; }

      const sessionUser = {
        id: fbUser.uid,
        username: fbUser.email.split('@')[0],
        name: fbUser.displayName || fbUser.email.split('@')[0],
        role: role,
        flat: flat,
        email: fbUser.email,
        phone: fbUser.phoneNumber || '9876543210',
        avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fbUser.email)}`,
        isFirebaseAuth: true
      };

      sessionStorage.setItem('ssm_current_user', JSON.stringify(sessionUser));
      return { success: true, user: sessionUser };
    } catch (error) {
      console.error("Firebase Login Error:", error);
      // Fallback to local DB check if demo account
      return SystemDB.login(email.split('@')[0], password);
    }
  }
  return SystemDB.login(email.split('@')[0], password);
}

// Real Firebase Registration
async function firebaseRegisterWithEmail(name, email, password, role, flat) {
  initFirebaseAuth();
  if (isFirebaseInitialized && firebaseAuth) {
    try {
      const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
      const fbUser = userCredential.user;
      await fbUser.updateProfile({ displayName: name });

      const newUser = {
        id: fbUser.uid,
        username: email.split('@')[0],
        name: name,
        role: role || 'Resident',
        flat: flat || 'C-101',
        email: email,
        phone: '9876543210',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        isFirebaseAuth: true
      };

      sessionStorage.setItem('ssm_current_user', JSON.stringify(newUser));
      return { success: true, user: newUser };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  return { success: false, message: "Firebase SDK not initialized" };
}

// Real Firebase Google Sign-In Popup
async function firebaseLoginWithGoogle() {
  initFirebaseAuth();
  if (isFirebaseInitialized && firebaseAuth && googleProvider) {
    try {
      const result = await firebaseAuth.signInWithPopup(googleProvider);
      const fbUser = result.user;

      const sessionUser = {
        id: fbUser.uid,
        username: fbUser.email.split('@')[0],
        name: fbUser.displayName || 'Google Resident',
        role: 'Resident',
        flat: 'B-301',
        email: fbUser.email,
        phone: '9876543210',
        avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fbUser.email)}`,
        isFirebaseAuth: true
      };

      sessionStorage.setItem('ssm_current_user', JSON.stringify(sessionUser));
      return { success: true, user: sessionUser };
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      return { success: false, message: error.message };
    }
  }
  return { success: false, message: "Google Auth unavailable" };
}

// Sign out from Firebase
function firebaseSignOut() {
  if (isFirebaseInitialized && firebaseAuth) {
    firebaseAuth.signOut().catch(err => console.error("Firebase SignOut error", err));
  }
  SystemDB.logout();
}

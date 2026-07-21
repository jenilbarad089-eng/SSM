/**
 * Smart Society Management System - Firebase Authentication Service
 */

// Default Firebase Configuration (Users can replace with their Firebase Project Config)
const firebaseConfig = {
  apiKey: "AIzaSyDemoKey_SmartSocietyManagement360",
  authDomain: "smart-society-360.firebaseapp.com",
  projectId: "smart-society-360",
  storageBucket: "smart-society-360.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
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
      isFirebaseInitialized = true;
      console.log("Firebase Auth Initialized Successfully");
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

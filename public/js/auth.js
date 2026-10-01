// SocietyHub Authentication Module
// Handles auth-related functionality bridging to firebase-auth.js and SystemDB

function initAuth() {
  if (typeof initFirebaseAuth === 'function') {
    initFirebaseAuth();
  }
}

async function loginWithEmail(email, password) {
  if (typeof firebaseLoginWithEmail === 'function') {
    return await firebaseLoginWithEmail(email, password);
  }
  return { success: false, message: 'Authentication engine not loaded.' };
}

async function loginWithGoogle() {
  if (typeof firebaseLoginWithGoogle === 'function') {
    return await firebaseLoginWithGoogle();
  }
  return { success: false, message: 'Google Auth not loaded.' };
}

function logout() {
  if (typeof SystemDB !== 'undefined' && SystemDB.logout) {
    SystemDB.logout();
  }
  window.location.href = 'index.html';
}

function checkAuthAndRedirect() {
  if (typeof SystemDB === 'undefined') return;
  const user = SystemDB.getCurrentUser();
  if (user && user.status === 'Approved') {
    switch (user.role) {
      case 'Admin': window.location.href = 'admin.html'; break;
      case 'Resident': window.location.href = 'resident.html'; break;
      case 'Security Guard': window.location.href = 'guard.html'; break;
      case 'Committee Member': window.location.href = 'committee.html'; break;
      default: window.location.href = 'resident.html'; break;
    }
  }
}
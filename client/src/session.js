// Who is signed in. Sign In saves the user's ID here, and every page that
// needs it reads it back, so nobody has to type their user ID again.
//
// TODO: once the backend has real sessions, the server should decide who the
// user is. This is a browser-side convenience, not security.
const USER_ID_KEY = "dashboardUserId";

export function getSignedInUserId() {
  try {
    return sessionStorage.getItem(USER_ID_KEY) || "";
  } catch {
    // Storage can be blocked (private mode); treat that as signed out.
    return "";
  }
}

export function saveSignedInUserId(userId) {
  try {
    sessionStorage.setItem(USER_ID_KEY, userId);
  } catch {
    // Nothing else to do; the user will be asked to sign in again.
  }
}

export function signOut() {
  try {
    sessionStorage.removeItem("dashboardUserId");
  } catch {
    // Storage may be unavailable
  }
}
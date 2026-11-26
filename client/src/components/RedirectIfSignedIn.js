import { Navigate, Outlet } from "react-router-dom";

import { getSignedInUserId } from "../session";

// The opposite of RequireSignIn: for Sign In and Create Account. Someone who
// is already signed in goes straight to the dashboard instead of seeing the
// sign in form again.
function RedirectIfSignedIn({ children }) {
  if (getSignedInUserId()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children ?? <Outlet />;
}

export default RedirectIfSignedIn;

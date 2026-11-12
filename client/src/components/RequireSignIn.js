import { Navigate } from "react-router-dom";

import { getSignedInUserId } from "../session";

// Wraps pages that need a signed-in user. Anyone who isn't signed in is sent
// back to the Sign In page instead of seeing an empty or broken page.
function RequireSignIn({ children }) {
  if (!getSignedInUserId()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default RequireSignIn;
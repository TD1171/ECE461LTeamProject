import { Navigate, Outlet } from "react-router-dom";

import { getSignedInUserId } from "../session";

// Guards pages that need a signed-in user. Anyone who isn't signed in is sent
// back to the Sign In page instead of seeing an empty or broken page.
//
// Use it as a layout route so new pages are protected just by being nested:
//   <Route element={<RequireSignIn />}>
//     <Route path="/dashboard" element={<HomePage />} />
//   </Route>
// Wrapping a single element (<RequireSignIn><Page /></RequireSignIn>) also works.
function RequireSignIn({ children }) {
  if (!getSignedInUserId()) {
    return <Navigate to="/" replace />;
  }
  return children ?? <Outlet />;
}

export default RequireSignIn;

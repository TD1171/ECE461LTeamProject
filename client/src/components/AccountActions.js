import { useNavigate } from "react-router-dom";

import Button from "./Button";
import { getSignedInUserId, signOut } from "../session";

// "Signed in as <id>" plus a Sign Out button, shown in the header of every
// signed-in page so users can always see who they are and sign out from
// anywhere. Anything passed as children (e.g. a "Back to Dashboard" link)
// is shown first, in the same row.
function AccountActions({ children }) {
  const navigate = useNavigate();
  const userId = getSignedInUserId();

  const handleSignOut = () => {
    signOut();
    // replace: the Back button shouldn't return to a page that needs sign in.
    navigate("/", { replace: true });
  };

  return (
    <div className="dashboard-header-actions">
      {children}

      <p className="signed-in-as">
        Signed in as <strong>{userId}</strong>
      </p>

      <Button variant="primary" onClick={handleSignOut}>
        Sign Out
      </Button>
    </div>
  );
}

export default AccountActions;

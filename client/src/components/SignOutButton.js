import { useNavigate } from "react-router-dom";
import { signOut } from "../session";

function SignOutButton() {
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate("/", { replace: true });
  };

  return (
    <button
      type="button"
      className="button button-primary"
      onClick={handleSignOut}
    >
      Sign Out
    </button>
  );
}

export default SignOutButton;
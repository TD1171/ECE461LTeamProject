import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { signIn } from "../api/usersApi";
import StatusMessage from "../components/StatusMessage";
import { saveSignedInUserId } from "../session";
import { USER_ID_MAX_LENGTH } from "../validation";

function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    // Only the ID is trimmed; spaces can be part of a password.
    const trimmedId = userId.trim();
    if (!trimmedId || !password) {
      setError("User ID and password are required.");
      return;
    }

    // Disable the button while waiting so a double click sends one request.
    setSubmitting(true);
    try {
      const user = await signIn({ userId: trimmedId, password });
      // Remember who signed in so other pages don't ask for the user ID again.
      saveSignedInUserId(user.userId);
      navigate("/dashboard");
    } catch (requestError) {
      // ApiError messages are already user-friendly (server text or fallback).
      setError(requestError.message);
      setSubmitting(false);
    }
  };

  return (
    <section className="account-page">
      <div className="account-card">
        <h1>Sign In</h1>

        <form onSubmit={handleSubmit}>
          <label htmlFor="user-id">User ID</label>
          <input
            id="user-id"
            type="text"
            maxLength={USER_ID_MAX_LENGTH}
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button
            className="button button-primary account-button"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>

          <StatusMessage type="error">{error}</StatusMessage>
        </form>

        <Link to="/create-account">Create Account</Link>
      </div>
    </section>
  );
}

export default LoginPage;
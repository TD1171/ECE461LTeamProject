import { useState } from "react";
import { Link } from "react-router-dom";

import { createAccount } from "../api/usersApi";
import StatusMessage from "../components/StatusMessage";
import { USER_ID_MAX_LENGTH } from "../validation";

function CreateAccountPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Separate so a failure never looks like the success message.
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    // Only the ID is trimmed; spaces can be part of a password.
    const trimmedId = userId.trim();
    if (!trimmedId || !password) {
      setError("User ID and password are required.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Disable the button while waiting so a double click sends one request.
    setSubmitting(true);
    try {
      await createAccount({ userId: trimmedId, password });
      setSuccess("Account created successfully.");
    } catch (requestError) {
      // ApiError messages are already user-friendly (server text or fallback).
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="account-page">
      <div className="account-card">
        <h1>Create Account</h1>

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

          <label htmlFor="confirm-password">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          <button
            className="button button-primary account-button"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Create Account"}
          </button>

          <StatusMessage type="error">{error}</StatusMessage>
          <StatusMessage type="success">{success}</StatusMessage>
        </form>

        <Link to="/">Back to Sign In</Link>
      </div>
    </section>
  );
}

export default CreateAccountPage;
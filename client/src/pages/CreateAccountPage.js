import { useState } from "react";
import { Link } from "react-router-dom";

import { createAccount } from "../api/usersApi";
import StatusMessage from "../components/StatusMessage";

function CreateAccountPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Separate so a failure never looks like the success message.
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!userId || !password || !confirmPassword) {
      setError("Please fill out all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await createAccount({ userId, password });
      setSuccess("Account created successfully.");
    } catch (requestError) {
      // ApiError messages are already user-friendly (server text or fallback).
      setError(requestError.message);
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

          <button className="button button-primary account-button" type="submit">
            Create Account
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
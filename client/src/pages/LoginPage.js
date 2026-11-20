import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { signIn } from "../api/usersApi";
import StatusMessage from "../components/StatusMessage";
import { saveSignedInUserId } from "../session";

function LoginPage() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!userId || !password) {
      setError("Please enter your User ID and password.");
      return;
    }

    try {
      const user = await signIn({ userId, password });
      // Remember who signed in so other pages don't ask for the user ID again.
      saveSignedInUserId(user.userId);
      navigate("/dashboard");
    } catch (requestError) {
      // ApiError messages are already user-friendly (server text or fallback).
      setError(requestError.message);
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
          >
            Sign In
          </button>

          <StatusMessage type="error">{error}</StatusMessage>
        </form>

        <Link to="/create-account">Create Account</Link>
      </div>
    </section>
  );
}

export default LoginPage;
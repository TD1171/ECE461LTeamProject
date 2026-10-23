import { Link } from "react-router-dom";

function LoginPage() {
  return (
    <section className="checkout-page">
      <h1 className="page-title">Welcome to HardwareShare</h1>

      <div className="checkout-content">
        <h2>Log In or Sign Up</h2>
        <p>Sign in to access your projects and hardware resources.</p>

        <p>Login functionality is coming soon.</p>

        <nav className="dashboard-links">
            <Link to="/create-account">Sign Up</Link>
            <Link to="/dashboard">Continue to Dashboard (Demo)</Link>
        </nav>
      </div>
    </section>
  );
}

export default LoginPage;
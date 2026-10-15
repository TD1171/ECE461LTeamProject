import { Link } from "react-router-dom";

function HomePage() {
  return (
    <section className="checkout-page">
      <h1 className="page-title">HardwareShare Dashboard</h1>

      <div className="checkout-content">
        <p>Welcome to HardwareShare! Manage your projects and hardware resources.</p>

        <nav className="dashboard-links">
          <Link to="/hardware">Hardware Checkout</Link>
          <Link to="/projects/new">Create Project</Link>
          <Link to="/create-account">Create Account</Link>
        </nav>
      </div>
    </section>
  );
}

export default HomePage;

import { Link } from "react-router-dom";

function HomePage() {
  return (
    <section className="checkout-page">
      <h1 className="page-title">My Dashboard</h1>

      <div className="checkout-content">
        <p>Welcome to HardwareShare! Manage your projects and hardware resources.</p>

        <div>
          <h2>My Projects</h2>

          <nav className="dashboard-links">
            <Link to="/projects/new">+ Create Project</Link>
            <Link to="/projects/join">Join Project</Link>
          </nav>

          <h3>No projects to display yet</h3>
          <p>
            Your projects will appear here once login and
            project integration are complete.
          </p>
        </div>
      </div>
    </section>
  );
}

export default HomePage;

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { fetchUserProjects } from "../api/projectsApi";
import ProjectCard from "../components/ProjectCard";
import { getSignedInUserId } from "../session";

function HomePage() {
  // RequireSignIn only lets signed-in users reach this page.
  const userId = getSignedInUserId();
  const [projects, setProjects] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Only one project's snippet is open at a time; null means none.
  const [expandedId, setExpandedId] = useState(null);

  const toggleProject = (projectId) => {
    setExpandedId((current) => (current === projectId ? null : projectId));
  };

  // Load the signed-in user's projects as soon as the page opens.
  useEffect(() => {
    // Ignore a slow response if the page has already closed.
    let active = true;
    setLoading(true);
    setError("");

    fetchUserProjects(userId)
      .then((userProjects) => {
        if (!active) return;
        setProjects(userProjects);
        setLoaded(true);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return (
    <section className="checkout-page">
      <header className="page-header">
        <h1 className="page-title">My Dashboard</h1>
        <p className="signed-in-as">Signed in as <strong>{userId}</strong></p>
      </header>

      <div className="checkout-content">
        <p>Welcome to HardwareShare! Manage your projects and hardware resources.</p>
  

        <div>
          <h2>My Projects</h2>

          {/* Two columns: project list on the left, actions on the right. */}
          <div className="dashboard-layout">
            <div className="dashboard-main">
              {loading && <p className="loading-message">Loading your projects...</p>}
              {error && <p className="error-banner" role="alert">{error}</p>}

              {loaded && !loading && projects.length === 0 && (
                <p className="empty-state">
                  You don't belong to any projects yet. Create one or join one.
                </p>
              )}

              {projects.length > 0 && (
                <ul className="project-list" aria-label="My projects">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.projectId}
                      project={project}
                      expanded={expandedId === project.projectId}
                      onToggle={() => toggleProject(project.projectId)}
                    />
                  ))}
                </ul>
              )}
            </div>

            <nav className="dashboard-links dashboard-actions" aria-label="Project actions">
              <Link to="/projects/new">+ Create Project</Link>
              <Link to="/projects/join">Join Project</Link>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HomePage;
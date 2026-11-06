import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { fetchHardwareSets } from "../api/hardwareApi";
import { fetchProject, leaveProject } from "../api/projectsApi";
import Button from "../components/Button";
import { getSignedInUserId } from "../session";

// Full page for one project, reached from /projects/:projectId.
// Issue #7: members see the project's info and hardware options.
// Issue #9: members can leave the project from here.
function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  // RequireSignIn only lets signed-in users reach this page.
  const userId = getSignedInUserId();

  const [project, setProject] = useState(null);
  const [hardwareSets, setHardwareSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hardwareError, setHardwareError] = useState("");
  // Members list starts closed; clicking "Members (n)" opens it.
  const [membersOpen, setMembersOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  useEffect(() => {
    // Ignore a slow response if the user has already moved to another project.
    let active = true;
    setLoading(true);
    setError("");
    setHardwareError("");

    // Load the project and the hardware list at the same time. A hardware
    // failure still lets the rest of the page show.
    Promise.allSettled([fetchProject(projectId), fetchHardwareSets()])
      .then(([projectResult, hardwareResult]) => {
        if (!active) return;

        if (projectResult.status === "fulfilled") {
          setProject(projectResult.value);
        } else {
          setProject(null);
          setError(projectResult.reason.message);
        }

        if (hardwareResult.status === "fulfilled") {
          setHardwareSets(hardwareResult.value);
        } else {
          setHardwareError(hardwareResult.reason.message);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const handleLeave = async () => {
    const confirmed = window.confirm(
      `Leave ${project.projectName}? You can rejoin later with the project ID.`
    );
    if (!confirmed) return;

    setLeaving(true);
    setLeaveError("");
    try {
      await leaveProject({ projectId: project.projectId, userId });
      // The dashboard reloads the list, so the project is gone from it.
      navigate("/dashboard");
    } catch (requestError) {
      setLeaveError(requestError.message);
      setLeaving(false);
    }
  };

  const isMember = Boolean(project && userId && project.users.includes(userId));
  // Hardware this project has checked out, keyed by hardware set name.
  const checkedOut = project?.hwSets || {};

  return (
    <section className="checkout-page">
      <header className="page-header">
        {/* Title with the project ID tucked right underneath it. */}
        <div className="project-heading">
          <h1 className="page-title">
            {isMember ? project.projectName : "Project"}
          </h1>
          {isMember && (
            <p className="project-id-line">Project ID: {project.projectId}</p>
          )}
        </div>
        <Link className="page-header-link" to="/dashboard">Back to Dashboard</Link>
      </header>

      <div className="checkout-content">
        {loading && <p className="loading-message">Loading project...</p>}
        {error && <p className="error-banner" role="alert">{error}</p>}

        {/* Only members get to see a project's details. */}
        {project && !loading && !isMember && (
          <p className="empty-state">
            You are not a member of this project.{" "}
            <Link to="/projects/join">Join a project</Link> to see its details.
          </p>
        )}

        {isMember && !loading && (
          // Two columns: description and hardware on the left, members on the right.
          <div className="project-page-layout">
            <div className="project-page-main">
              <div>
                <h2>Description</h2>
                <p>{project.description || "No description yet."}</p>
              </div>

              <div>
                <h2>Hardware</h2>
                {hardwareError && (
                  <p className="error-banner" role="alert">{hardwareError}</p>
                )}
                {!hardwareError && hardwareSets.length === 0 && (
                  <p className="empty-state">No hardware sets are available yet.</p>
                )}
                {hardwareSets.length > 0 && (
                  <table className="project-hardware-table" aria-label="Hardware options">
                    <thead>
                      <tr>
                        <th scope="col">Hardware set</th>
                        <th scope="col">Available</th>
                        <th scope="col">Checked out by this project</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hardwareSets.map((hardware) => (
                        <tr key={hardware.name}>
                          <th scope="row">{hardware.name}</th>
                          <td>{hardware.available} / {hardware.capacity}</td>
                          <td>{checkedOut[hardware.name] || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <nav className="dashboard-links">
                  <Link to="/hardware">Hardware Checkout</Link>
                </nav>
              </div>
            </div>

            <aside className="project-members">
              <h2 className="members-heading">
                <button
                  type="button"
                  className="members-toggle"
                  aria-expanded={membersOpen}
                  aria-controls="project-members-list"
                  onClick={() => setMembersOpen((open) => !open)}
                >
                  Members ({project.users.length})
                  <span aria-hidden="true">{membersOpen ? " ▾" : " ▸"}</span>
                </button>
              </h2>
              {membersOpen && (
                <ul id="project-members-list" aria-label="Members">
                  {project.users.map((memberId) => (
                    <li key={memberId}>{memberId}</li>
                  ))}
                </ul>
              )}

              <div className="leave-project">
                <Button
                  className="button-danger"
                  onClick={handleLeave}
                  disabled={leaving}
                >
                  {leaving ? "Leaving..." : "Leave Project"}
                </Button>
                {leaveError && (
                  <p className="error-banner" role="alert">{leaveError}</p>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

export default ProjectPage;
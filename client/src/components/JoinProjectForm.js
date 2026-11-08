import { useState } from "react";

import { joinProject } from "../api/projectsApi";
import { getSignedInUserId } from "../session";
import Button from "./Button";

// The join form on its own, so both the dashboard's Join Project tab and the
// /projects/join page can use it. onJoined runs after a successful join.
function JoinProjectForm({ onJoined }) {
  const [projectId, setProjectId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [joinedProject, setJoinedProject] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setJoinedProject(null);

    const trimmedId = projectId.trim();
    if (!trimmedId) {
      setError("Project ID is required.");
      return;
    }

    setSubmitting(true);
    try {
      // Join as whoever is signed in.
      const project = await joinProject({
        projectId: trimmedId,
        userId: getSignedInUserId(),
      });
      setJoinedProject(project);
      setProjectId("");
      if (onJoined) onJoined(project);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <div className="field-row">
        <label htmlFor="join-project-id">Project ID</label>
        <input
          id="join-project-id"
          name="projectId"
          type="text"
          maxLength={32}
          placeholder="Project ID shared by a teammate"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
        />
      </div>

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? "Joining..." : "Join"}
      </Button>

      {error && <p className="error-banner" role="alert">{error}</p>}
      {joinedProject && (
        <p className="request-message" role="status">
          Joined "{joinedProject.projectName}" (Project ID: {joinedProject.projectId}).
        </p>
      )}
    </form>
  );
}

export default JoinProjectForm;
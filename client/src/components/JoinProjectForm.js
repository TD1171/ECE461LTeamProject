import { useState } from "react";

import { joinProject } from "../api/projectsApi";
import { getSignedInUserId } from "../session";
import { getProjectIdError, PROJECT_ID_MAX_LENGTH } from "../validation";
import Button from "./Button";
import StatusMessage from "./StatusMessage";

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

    // Same Project ID rule as Create Project, so a typo is caught right away.
    const validationError = getProjectIdError(projectId);
    if (validationError) {
      setError(validationError);
      return;
    }
    const trimmedId = projectId.trim();

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
          maxLength={PROJECT_ID_MAX_LENGTH}
          placeholder="Project ID shared by a teammate"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
        />
      </div>

      <Button type="submit" variant="primary" disabled={submitting}>
        {submitting ? "Joining..." : "Join"}
      </Button>

      <StatusMessage type="error">{error}</StatusMessage>
      {joinedProject && (
        <StatusMessage type="success">
          Joined "{joinedProject.projectName}" (Project ID: {joinedProject.projectId}).
        </StatusMessage>
      )}
    </form>
  );
}

export default JoinProjectForm;
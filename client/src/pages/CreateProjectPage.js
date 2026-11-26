import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createProject } from "../api/projectsApi";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import StatusMessage from "../components/StatusMessage";
import { getSignedInUserId } from "../session";
import { getProjectIdError, PROJECT_ID_MAX_LENGTH } from "../validation";

const EMPTY_FORM = { projectName: "", projectId: "", description: "" };

function CreateProjectPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdProject, setCreatedProject] = useState(null);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setCreatedProject(null);

    // Check here first so simple mistakes don't need a round trip.
    const validationError = form.projectName.trim()
      ? getProjectIdError(form.projectId)
      : "Project name is required.";
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      // The signed-in user becomes the project's first member.
      const project = await createProject({ ...form, userId: getSignedInUserId() });
      setCreatedProject(project);
      setForm(EMPTY_FORM);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="checkout-page">
      <PageHeader title="Create Project" />

      <div className="checkout-content">
        <form className="project-form" onSubmit={handleSubmit}>
          <div className="field-row">
            <label htmlFor="project-name">Project Name</label>
            <input
              id="project-name"
              name="projectName"
              type="text"
              maxLength={100}
              placeholder="Project Name"
              value={form.projectName}
              onChange={updateField}
            />
          </div>

          <div className="field-row">
            <label htmlFor="project-id">Project ID</label>
            <input
              id="project-id"
              name="projectId"
              type="text"
              maxLength={PROJECT_ID_MAX_LENGTH}
              placeholder="Project ID (letters, numbers, - or _)"
              value={form.projectId}
              onChange={updateField}
            />
          </div>

          <div className="field-row">
            <label htmlFor="project-description">Description</label>
            <textarea
              id="project-description"
              name="description"
              rows={4}
              maxLength={1000}
              placeholder="What is this project for?"
              value={form.description}
              onChange={updateField}
            />
          </div>

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create Project"}
          </Button>

          <StatusMessage type="error">{error}</StatusMessage>
          {createdProject && (
            <div className="project-created">
              <StatusMessage type="success">
                Created "{createdProject.projectName}" (Project ID: {createdProject.projectId}).
              </StatusMessage>
              {/* Only shows after the server accepts the project, so the
                  ID is guaranteed to exist and the user is already a member. */}
              <Button
                variant="primary"
                onClick={() =>
                  navigate(`/projects/${encodeURIComponent(createdProject.projectId)}`)
                }
              >
                Go to Project
              </Button>
            </div>
          )}
        </form>
      </div>
    </section>
  );
}

export default CreateProjectPage;
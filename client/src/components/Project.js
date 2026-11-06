import { useState } from "react";

import HardwareSetRow from "./HardwareSetRow";
import Button from "./Button";

function Project({
  project,
  hardware,
  onUpdateHardware,
  onUpdateMembership,
  onUpdateProject,
}) {
  const canManageHardware = project.relationship !== "available";
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [projectId, setProjectId] = useState(project.id);
  const [description, setDescription] = useState(project.description);

  const saveProject = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedId = projectId.trim();
    if (!trimmedName || !trimmedId) return;

    onUpdateProject(project.id, {
      id: trimmedId,
      name: trimmedName,
      description: description.trim(),
    });
    setEditing(false);
  };

  const cancelEditing = () => {
    setName(project.name);
    setProjectId(project.id);
    setDescription(project.description);
    setEditing(false);
  };

  return (
    <article className="project-card" aria-label={`${project.name} project`}>
      <header className="project-card-header">
        <div>
          <h3>{project.name}</h3>
          <p className="project-id">{project.id}</p>
        </div>
        <div className="project-card-meta">
          <p className="project-members">Members: {project.members.join(", ")}</p>
          {project.relationship === "owner" && (
            <Button onClick={() => setEditing(true)}>Edit</Button>
          )}
          {project.relationship === "member" && (
            <Button onClick={() => onUpdateMembership(project.id, "available")}>
              Leave
            </Button>
          )}
          {project.relationship === "available" && (
            <Button
              variant="primary"
              onClick={() => onUpdateMembership(project.id, "member")}
            >
              Join
            </Button>
          )}
        </div>
      </header>

      {editing ? (
        <form className="project-edit-form" onSubmit={saveProject}>
          <label htmlFor={`${project.id}-edit-name`}>Project Name</label>
          <input
            id={`${project.id}-edit-name`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <label htmlFor={`${project.id}-edit-id`}>Project ID</label>
          <input
            id={`${project.id}-edit-id`}
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            required
          />
          <label htmlFor={`${project.id}-edit-description`}>Description</label>
          <textarea
            id={`${project.id}-edit-description`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows="3"
          />
          <div className="project-edit-actions">
            <Button type="submit" variant="primary">Save</Button>
            <Button onClick={cancelEditing}>Cancel</Button>
          </div>
        </form>
      ) : (
        <p className="project-description">{project.description}</p>
      )}

      <div className="project-hardware-list">
        {hardware.map((item) => (
          <HardwareSetRow
            key={item.name}
            hardware={item}
            checkedOut={project.checkedOut[item.name] || 0}
            projectId={project.id}
            disabled={!canManageHardware}
            onUpdateHardware={onUpdateHardware}
          />
        ))}
      </div>
      {!canManageHardware && (
        <p className="join-project-note">Join this project to check hardware in or out.</p>
      )}
    </article>
  );
}

export default Project;

// Project API calls. Request/response handling lives in ./client.
import { requestJson } from "./client";

// Base URL for one project; IDs are encoded so any character is safe in the path.
const projectPath = (projectId) => `/api/projects/${encodeURIComponent(projectId)}`;

export function createProject({ projectName, projectId, description, userId }) {
  return requestJson("/api/projects", {
    method: "POST",
    body: { projectName, projectId, description, userId },
  });
}

export function joinProject({ projectId, userId }) {
  return requestJson(`${projectPath(projectId)}/users`, {
    method: "POST",
    body: { userId },
  });
}

export function leaveProject({ projectId, userId }) {
  return requestJson(
    `${projectPath(projectId)}/users/${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
}

export function fetchProject(projectId) {
  return requestJson(projectPath(projectId));
}

export async function fetchProjects() {
  const payload = await requestJson("/api/projects");
  return payload.projects;
}

export async function fetchUserProjects(userId) {
  const payload = await requestJson(
    `/api/users/${encodeURIComponent(userId)}/projects`
  );
  return payload.projects;
}

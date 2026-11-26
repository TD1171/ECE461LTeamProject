// Form rules shared by more than one page. Checking these in the browser gives
// instant feedback; the server still checks everything, so these must match
// the backend rules or users will see two different answers.

// Same rule as PROJECT_ID_PATTERN in server/projectsDatabase.py.
export const PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
export const PROJECT_ID_MAX_LENGTH = 32;

// The backend has no limit yet; this just stops absurdly long IDs.
export const USER_ID_MAX_LENGTH = 64;

// Returns an error message for a Project ID, or "" when it is valid.
// Wording matches the server's message for the same mistake.
export function getProjectIdError(projectId) {
  const trimmed = projectId.trim();
  if (!trimmed) {
    return "Project ID is required.";
  }
  if (!PROJECT_ID_PATTERN.test(trimmed)) {
    return "Project ID must be 1-32 characters using letters, numbers, hyphens, or underscores.";
  }
  return "";
}

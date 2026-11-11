// User account API calls. Request/response handling lives in ./client.
import { requestJson } from "./client";

// Returns the signed-in user, e.g. { userId, username, projects }.
export async function signIn({ userId, password }) {
  const payload = await requestJson("/login", {
    method: "POST",
    body: { userId, password },
    errorMessage: "Unable to sign in.",
  });
  return payload.user;
}

// Returns the newly created user. The server responds 409 if the ID is taken.
export async function createAccount({ userId, password }) {
  const payload = await requestJson("/add_user", {
    method: "POST",
    body: { userId, password },
    errorMessage: "Unable to create account.",
  });
  return payload.user;
}

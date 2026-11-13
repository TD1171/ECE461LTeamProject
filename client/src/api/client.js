// Shared HTTP helper for every API module (hardwareApi, projectsApi, ...).
//
// Every backend route speaks JSON and reports failures as { "error": "..." }
// with a non-2xx status. requestJson hides that contract, so callers only deal
// with two outcomes: a parsed payload, or a thrown ApiError whose message is
// safe to show to the user.

export const NETWORK_ERROR_MESSAGE = "Unable to connect to the server.";
const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

export class ApiError extends Error {
  // status is the HTTP status code, or 0 when the server could not be reached.
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Send a request and return the parsed JSON body.
 *
 * @param {string} path                    URL path, e.g. "/api/projects".
 * @param {object} [options]
 * @param {string} [options.method="GET"]  HTTP method.
 * @param {*}      [options.body]          Plain value; serialized to JSON here.
 * @param {string} [options.errorMessage]  Shown when the server sends no error text.
 * @returns {Promise<object>} The parsed response body.
 * @throws {ApiError} On network failure or a non-2xx response.
 */
export async function requestJson(
  path,
  { method = "GET", body, errorMessage = DEFAULT_ERROR_MESSAGE } = {}
) {
  const init = { method, headers: { Accept: "application/json" } };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(path, init);
  } catch {
    // fetch only rejects when no response arrived at all (server down,
    // offline, CORS). HTTP error statuses are handled below.
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
  }

  // Some responses (e.g. a proxy error page) are not JSON; treat them as empty.
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error || errorMessage, response.status);
  }
  return payload;
}

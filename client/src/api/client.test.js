import { ApiError, NETWORK_ERROR_MESSAGE, requestJson } from "./client";

// Stub fetch with a response that has the given status and JSON body.
function mockFetchResponse(status, payload) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  });
}

afterEach(() => {
  delete global.fetch;
});

test("GET sends no body and returns the parsed payload", async () => {
  mockFetchResponse(200, { hardware: [] });

  await expect(requestJson("/api/hardware")).resolves.toEqual({ hardware: [] });

  const [path, init] = global.fetch.mock.calls[0];
  expect(path).toBe("/api/hardware");
  expect(init.method).toBe("GET");
  expect(init.body).toBeUndefined();
  expect(init.headers["Content-Type"]).toBeUndefined();
});

test("POST serializes the body as JSON", async () => {
  mockFetchResponse(201, {});

  await requestJson("/api/projects", { method: "POST", body: { projectId: "p1" } });

  const [, init] = global.fetch.mock.calls[0];
  expect(init.headers["Content-Type"]).toBe("application/json");
  expect(init.body).toBe(JSON.stringify({ projectId: "p1" }));
});

test("throws an ApiError with the server's message and status", async () => {
  mockFetchResponse(409, { error: "Project ID 'p1' is already taken." });

  const error = await requestJson("/api/projects").catch((e) => e);

  expect(error).toBeInstanceOf(ApiError);
  expect(error.message).toBe("Project ID 'p1' is already taken.");
  expect(error.status).toBe(409);
});

test("falls back to the caller's message when the server sends none", async () => {
  // e.g. a proxy returns an HTML error page instead of JSON.
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 502,
    json: () => Promise.reject(new SyntaxError("not JSON")),
  });

  await expect(
    requestJson("/api/hardware", { errorMessage: "Unable to load hardware information." })
  ).rejects.toThrow("Unable to load hardware information.");
});

test("reports an unreachable server as a network error", async () => {
  global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

  const error = await requestJson("/api/hardware").catch((e) => e);

  expect(error.message).toBe(NETWORK_ERROR_MESSAGE);
  expect(error.status).toBe(0);
});

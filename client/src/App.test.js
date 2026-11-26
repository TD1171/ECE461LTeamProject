import { render, screen } from "@testing-library/react";

import App from "./App";

// App has its own BrowserRouter, so tests pick the starting URL through
// window.history before rendering.
function renderAt(path) {
  window.history.pushState({}, "", path);
  render(<App />);
}

beforeEach(() => {
  // The dashboard loads the user's projects; an empty list is enough here.
  jest.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ projects: [] }),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  sessionStorage.clear();
});

test("signed-out visitors are sent to Sign In from app pages", () => {
  renderAt("/projects/new");

  expect(screen.getByRole("heading", { name: "Sign In" })).toBeTruthy();
});

test("signed-in users skip Sign In and land on the dashboard", async () => {
  sessionStorage.setItem("dashboardUserId", "sydney");
  renderAt("/");

  expect(await screen.findByRole("heading", { name: "My Dashboard" })).toBeTruthy();
});

test("signed-in users skip Create Account too", async () => {
  sessionStorage.setItem("dashboardUserId", "sydney");
  renderAt("/create-account");

  expect(await screen.findByRole("heading", { name: "My Dashboard" })).toBeTruthy();
});

test("unknown URLs fall back to Sign In", () => {
  renderAt("/does-not-exist");

  expect(screen.getByRole("heading", { name: "Sign In" })).toBeTruthy();
});

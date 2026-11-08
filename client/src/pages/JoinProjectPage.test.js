import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import JoinProjectPage from "./JoinProjectPage";

beforeEach(() => {
  // Pretend "sydney" signed in, the same way LoginPage does.
  sessionStorage.setItem("dashboardUserId", "sydney");
});

afterEach(() => {
  jest.restoreAllMocks();
  sessionStorage.clear();
});

function renderPage() {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <JoinProjectPage />
    </MemoryRouter>
  );
}

function mockFetch(status, body) {
  jest.spyOn(global, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  });
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Project ID"), {
    target: { value: " robot-arm " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Join" }));
}

test("joins as the signed-in user and shows a confirmation", async () => {
  mockFetch(200, { projectName: "Robot Arm", projectId: "robot-arm" });
  renderPage();

  fillAndSubmit();

  expect(await screen.findByRole("status")).toHaveTextContent("Robot Arm");
  expect(global.fetch).toHaveBeenCalledWith(
    "/api/projects/robot-arm/users",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ userId: "sydney" }),
    })
  );
});

test("does not ask for a user ID", () => {
  renderPage();

  expect(screen.queryByLabelText("User ID")).toBeNull();
});

test("shows the server's error when already a member", async () => {
  mockFetch(409, { error: "You are already a member of project 'robot-arm'." });
  renderPage();

  fillAndSubmit();

  expect(await screen.findByRole("alert")).toHaveTextContent("already a member");
});

test("shows the server's error for an unknown project", async () => {
  mockFetch(404, { error: "Project 'robot-arm' was not found." });
  renderPage();

  fillAndSubmit();

  expect(await screen.findByRole("alert")).toHaveTextContent("not found");
});

test("requires a project ID before calling the server", async () => {
  jest.spyOn(global, "fetch");
  renderPage();

  fireEvent.click(screen.getByRole("button", { name: "Join" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("required");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("links back to the dashboard", () => {
  renderPage();

  expect(screen.getByRole("link", { name: "Back to Dashboard" })).toHaveAttribute("href", "/dashboard");
});
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ProjectPage from "./ProjectPage";

const ROBOT_ARM = {
  projectName: "Robot Arm",
  projectId: "robot-arm",
  description: "Senior design prototype",
  hwSets: { HWSet1: 5 },
  users: ["sydney", "alice"],
};

const HARDWARE = [
  { name: "HWSet1", capacity: 100, available: 80 },
  { name: "HWSet2", capacity: 100, available: 90 },
];

beforeEach(() => {
  // Pretend "sydney" signed in, the same way LoginPage does.
  sessionStorage.setItem("dashboardUserId", "sydney");
});

afterEach(() => {
  sessionStorage.clear();
  jest.restoreAllMocks();
});

function renderPage(projectId = "robot-arm") {
  render(
    <MemoryRouter
      initialEntries={[`/projects/${projectId}`]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectPage />} />
        <Route path="/dashboard" element={<h1>Dashboard page</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

function reply(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  });
}

// Answers each request by its URL and method, so the project, hardware,
// leave, check out and check in calls can each get their own response.
function mockServer({
  project = [200, ROBOT_ARM],
  hardware = [200, { hardware: HARDWARE }],
  leave = [200, { ...ROBOT_ARM, users: ["alice"] }],
  checkOut = [200, {
    hardware: { name: "HWSet1", capacity: 100, available: 77 },
    project: { ...ROBOT_ARM, hwSets: { HWSet1: 8 } },
  }],
  checkIn = [200, {
    hardware: { name: "HWSet1", capacity: 100, available: 82 },
    project: { ...ROBOT_ARM, hwSets: { HWSet1: 3 } },
  }],
} = {}) {
  return jest.spyOn(global, "fetch").mockImplementation((url, options = {}) => {
    if (url === "/api/hardware") return reply(...hardware);
    if (url === "/check_out") return reply(...checkOut);
    if (url === "/check_in") return reply(...checkIn);
    if (options.method === "DELETE") return reply(...leave);
    return reply(...project);
  });
}

function hardwareRow(name) {
  return screen.getByLabelText(`${name} controls`);
}

function setQuantity(name, value) {
  fireEvent.change(screen.getByLabelText(`Quantity for ${name} in robot-arm`), {
    target: { value },
  });
}

function clickIn(name, buttonName) {
  const row = hardwareRow(name);
  fireEvent.click(
    [...row.querySelectorAll("button")].find((button) => button.textContent === buttonName)
  );
}

// --- #7: View Project Details ---------------------------------------------

test("loads and shows the project's details for a member", async () => {
  const fetchSpy = mockServer();
  renderPage();

  expect(await screen.findByRole("heading", { name: "Robot Arm" })).toBeTruthy();
  expect(screen.getByText("Project ID: robot-arm")).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Description" })).toBeTruthy();
  expect(screen.getByText("Senior design prototype")).toBeTruthy();
  expect(fetchSpy.mock.calls.map(([url]) => url)).toContain("/api/projects/robot-arm");
});

test("shows every hardware set with availability and this project's usage", async () => {
  mockServer();
  renderPage();

  await screen.findByRole("heading", { name: "Robot Arm" });
  expect(hardwareRow("HWSet1").textContent).toContain("Available: 80 / 100");
  expect(hardwareRow("HWSet2").textContent).toContain("Available: 90 / 100");
  expect(screen.getByText("Checked out by this project: 5")).toBeTruthy();
  expect(screen.getByText("Checked out by this project: 0")).toBeTruthy();
});

test("still shows the project when hardware fails to load", async () => {
  mockServer({ hardware: [503, { error: "Hardware inventory is temporarily unavailable." }] });
  renderPage();

  expect(await screen.findByRole("heading", { name: "Robot Arm" })).toBeTruthy();
  expect(screen.getByRole("alert").textContent).toBe(
    "Hardware inventory is temporarily unavailable."
  );
});

test("hides details from a signed-in user who is not a member", async () => {
  sessionStorage.setItem("dashboardUserId", "bob");
  mockServer();
  renderPage();

  expect(await screen.findByText(/You are not a member of this project/)).toBeTruthy();
  expect(screen.queryByText("Senior design prototype")).toBeNull();
  expect(screen.queryByRole("button", { name: "Leave Project" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Check Out" })).toBeNull();
  expect(
    screen.getByRole("link", { name: "Join a project" }).getAttribute("href")
  ).toBe("/projects/join");
});

test("shows the server error for a missing project", async () => {
  mockServer({ project: [404, { error: "Project not found." }] });
  renderPage("ghost");

  expect((await screen.findByRole("alert")).textContent).toBe("Project not found.");
});

test("has a link back to the dashboard", async () => {
  mockServer({ project: [404, { error: "Project not found." }] });
  renderPage();
  await screen.findByRole("alert"); // let the fetch finish first

  expect(
    screen.getByRole("link", { name: "Back to Dashboard" }).getAttribute("href")
  ).toBe("/dashboard");
});

test("members list is closed until the Members tab is clicked", async () => {
  mockServer();
  renderPage();

  const toggle = await screen.findByRole("button", { name: /Members \(2\)/ });
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByText("alice")).toBeNull();

  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByText("sydney")).toBeTruthy();
  expect(screen.getByText("alice")).toBeTruthy();

  fireEvent.click(toggle);
  expect(screen.queryByText("alice")).toBeNull();
});

// --- #18-#24: Check out and check in hardware -----------------------------

test("checking out sends the request and shows the server's new numbers", async () => {
  const fetchSpy = mockServer();
  renderPage();
  await screen.findByRole("heading", { name: "Robot Arm" });

  setQuantity("HWSet1", "3");
  clickIn("HWSet1", "Check Out");

  expect(await screen.findByText("Checked out 3 unit(s).")).toBeTruthy();
  expect(hardwareRow("HWSet1").textContent).toContain("Available: 77 / 100");
  expect(screen.getByText("Checked out by this project: 8")).toBeTruthy();

  const call = fetchSpy.mock.calls.find(([url]) => url === "/check_out");
  expect(call[1].method).toBe("POST");
  expect(JSON.parse(call[1].body)).toEqual({
    projectId: "robot-arm",
    hardwareName: "HWSet1",
    quantity: 3,
  });
});

test("checking in sends the request and shows the server's new numbers", async () => {
  const fetchSpy = mockServer();
  renderPage();
  await screen.findByRole("heading", { name: "Robot Arm" });

  setQuantity("HWSet1", "2");
  clickIn("HWSet1", "Check In");

  expect(await screen.findByText("Checked in 2 unit(s).")).toBeTruthy();
  expect(hardwareRow("HWSet1").textContent).toContain("Available: 82 / 100");
  expect(screen.getByText("Checked out by this project: 3")).toBeTruthy();

  const call = fetchSpy.mock.calls.find(([url]) => url === "/check_in");
  expect(JSON.parse(call[1].body)).toEqual({
    projectId: "robot-arm",
    hardwareName: "HWSet1",
    quantity: 2,
  });
});

test("shows the server's error instead of success when checking out fails", async () => {
  mockServer({ checkOut: [409, { error: "Not enough hardware is available." }] });
  renderPage();
  await screen.findByRole("heading", { name: "Robot Arm" });

  setQuantity("HWSet1", "3");
  clickIn("HWSet1", "Check Out");

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Not enough hardware is available."
  );
  expect(screen.queryByText(/Checked out 3/)).toBeNull();
  expect(screen.getByText("Checked out by this project: 5")).toBeTruthy();
});

test("does not call the server to check in more than the project holds", async () => {
  const fetchSpy = mockServer();
  renderPage();
  await screen.findByRole("heading", { name: "Robot Arm" });

  setQuantity("HWSet1", "6");
  clickIn("HWSet1", "Check In");

  expect((await screen.findByRole("alert")).textContent).toBe(
    "This project can only check in 5 unit(s)."
  );
  expect(fetchSpy.mock.calls.some(([url]) => url === "/check_in")).toBe(false);
});

// --- #9: Leave a Project --------------------------------------------------

test("leaving sends a DELETE for the signed-in user and goes to the dashboard", async () => {
  const fetchSpy = mockServer();
  jest.spyOn(window, "confirm").mockReturnValue(true);
  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: "Leave Project" }));

  expect(await screen.findByRole("heading", { name: "Dashboard page" })).toBeTruthy();
  const leaveCall = fetchSpy.mock.calls.find(([, options]) => options?.method === "DELETE");
  expect(leaveCall[0]).toBe("/api/projects/robot-arm/users/sydney");
});

test("cancelling the confirmation does not leave", async () => {
  const fetchSpy = mockServer();
  jest.spyOn(window, "confirm").mockReturnValue(false);
  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: "Leave Project" }));

  expect(fetchSpy.mock.calls.some(([, options]) => options?.method === "DELETE")).toBe(false);
  expect(screen.getByRole("heading", { name: "Robot Arm" })).toBeTruthy();
});

test("shows the server error and stays on the page if leaving fails", async () => {
  mockServer({
    leave: [409, { error: "You are the last member, so check in this project's hardware before leaving." }],
  });
  jest.spyOn(window, "confirm").mockReturnValue(true);
  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: "Leave Project" }));

  expect((await screen.findByRole("alert")).textContent).toBe(
    "You are the last member, so check in this project's hardware before leaving."
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Leave Project" }).disabled).toBe(false)
  );
});
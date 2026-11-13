import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import HomePage from "./HomePage";
import RequireSignIn from "../components/RequireSignIn";

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
    <MemoryRouter
      initialEntries={["/dashboard"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/projects/:projectId" element={<p>Project page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

function mockFetch(status, body) {
  return jest.spyOn(global, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    json: () => Promise.resolve(body),
  });
}

const PROJECTS = [
  {
    projectName: "Robot Arm",
    projectId: "robot-arm",
    description: "Senior design prototype",
    hwSets: {},
    users: ["sydney", "alice"],
  },
  {
    projectName: "Solo Project",
    projectId: "solo",
    description: "",
    hwSets: {},
    users: ["sydney"],
  },
];

test("dashboard displays projects section and create project link", async () => {
  mockFetch(200, { projects: [] });
  renderPage();

  expect(screen.getByRole("heading", { name: "My Dashboard" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "My Projects" })).toBeTruthy();
  expect(
    screen.getByRole("link", { name: /create project/i }).getAttribute("href")
  ).toBe("/projects/new");
  await screen.findByText(/don't belong to any projects yet/i); // let the fetch finish
});

test("Join Project tab is closed until it is clicked", async () => {
  mockFetch(200, { projects: [] });
  renderPage();
  await screen.findByText(/don't belong to any projects yet/i);

  const tab = screen.getByRole("button", { name: /Join Project/ });
  expect(tab.getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByLabelText("Project ID")).toBeNull();

  fireEvent.click(tab);
  expect(tab.getAttribute("aria-expanded")).toBe("true");
  expect(screen.getByLabelText("Project ID")).toBeTruthy();

  fireEvent.click(tab);
  expect(screen.queryByLabelText("Project ID")).toBeNull();
});

test("joining from the tab adds the project to the list right away", async () => {
  // First load: no projects. Join: succeeds. Reload: the joined project.
  const fetchSpy = jest.spyOn(global, "fetch")
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ projects: [] }) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(PROJECTS[0]) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ projects: [PROJECTS[0]] }) });
  renderPage();
  await screen.findByText(/don't belong to any projects yet/i);

  fireEvent.click(screen.getByRole("button", { name: /Join Project/ }));
  fireEvent.change(screen.getByLabelText("Project ID"), {
    target: { value: " robot-arm " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Join" }));

  expect(await screen.findByRole("link", { name: "Robot Arm" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toMatch(/Joined "Robot Arm"/);
  expect(fetchSpy.mock.calls[1][0]).toBe("/api/projects/robot-arm/users");
  expect(JSON.parse(fetchSpy.mock.calls[1][1].body)).toEqual({ userId: "sydney" });
  expect(fetchSpy.mock.calls[2][0]).toBe("/api/users/sydney/projects");
});

test("has no user ID field and shows who is signed in", async () => {
  mockFetch(200, { projects: [] });
  renderPage();

  expect(screen.queryByLabelText(/user id/i)).toBeNull();
  expect(screen.getByText("sydney")).toBeTruthy();
  await screen.findByText(/don't belong to any projects yet/i);
});

test("loads the signed-in user's projects automatically", async () => {
  const fetchSpy = mockFetch(200, { projects: PROJECTS });
  renderPage();

  expect(await screen.findByRole("link", { name: "Robot Arm" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Solo Project" })).toBeTruthy();
  expect(screen.getByText(/2 members/)).toBeTruthy();
  expect(screen.getByText(/1 member$/)).toBeTruthy();
  expect(fetchSpy.mock.calls[0][0]).toBe("/api/users/sydney/projects");
});

test("shows an empty message when the user has no projects", async () => {
  mockFetch(200, { projects: [] });
  renderPage();

  expect(
    await screen.findByText(/don't belong to any projects yet/i)
  ).toBeTruthy();
});

test("shows the server error if the projects can't be loaded", async () => {
  mockFetch(503, { error: "Projects are temporarily unavailable." });
  renderPage();

  expect((await screen.findByRole("alert")).textContent).toBe(
    "Projects are temporarily unavailable."
  );
  expect(screen.queryByText(/don't belong to any projects yet/i)).toBeNull();
});

test("clicking a project card shows a snippet, clicking again hides it", async () => {
  mockFetch(200, { projects: PROJECTS });
  renderPage();

  await screen.findByRole("link", { name: "Robot Arm" });
  expect(screen.queryByText("Senior design prototype")).toBeNull();

  fireEvent.click(screen.getByText(/Project ID: robot-arm/));
  expect(screen.getByText("Senior design prototype")).toBeTruthy();
  expect(screen.getByText("sydney, alice")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Hide details for Robot Arm" })
      .getAttribute("aria-expanded")
  ).toBe("true");

  fireEvent.click(screen.getByText(/Project ID: robot-arm/));
  expect(screen.queryByText("Senior design prototype")).toBeNull();
});

test("only one snippet is open at a time", async () => {
  mockFetch(200, { projects: PROJECTS });
  renderPage();
  await screen.findByRole("link", { name: "Robot Arm" });

  fireEvent.click(screen.getByRole("button", { name: "Show details for Robot Arm" }));
  fireEvent.click(screen.getByRole("button", { name: "Show details for Solo Project" }));

  expect(screen.queryByText("Senior design prototype")).toBeNull();
  expect(screen.getByText("No description yet.")).toBeTruthy();
});

test("clicking the project name goes to the project page", async () => {
  mockFetch(200, { projects: PROJECTS });
  renderPage();

  const nameLink = await screen.findByRole("link", { name: "Robot Arm" });
  expect(nameLink.getAttribute("href")).toBe("/projects/robot-arm");

  fireEvent.click(nameLink);
  expect(screen.getByText("Project page")).toBeTruthy();
});

test("signing out clears session and protects dashboard", async () => {
  mockFetch(200, { projects: [] });

  render(
    <MemoryRouter
      initialEntries={["/dashboard"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<h1>Sign In</h1>} />
        <Route
          path="/dashboard"
          element={
            <RequireSignIn>
              <HomePage />
            </RequireSignIn>
          }
        />
      </Routes>
    </MemoryRouter>
  );

  expect(sessionStorage.getItem("dashboardUserId")).toBe("sydney");

  await screen.findByText(/don't belong to any projects yet/i);

  fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));

  expect(sessionStorage.getItem("dashboardUserId")).toBeNull();
  expect(screen.getByRole("heading", { name: "Sign In" })).toBeTruthy();
});
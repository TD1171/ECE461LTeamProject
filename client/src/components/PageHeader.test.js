import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import PageHeader from "./PageHeader";

beforeEach(() => {
  sessionStorage.setItem("dashboardUserId", "sydney");
});

afterEach(() => {
  sessionStorage.clear();
});

// PageHeader renders links and navigates on Sign Out, so it needs a router.
function renderHeader(props) {
  return render(
    <MemoryRouter
      initialEntries={["/projects/new"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<h1>Sign In page</h1>} />
        <Route path="/projects/new" element={<PageHeader {...props} />} />
      </Routes>
    </MemoryRouter>
  );
}

test("shows the title and a link back to the dashboard by default", () => {
  renderHeader({ title: "Create Project" });

  expect(screen.getByRole("heading", { name: "Create Project" })).toBeTruthy();
  const backLink = screen.getByRole("link", { name: "Back to Dashboard" });
  expect(backLink.getAttribute("href")).toBe("/dashboard");
});

test("every page shows who is signed in and can sign out", () => {
  renderHeader({ title: "Create Project" });

  expect(screen.getByText("sydney")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));

  expect(sessionStorage.getItem("dashboardUserId")).toBeNull();
  expect(screen.getByRole("heading", { name: "Sign In page" })).toBeTruthy();
});

test("shows the subtitle under the title when given", () => {
  renderHeader({ title: "Robot Arm", subtitle: "Project ID: robot-arm" });

  expect(screen.getByRole("heading", { name: "Robot Arm" })).toBeTruthy();
  expect(screen.getByText("Project ID: robot-arm")).toBeTruthy();
});

test("custom actions replace the default back link", () => {
  renderHeader({
    title: "My Dashboard",
    actions: <button type="button">Sign Out</button>,
  });

  expect(screen.getByRole("button", { name: "Sign Out" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Back to Dashboard" })).toBeNull();
});

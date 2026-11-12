import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import RequireSignIn from "./RequireSignIn";

afterEach(() => {
  sessionStorage.clear();
});

function renderAt(path) {
  render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<h1>Sign In page</h1>} />
        <Route
          path="/dashboard"
          element={<RequireSignIn><h1>Dashboard page</h1></RequireSignIn>}
        />
      </Routes>
    </MemoryRouter>
  );
}

test("shows the page to a signed-in user", () => {
  sessionStorage.setItem("dashboardUserId", "sydney");
  renderAt("/dashboard");

  expect(screen.getByRole("heading", { name: "Dashboard page" })).toBeTruthy();
});

test("sends a signed-out visitor to Sign In", () => {
  renderAt("/dashboard");

  expect(screen.getByRole("heading", { name: "Sign In page" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Dashboard page" })).toBeNull();
});
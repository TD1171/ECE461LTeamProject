import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import LoginPage from "./LoginPage";

afterEach(() => {
  jest.restoreAllMocks();
  sessionStorage.clear();
});

function renderPage() {
  render(
    <MemoryRouter
      initialEntries={["/"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<h1>Dashboard</h1>} />
      </Routes>
    </MemoryRouter>
  );
}

function mockFetch(status, body) {
  jest.spyOn(global, "fetch").mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function fillAndSubmit(userId, password) {
  fireEvent.change(screen.getByLabelText("User ID"), { target: { value: userId } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.click(screen.getByRole("button", { name: "Sign In" }));
}

test("asks for both fields before contacting the server", async () => {
  jest.spyOn(global, "fetch");
  renderPage();

  fillAndSubmit("sydney", "");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Please enter your User ID and password."
  );
  expect(global.fetch).not.toHaveBeenCalled();
});

test("shows the server's error when sign in fails", async () => {
  mockFetch(401, { error: "Invalid user ID or password." });
  renderPage();

  fillAndSubmit("sydney", "wrong");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Invalid user ID or password."
  );
  expect(sessionStorage.getItem("dashboardUserId")).toBeNull();
});

test("remembers the user and goes to the dashboard on success", async () => {
  mockFetch(200, { user: { userId: "sydney", username: "sydney", projects: [] } });
  renderPage();

  fillAndSubmit("sydney", "secret");

  expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeTruthy();
  expect(sessionStorage.getItem("dashboardUserId")).toBe("sydney");
});

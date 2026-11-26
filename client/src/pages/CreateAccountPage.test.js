import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import CreateAccountPage from "./CreateAccountPage";

afterEach(() => {
  jest.restoreAllMocks();
});

function renderPage() {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CreateAccountPage />
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

function fillAndSubmit(userId, password, confirmPassword) {
  fireEvent.change(screen.getByLabelText("User ID"), { target: { value: userId } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirm Password"), {
    target: { value: confirmPassword },
  });
  fireEvent.click(screen.getByRole("button", { name: "Create Account" }));
}

test("catches mismatched passwords before contacting the server", async () => {
  jest.spyOn(global, "fetch");
  renderPage();

  fillAndSubmit("sydney", "secret", "secrte");

  expect(await screen.findByRole("alert")).toHaveTextContent("Passwords do not match.");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("shows success as a status message, not an error", async () => {
  mockFetch(201, { user: { userId: "sydney", username: "sydney", projects: [] } });
  renderPage();

  fillAndSubmit("sydney", "secret", "secret");

  expect(await screen.findByRole("status")).toHaveTextContent(
    "Account created successfully."
  );
  expect(screen.queryByRole("alert")).toBeNull();
});

test("shows the server's error when the user ID is taken", async () => {
  mockFetch(409, { error: "User ID already exists." });
  renderPage();

  fillAndSubmit("sydney", "secret", "secret");

  expect(await screen.findByRole("alert")).toHaveTextContent("User ID already exists.");
  expect(screen.queryByRole("status")).toBeNull();
});

test("a user ID of only spaces counts as empty", async () => {
  jest.spyOn(global, "fetch");
  renderPage();

  fillAndSubmit("   ", "secret", "secret");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "User ID and password are required."
  );
  expect(global.fetch).not.toHaveBeenCalled();
});

test("asks to confirm the password when that field is empty", async () => {
  jest.spyOn(global, "fetch");
  renderPage();

  fillAndSubmit("sydney", "secret", "");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Please confirm your password."
  );
  expect(global.fetch).not.toHaveBeenCalled();
});

test("sends the trimmed user ID and blocks double submits while waiting", async () => {
  jest.spyOn(global, "fetch").mockReturnValue(new Promise(() => {}));
  renderPage();

  fillAndSubmit("  sydney  ", "secret", "secret");

  const button = await screen.findByRole("button", { name: "Creating account..." });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(JSON.parse(global.fetch.mock.calls[0][1].body).userId).toBe("sydney");
});

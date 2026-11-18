import { render, screen } from "@testing-library/react";

import StatusMessage from "./StatusMessage";

test("errors are announced as alerts with the error style", () => {
  render(<StatusMessage type="error">Project not found.</StatusMessage>);

  const message = screen.getByRole("alert");
  expect(message.textContent).toBe("Project not found.");
  expect(message.className).toBe("error-banner");
});

test("success messages use the status role and the normal style", () => {
  render(<StatusMessage type="success">Joined "Robot Arm".</StatusMessage>);

  const message = screen.getByRole("status");
  expect(message.textContent).toBe('Joined "Robot Arm".');
  expect(message.className).toBe("request-message");
});

test("renders nothing when there is no message", () => {
  const { container } = render(
    <>
      <StatusMessage type="error">{""}</StatusMessage>
      <StatusMessage type="success">{null}</StatusMessage>
    </>
  );

  expect(container.innerHTML).toBe("");
});

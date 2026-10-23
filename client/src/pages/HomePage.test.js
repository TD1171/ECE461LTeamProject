import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "./HomePage";

test("dashboard displays projects section and create project link", () => {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );

  expect(
    screen.getByRole("heading", { name: "My Dashboard" })
  ).toBeTruthy();

  expect(
    screen.getByRole("heading", { name: "My Projects" })
  ).toBeTruthy();

  const createProjectLink = screen.getByRole("link", {
    name: /create project/i,
  });

  expect(createProjectLink.getAttribute("href")).toBe("/projects/new");
});
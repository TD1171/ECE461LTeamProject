import { fireEvent, render, screen, within } from "@testing-library/react";
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

  expect(screen.getByRole("article", { name: /senior design prototype project/i })).toBeTruthy();
  expect(screen.getByRole("article", { name: /embedded systems lab project/i })).toBeTruthy();
});

test("checks hardware out and updates the project quantity", () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);

  const project = screen.getByRole("article", { name: /senior design prototype project/i });
  const row = within(project).getByLabelText("HWSet1 controls");
  fireEvent.change(within(row).getByLabelText(/quantity for hwset1/i), {
    target: { value: "3" },
  });
  fireEvent.click(within(row).getByRole("button", { name: "Check Out" }));

  expect(within(row).getByText("Available: 72 / 100")).toBeTruthy();
  expect(within(row).getByRole("status").textContent).toBe("Checked out 3 unit(s).");
});

test("prevents checkout when stock is insufficient", () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);

  const project = screen.getByRole("article", { name: /senior design prototype project/i });
  const row = within(project).getByLabelText("HWSet1 controls");
  fireEvent.change(within(row).getByLabelText(/quantity for hwset1/i), {
    target: { value: "76" },
  });
  fireEvent.click(within(row).getByRole("button", { name: "Check Out" }));

  expect(within(row).getByRole("alert").textContent).toBe("Only 75 unit(s) are available.");
  expect(within(row).getByText("Available: 75 / 100")).toBeTruthy();
});

test("prevents invalid returns and accepts a valid check in", () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);

  const project = screen.getByRole("article", { name: /embedded systems lab project/i });
  const row = within(project).getByLabelText("HWSet1 controls");
  const quantity = within(row).getByLabelText(/quantity for hwset1/i);

  fireEvent.change(quantity, { target: { value: "6" } });
  fireEvent.click(within(row).getByRole("button", { name: "Check In" }));
  expect(within(row).getByRole("alert").textContent).toBe(
    "This project can only check in 5 unit(s)."
  );

  fireEvent.change(quantity, { target: { value: "2" } });
  fireEvent.click(within(row).getByRole("button", { name: "Check In" }));
  expect(within(row).getByText("Available: 77 / 100")).toBeTruthy();
  expect(within(row).getByRole("status").textContent).toBe("Checked in 2 unit(s).");
});

test("separates my projects from projects I have not joined", () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);

  const myProjects = screen.getByRole("region", { name: "My Projects" });
  const availableProjects = screen.getByRole("region", { name: "Available Projects" });

  expect(within(myProjects).getByRole("article", { name: /senior design/i })).toBeTruthy();
  expect(within(myProjects).getByRole("article", { name: /embedded systems/i })).toBeTruthy();
  expect(within(myProjects).queryByText("Member")).toBeNull();

  const availableProject = within(availableProjects).getByRole("article", {
    name: /robotics project/i,
  });
  expect(within(availableProject).getByRole("button", { name: "Join" })).toBeTruthy();
  expect(
    within(availableProject).getAllByRole("button", { name: "Check Out" })
      .every((button) => button.disabled)
  ).toBe(true);
});

test("moves projects between sections when joining or leaving", () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);

  let availableProjects = screen.getByRole("region", { name: "Available Projects" });
  let availableProject = within(availableProjects).getByRole("article", { name: /robotics project/i });
  fireEvent.click(within(availableProject).getByRole("button", { name: "Join" }));

  const myProjects = screen.getByRole("region", { name: "My Projects" });
  availableProject = within(myProjects).getByRole("article", { name: /robotics project/i });
  expect(within(availableProject).getByRole("button", { name: "Leave" })).toBeTruthy();
  expect(
    within(availableProject).getAllByRole("button", { name: "Check Out" })
      .every((button) => !button.disabled)
  ).toBe(true);

  const memberProject = screen.getByRole("article", {
    name: /embedded systems lab project/i,
  });
  fireEvent.click(within(memberProject).getByRole("button", { name: "Leave" }));
  availableProjects = screen.getByRole("region", { name: "Available Projects" });
  expect(
    within(availableProjects).getByRole("article", { name: /embedded systems lab/i })
  ).toBeTruthy();
});

test("owner can edit project name, ID, and description", () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>);

  const project = screen.getByRole("article", { name: /senior design prototype project/i });
  fireEvent.click(within(project).getByRole("button", { name: "Edit" }));
  fireEvent.change(within(project).getByLabelText("Project Name"), {
    target: { value: "Updated Project" },
  });
  fireEvent.change(within(project).getByLabelText("Project ID"), {
    target: { value: "UPDATED-1" },
  });
  fireEvent.change(within(project).getByLabelText("Description"), {
    target: { value: "Updated description." },
  });
  fireEvent.click(within(project).getByRole("button", { name: "Save" }));

  expect(screen.getByRole("article", { name: /updated project project/i })).toBeTruthy();
  expect(screen.getByText("UPDATED-1")).toBeTruthy();
  expect(screen.getByText("Updated description.")).toBeTruthy();
});

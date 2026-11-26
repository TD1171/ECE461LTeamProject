import { getProjectIdError } from "./validation";

test("accepts IDs the server accepts", () => {
  expect(getProjectIdError("robot-arm")).toBe("");
  expect(getProjectIdError("Lab_204")).toBe("");
  expect(getProjectIdError("  robot-arm  ")).toBe("");
  expect(getProjectIdError("a".repeat(32))).toBe("");
});

test("asks for an ID when it is empty or only spaces", () => {
  expect(getProjectIdError("")).toBe("Project ID is required.");
  expect(getProjectIdError("   ")).toBe("Project ID is required.");
});

test("rejects IDs the server would reject", () => {
  expect(getProjectIdError("my project")).toMatch(/letters, numbers/);
  expect(getProjectIdError("robot!")).toMatch(/letters, numbers/);
  expect(getProjectIdError("a".repeat(33))).toMatch(/letters, numbers/);
});

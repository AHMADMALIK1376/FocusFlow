import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AttendanceImport, { importSummary } from "./AttendanceImport";

const mockImport = jest.fn();
jest.mock("../../services/api", () => ({ lmsAPI: { importAttendance: (...a) => mockImport(...a) } }));
jest.mock("../subjects/useSubjects", () => ({ useSubjects: () => ({ subjects: [{ id: "s1", name: "Web Engineering" }, { id: "s2", name: "AI" }] }) }));

beforeEach(() => mockImport.mockReset());

const fill = (subject = "s1", text = "Fri 16 Oct 2026 Present") => {
  fireEvent.change(screen.getByLabelText("Subject"), { target: { value: subject } });
  fireEvent.change(screen.getByLabelText("Attendance page text"), { target: { value: text } });
};

test("nothing can be checked or imported until a subject is chosen and text is pasted, and Import waits for a check", () => {
  render(<AttendanceImport />);
  expect(screen.getByRole("button", { name: "Check" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  fill();
  expect(screen.getByRole("button", { name: "Check" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
});

test("Check shows what would happen without saving; Import then saves and says so", async () => {
  mockImport.mockResolvedValueOnce({ found: 8, added: 3, changed: 1, same: 4, dryRun: true }).mockResolvedValueOnce({ found: 8, added: 3, changed: 1, same: 4, dryRun: false });
  render(<AttendanceImport />);
  fill("s2", "Fri 16 Oct 2026 Present");
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  expect(await screen.findByText(/Found 8 marked classes: 3 new, 1 changed to match the LMS, 4 already the same\./)).toBeInTheDocument();
  expect(mockImport).toHaveBeenCalledWith("s2", "Fri 16 Oct 2026 Present", true);
  fireEvent.click(screen.getByRole("button", { name: "Import" }));
  await waitFor(() => expect(mockImport).toHaveBeenCalledTimes(2));
  expect(mockImport).toHaveBeenLastCalledWith("s2", "Fri 16 Oct 2026 Present", false);
  expect(await screen.findByText("Imported: 3 new, 1 changed to match the LMS, 4 already the same.")).toBeInTheDocument();
  expect(screen.getByLabelText("Attendance page text")).toHaveValue("");
});

test("when nothing would change, Import stays off; a page with no marks shows the server's plain message", async () => {
  mockImport.mockResolvedValueOnce({ found: 2, added: 0, changed: 0, same: 2, dryRun: true });
  render(<AttendanceImport />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  expect(await screen.findByText(/2 already the same/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  mockImport.mockRejectedValueOnce(new Error("No marked classes found in that text."));
  fireEvent.change(screen.getByLabelText("Attendance page text"), { target: { value: "hello" } });
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No marked classes found in that text.");
});

test("changing the subject or the text clears an old check, so a stale preview can never be imported", async () => {
  mockImport.mockResolvedValue({ found: 1, added: 1, changed: 0, same: 0, dryRun: true });
  render(<AttendanceImport />);
  fill();
  fireEvent.click(screen.getByRole("button", { name: "Check" }));
  await screen.findByText(/Found 1 marked class: 1 new/);
  fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "s2" } });
  expect(screen.queryByText(/Found 1 marked class/)).toBeNull();
  expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
});

test("the summary is plain words", () => {
  expect(importSummary({ added: 1, changed: 0, same: 0 })).toBe("1 new");
  expect(importSummary({ added: 0, changed: 0, same: 0 })).toBe("Nothing to change.");
  expect(importSummary(null)).toBe("");
});

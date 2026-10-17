import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import { AppProvider, useApp } from "./AppContext";
import { dashboardAPI, subjectAttendanceAPI } from "../../services/api";

jest.mock("../../services/api", () => ({
  getToken: () => "x",
  assignmentAPI: { getAll: jest.fn() },
  routineAPI: { getAll: jest.fn() },
  focusAPI: { getSessions: jest.fn() },
  dashboardAPI: { getComplete: jest.fn() },
  subjectAttendanceAPI: { getOverview: jest.fn() },
}));
jest.mock("lottie-react", () => () => null);

let app;
function Probe() {
  app = useApp();
  return <p>subjects: {app.attendanceSummary?.subjects?.length ?? 0}, classes: {app.todaysClasses.length}</p>;
}

const overview = (n) => ({ subjects: Array.from({ length: n }, (_, i) => ({ id: i, name: `S${i}` })) });

beforeEach(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  const { assignmentAPI, routineAPI, focusAPI } = require("../../services/api");
  assignmentAPI.getAll.mockResolvedValue([]);
  routineAPI.getAll.mockResolvedValue([]);
  focusAPI.getSessions.mockResolvedValue([]);
  dashboardAPI.getComplete.mockResolvedValue({ data: { todaysClasses: [] } });
  subjectAttendanceAPI.getOverview.mockResolvedValue(overview(1));
});

test("refreshSubjectData reloads the subject graph numbers and today's classes without a page reload", async () => {
  render(<AppProvider><Probe /></AppProvider>);
  await screen.findByText("subjects: 1, classes: 0");

  // a re-scan added a second subject (with a class today)
  subjectAttendanceAPI.getOverview.mockResolvedValue(overview(2));
  dashboardAPI.getComplete.mockResolvedValue({ data: { todaysClasses: [{ subject: "S1" }] } });
  await act(async () => { await app.refreshSubjectData(); });

  await waitFor(() => expect(screen.getByText("subjects: 2, classes: 1")).toBeInTheDocument());
});

test("a failed refresh keeps what is already shown", async () => {
  render(<AppProvider><Probe /></AppProvider>);
  await screen.findByText("subjects: 1, classes: 0");
  subjectAttendanceAPI.getOverview.mockRejectedValue(new Error("offline"));
  dashboardAPI.getComplete.mockRejectedValue(new Error("offline"));
  await act(async () => { await app.refreshSubjectData(); });
  expect(screen.getByText("subjects: 1, classes: 0")).toBeInTheDocument();
});

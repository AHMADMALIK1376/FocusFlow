import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import AttendanceSkylinePage from "./AttendanceSkylinePage";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../features/account/useAccountYears", () => ({ useAccountYears: () => [new Date().getFullYear()] }));
jest.mock("../services/api", () => ({
  authAPI: { getMe: jest.fn() },
  subjectAttendanceAPI: {
    getAllForUser: jest.fn(),
    getOverview: jest.fn(),
  },
}));
const { subjectAttendanceAPI } = require("../services/api");

// React builds onPointerLeave from pointerout, so that is what is dispatched for "leaving".
// jsdom has no PointerEvent: a plain event with the fields React reads.
function pointer(el, type, pointerType) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "pointerType", { value: pointerType });
  Object.defineProperty(ev, "pointerId", { value: 1 });
  act(() => { el.dispatchEvent(ev); });
}

const today = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const day = new Date(today.getFullYear(), 0, 15);

beforeEach(() => {
  subjectAttendanceAPI.getOverview.mockResolvedValue({ subjects: [] }); // CRA resets mock implementations between tests
  subjectAttendanceAPI.getAllForUser.mockResolvedValue([
    { date: iso(day), present: 1, absent: 0, late: 0, excused: 0, total: 1, percentage: 100, classes: [{ subjectId: "s1", name: "Calculus", code: "MTH101", status: "Present" }] },
  ]);
  // layout is not computed in jsdom: give the chart a size so tooltip maths has something to use
  Element.prototype.getBoundingClientRect = function () { return { left: 10, top: 10, width: 600, height: 300, right: 610, bottom: 310 }; };
});

async function renderPage() {
  const view = render(<AttendanceSkylinePage />);
  await waitFor(() => expect(view.container.querySelector("[data-key]")).not.toBeNull());
  const svg = view.container.querySelector("svg[role='img']");
  // the tower for the day that has a class
  const towers = Array.from(svg.querySelectorAll("[data-key]"));
  return { svg, towers };
}

test("on a phone the chart can scroll inside its card and says so", async () => {
  const { svg } = await renderPage();
  expect(svg.getAttribute("class")).toContain("min-w-[640px]");
  expect(screen.getByText(/swipe sideways/i)).toBeInTheDocument();
});

const tip = () => document.querySelector("div.fixed.pointer-events-none");

test("a tap on a tower shows its day, and lifting the finger does not hide it", async () => {
  const { svg, towers } = await renderPage();
  expect(tip()).toBeNull();
  pointer(towers[0], "pointerdown", "touch");
  expect(tip()).not.toBeNull();
  pointer(svg, "pointerout", "touch"); // a finger lifting is not "leaving"
  expect(tip()).not.toBeNull();
});

test("a mouse leaving the chart still hides the tooltip", async () => {
  const { svg, towers } = await renderPage();
  pointer(towers[0], "pointermove", "mouse");
  expect(tip()).not.toBeNull();
  pointer(svg, "pointerout", "mouse");
  expect(tip()).toBeNull();
});

test("a tap outside the chart closes the tooltip", async () => {
  const { towers } = await renderPage();
  pointer(towers[0], "pointerdown", "touch");
  expect(tip()).not.toBeNull();
  pointer(document.body, "pointerdown", "touch");
  expect(tip()).toBeNull();
});

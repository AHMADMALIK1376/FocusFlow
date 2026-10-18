import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import WeekBeads, { weekBeads } from "./WeekBeads";

const S = (code, name, ...slots) => ({ id: code, code, name, color: "#E86562", creditHours: 2, schedule: slots.map(([day, start, end, room]) => ({ day, start, end, room })) });
const SUBJECTS = [
  S("CSC467", "Internet of Things", ["Monday", "11:10", "12:40", "LR29"], ["Friday", "08:00", "09:30", "LR26"]),
  S("CSC312L", "Web Engineering Lab", ["Thursday", "08:00", "11:05", "COMP LAB8"]),
  S("CMC381L", "AI Lab", ["Thursday", "14:50", "17:55", "COMP LAB13"]),
  S("CSC452L", "Compiler Lab", ["Thursday", "11:41", "14:45", "COMP LAB2"]),
];

test("one bead per class, sorted by time, busiest day found", () => {
  const w = weekBeads(SUBJECTS);
  expect(w.total).toBe(5);
  expect(w.busiest).toBe("Thursday");
  expect(w.days.find((d) => d.day === "Thursday").beads.map((b) => b.subject.code)).toEqual(["CSC312L", "CSC452L", "CMC381L"]);
  expect(w.days.map((d) => d.day)).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
});

test("summary, then the class and room for the bead pointed at", () => {
  render(<WeekBeads subjects={SUBJECTS} />);
  expect(screen.getByText(/5 classes · Thu is busiest/)).toBeInTheDocument();
  fireEvent.mouseEnter(screen.getByRole("button", { name: /Thu 8:00–11:05 AM, Web Engineering Lab, COMP LAB8/ }));
  expect(screen.getByText("CSC312L")).toBeInTheDocument();
  expect(screen.getByText("COMP LAB8")).toBeInTheDocument();
});

test("nothing drawn without class times", () => {
  const { container } = render(<WeekBeads subjects={[{ name: "x", schedule: [] }]} />);
  expect(container).toBeEmptyDOMElement();
});

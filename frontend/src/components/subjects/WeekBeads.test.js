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

const TODAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
const other = (TODAY === "Thursday" ? "Friday" : "Thursday");
const WITH_TODAY = [
  { ...S("CSC467", "Internet of Things", [TODAY, "11:10", "12:40", "LR29"], [other, "08:00", "09:30", "LR26"]), instructor: "Ms. Seher" },
  S("CSC312L", "Web Engineering Lab", [TODAY, "08:00", "09:00", "LAB8"]),
];
const pill = (re) => screen.getByRole("button", { name: re });

test("the summary stays; pointing at a pill opens a tooltip with subject, teacher, day, time and room", () => {
  render(<WeekBeads subjects={SUBJECTS} />);
  expect(screen.getByText(/5 classes · Thu is busiest/)).toBeInTheDocument();
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.mouseEnter(pill(/Thu 8:00–11:05 AM, Web Engineering Lab, COMP LAB8/));
  const tip = screen.getByRole("tooltip");
  expect(tip).toHaveTextContent("CSC312L · Web Engineering Lab");
  expect(tip).toHaveTextContent("TBA");
  expect(tip).toHaveTextContent("Thursday 8:00–11:05 AM");
  expect(tip).toHaveTextContent("COMP LAB8");
  expect(pill(/Web Engineering Lab/)).toHaveAttribute("aria-describedby", tip.id);
  fireEvent.mouseLeave(pill(/Web Engineering Lab/));
  expect(screen.queryByRole("tooltip")).toBeNull();
});

test("the tooltip is drawn on the page body so no card clips it", () => {
  const { container } = render(<WeekBeads subjects={SUBJECTS} />);
  fireEvent.focus(screen.getAllByRole("button")[0]);
  expect(screen.getByRole("tooltip").parentElement).toBe(document.body);
  expect(container.querySelector("[role=tooltip]")).toBeNull();
});

test("a class today gets the Today pill and shows the teacher; another day does not", () => {
  render(<WeekBeads subjects={WITH_TODAY} />);
  const by = (frag) => screen.getAllByRole("button").find((x) => x.getAttribute("aria-label").includes(frag));
  fireEvent.focus(by("11:10"));
  let tip = screen.getByRole("tooltip");
  expect(tip).toHaveTextContent("Today");
  expect(tip).toHaveTextContent("Ms. Seher");
  expect(tip).toHaveTextContent("LR29");
  fireEvent.blur(by("11:10"));
  fireEvent.focus(by("LR26"));
  tip = screen.getByRole("tooltip");
  expect(tip).not.toHaveTextContent("Today");
  expect(tip).toHaveTextContent(other);
});

test("pills are focusable, Escape closes, a tap shows it and a tap elsewhere closes it", () => {
  render(<div><WeekBeads subjects={SUBJECTS} /><p>elsewhere</p></div>);
  const b = pill(/Web Engineering Lab/);
  expect(b).toHaveAttribute("tabindex", "0");
  fireEvent.focus(b);
  expect(screen.getByRole("tooltip")).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.click(b);
  expect(screen.getByRole("tooltip")).toBeInTheDocument();
  fireEvent.pointerDown(screen.getByText("elsewhere"));
  expect(screen.queryByRole("tooltip")).toBeNull();
});

test("pills in a day are in start-time order", () => {
  render(<WeekBeads subjects={SUBJECTS} />);
  const names = screen.getAllByRole("button").map((x) => x.getAttribute("aria-label")).filter((l) => l.startsWith("Thu"));
  expect(names.map((l) => l.split(", ")[1])).toEqual(["Web Engineering Lab", "Compiler Lab", "AI Lab"]);
});

test("nothing drawn without class times", () => {
  const { container } = render(<WeekBeads subjects={[{ name: "x", schedule: [] }]} />);
  expect(container).toBeEmptyDOMElement();
});

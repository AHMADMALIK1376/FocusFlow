import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import WeekTimeline, { weekDays, timeRange, pillGeometry, layoutDay, busiestDay, timelineHeight, laneBox, rowHeight, BAND_REM } from "./WeekTimeline";

const S = (code, name, ...slots) => ({ id: code, code, name, color: "#E86562", creditHours: 2, schedule: slots.map(([day, start, end, room]) => ({ day, start, end, room })) });
const SUBJECTS = [
  S("CSC467", "Internet of Things", ["Monday", "11:10", "12:40", "LR29"], ["Friday", "08:00", "09:30", "LR26"]),
  S("CSC312L", "Web Engineering Lab", ["Thursday", "08:00", "11:05", "COMP LAB8"]),
  S("CMC381L", "AI Lab", ["Thursday", "14:50", "17:55", "COMP LAB13"]),
  S("CSC452L", "Compiler Lab", ["Thursday", "11:41", "14:45", "COMP LAB2"]),
];
const bead = (start, end) => ({ subject: SUBJECTS[0], start, end, room: "" });

describe("weekDays", () => {
  it("is Monday to Friday with each day's classes in start order", () => {
    const d = weekDays(SUBJECTS);
    expect(d.map((x) => x.day)).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    expect(d.find((x) => x.day === "Thursday").beads.map((b) => b.subject.code)).toEqual(["CSC312L", "CSC452L", "CMC381L"]);
  });
  it("adds a weekend day only when it has a class", () => {
    expect(weekDays([S("X", "x", ["Saturday", "10:00", "11:00", "R"])]).map((x) => x.day)).toContain("Saturday");
    expect(weekDays(SUBJECTS).map((x) => x.day)).not.toContain("Saturday");
  });
  it("ignores classes without a start time", () => {
    expect(weekDays([S("X", "x", ["Monday", "", "", "R"])]).every((d) => d.beads.length === 0)).toBe(true);
  });
});

describe("timeRange", () => {
  it("is 8 to 14 with no classes, and never narrower than that", () => {
    expect(timeRange(weekDays([]))).toEqual({ start: 8, end: 14 });
    expect(timeRange(weekDays([S("X", "x", ["Monday", "09:00", "10:00", "R"])]))).toEqual({ start: 8, end: 14 });
  });
  it("widens to whole hours around the earliest start and the latest end", () => {
    expect(timeRange(weekDays(SUBJECTS))).toEqual({ start: 8, end: 18 });
    expect(timeRange(weekDays([S("X", "x", ["Monday", "06:30", "08:00", "R"]), S("Y", "y", ["Tuesday", "19:10", "20:20", "R"])]))).toEqual({ start: 6, end: 21 });
  });
  it("treats a class with no end as an hour long", () => {
    expect(timeRange(weekDays([S("X", "x", ["Monday", "15:30", "", "R"])]))).toEqual({ start: 8, end: 17 });
  });
});

describe("pillGeometry", () => {
  const range = { start: 8, end: 18 };
  it("starts at the start time and is as long as the class", () => {
    expect(pillGeometry(bead("08:00", "09:00"), range)).toEqual({ left: 0, width: 10 });
    expect(pillGeometry(bead("13:00", "15:00"), range)).toEqual({ left: 50, width: 20 });
  });
  it("is never thinner than the minimum and never runs off the track", () => {
    const short = pillGeometry(bead("09:00", "09:10"), range);
    expect(short.width).toBe(5);
    const late = pillGeometry(bead("17:55", "19:00"), range);
    expect(late.left + late.width).toBeLessThanOrEqual(100);
    expect(late.width).toBeGreaterThanOrEqual(5);
  });
  it("clamps a class that starts before the range", () => {
    expect(pillGeometry(bead("07:00", "09:00"), range).left).toBe(0);
  });
});

describe("layoutDay", () => {
  it("keeps classes that do not overlap on one row", () => {
    const { placed, rows } = layoutDay([bead("08:00", "09:00"), bead("09:00", "10:00"), bead("11:00", "12:00")]);
    expect(rows).toBe(1);
    expect(placed.map((p) => p.row)).toEqual([0, 0, 0]);
  });
  it("stacks an overlapping class on a second row, then reuses the first when it is free", () => {
    const { placed, rows } = layoutDay([bead("08:00", "10:00"), bead("09:00", "11:00"), bead("10:00", "12:00")]);
    expect(placed.map((p) => p.row)).toEqual([0, 1, 0]);
    expect(rows).toBe(2);
  });
  it("handles no classes and five or more in a day", () => {
    expect(layoutDay([])).toEqual({ placed: [], rows: 1 });
    const five = Array.from({ length: 6 }, (_, i) => bead(`${8 + i}:00`, `${9 + i}:00`));
    expect(layoutDay(five).rows).toBe(1);
    const same = Array.from({ length: 5 }, () => bead("09:00", "10:00"));
    expect(layoutDay(same).rows).toBe(5);
  });
});

describe("busiestDay", () => {
  it("finds the day with most classes, the first on a tie, null with none", () => {
    expect(busiestDay(weekDays(SUBJECTS))).toBe("Thursday");
    expect(busiestDay(weekDays([S("X", "x", ["Tuesday", "09:00", "10:00", "R"], ["Monday", "09:00", "10:00", "R"])]))).toBe("Monday");
    expect(busiestDay(weekDays([]))).toBeNull();
  });
});

const TODAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
const other = TODAY === "Thursday" ? "Friday" : "Thursday";
const WITH_TODAY = [
  { ...S("CSC467", "Internet of Things", [TODAY, "11:10", "12:40", "LR29"], [other, "08:00", "09:30", "LR26"]), instructor: "Ms. Seher" },
  S("CSC312L", "Web Engineering Lab", [TODAY, "08:00", "09:00", "LAB8"]),
];
const pill = (re) => screen.getByRole("button", { name: re });

describe("WeekTimeline", () => {
  it("shows the header, one row per weekday with today tinted, and the summary", () => {
    render(<WeekTimeline subjects={SUBJECTS} />);
    expect(screen.getByRole("region", { name: "Your week" })).toBeInTheDocument();
    expect(screen.getByText("4 subjects · 8 cr")).toBeInTheDocument();
    expect(screen.getAllByTestId("day-track")).toHaveLength(5);
    expect(screen.getByText(/5 classes · Thu is busiest/)).toBeInTheDocument();
  });

  it("today's row is tinted and its letter in the accent colour; the others are neutral", () => {
    render(<WeekTimeline subjects={WITH_TODAY} />);
    const tracks = screen.getAllByTestId("day-track");
    const todayTrack = tracks.find((t) => t.dataset.day === TODAY);
    if (todayTrack) {
      expect(todayTrack.className).toMatch(/bg-sage/);
      expect(todayTrack.previousSibling.className).toMatch(/text-brand/);
    }
    const others = tracks.filter((t) => t.dataset.day !== TODAY);
    others.forEach((t) => { expect(t.className).not.toMatch(/bg-sage/); expect(t.previousSibling.className).toMatch(/text-muted/); });
  });

  it("hour ticks at 8, 12 and 4 sit under the tracks", () => {
    render(<WeekTimeline subjects={SUBJECTS} />);
    expect(screen.getAllByTestId("tick").map((t) => t.textContent)).toEqual(["8", "12", "4"]);
  });

  it("pills sit at their start time and are as wide as the class, in the subject's colour", () => {
    render(<WeekTimeline subjects={SUBJECTS} />);
    const p = pill(/Mon 11:10 AM to 12:40 PM, Internet of Things, LR29/);
    const g = pillGeometry({ start: "11:10", end: "12:40" }, { start: 8, end: 18 });
    expect(p.style.left).toBe(`${g.left}%`);
    expect(p.style.width).toBe(`calc(${g.width}% - 2px)`);
    expect(p.style.background).not.toBe("");
  });

  it("overlapping classes share their day's fixed track as thin lanes; the track never grows", () => {
    render(<WeekTimeline subjects={[S("A", "Alpha", ["Monday", "09:00", "11:00", "R1"]), S("B", "Beta", ["Monday", "10:00", "12:00", "R2"]), S("C", "Gamma", ["Tuesday", "10:00", "12:00", "R3"])]} />);
    const pills = screen.getAllByTestId("pill");
    expect(pills.map((x) => x.dataset.row)).toEqual(["0", "1", "0"]);
    const heights = screen.getAllByTestId("day-track").map((t) => t.style.height);
    expect(new Set(heights).size).toBe(1);
    const [a, b, c] = pills.map((x) => parseFloat(x.style.height));
    expect(a).toBeLessThan(parseFloat(heights[0]));
    expect(b).toBe(a);
    expect(c).toBeCloseTo(parseFloat(heights[0]), 3);
    expect(parseFloat(pills[1].style.top)).toBeGreaterThan(parseFloat(pills[0].style.top));
  });

  it("with no classes the tracks are empty and a friendly line shows", () => {
    render(<WeekTimeline subjects={[{ id: "x", name: "x", schedule: [] }]} />);
    expect(screen.getAllByTestId("day-track")).toHaveLength(5);
    expect(screen.queryAllByTestId("pill")).toHaveLength(0);
    expect(screen.getByText(/No classes yet/)).toBeInTheDocument();
  });

  it("pointing at a pill opens the tooltip with subject, teacher, day, time and room; leaving closes it", () => {
    render(<WeekTimeline subjects={SUBJECTS} />);
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(pill(/Thu 8:00 to 11:05 AM, Web Engineering Lab, COMP LAB8/));
    const tip = screen.getByRole("tooltip");
    expect(tip).toHaveTextContent("CSC312L · Web Engineering Lab");
    expect(tip).toHaveTextContent("TBA");
    expect(tip).toHaveTextContent("Thursday 8:00–11:05 AM");
    expect(tip).toHaveTextContent("COMP LAB8");
    expect(pill(/Web Engineering Lab/)).toHaveAttribute("aria-describedby", tip.id);
    fireEvent.mouseLeave(pill(/Web Engineering Lab/));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("the tooltip is drawn on the page body so no card clips it", () => {
    const { container } = render(<WeekTimeline subjects={SUBJECTS} />);
    fireEvent.focus(screen.getAllByTestId("pill")[0]);
    expect(screen.getByRole("tooltip").parentElement).toBe(document.body);
    expect(container.querySelector("[role=tooltip]")).toBeNull();
  });

  it("a class today gets the Today pill and shows the teacher; another day does not", () => {
    render(<WeekTimeline subjects={WITH_TODAY} />);
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

  it("pills are focusable buttons, Escape closes, a tap shows it and a tap elsewhere closes it, and a pointed pill lifts", () => {
    render(<div><WeekTimeline subjects={SUBJECTS} /><p>elsewhere</p></div>);
    const b = pill(/Web Engineering Lab/);
    expect(b.tagName).toBe("BUTTON");
    fireEvent.focus(b);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(b.className).toMatch(/-translate-y-px/);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(b);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(screen.getByText("elsewhere"));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("pills in a day are in start-time order", () => {
    render(<WeekTimeline subjects={SUBJECTS} />);
    const thursday = within(screen.getAllByTestId("day-track").find((t) => t.dataset.day === "Thursday"));
    expect(thursday.getAllByRole("button").map((x) => x.getAttribute("aria-label").split(", ")[1])).toEqual(["Web Engineering Lab", "Compiler Lab", "AI Lab"]);
  });
});

describe("laneBox", () => {
  it("a lone class takes the whole track", () => {
    expect(laneBox(0, 1, 0.9)).toEqual({ top: 0, height: 0.9 });
  });
  it("two or three overlapping classes split the track", () => {
    const [a, b] = [laneBox(0, 2, 0.9), laneBox(1, 2, 0.9)];
    expect(a.top).toBe(0);
    expect(b.top).toBeCloseTo(0.45, 3);
    expect(a.height).toBeCloseTo(0.39, 3);
    expect(laneBox(2, 3, 0.9).top).toBeCloseTo(0.6, 3);
  });
  it("more overlaps than lanes share the last lane and every pill stays inside the track", () => {
    for (let rows = 1; rows <= 6; rows++) {
      for (let row = 0; row < rows; row++) {
        const l = laneBox(row, rows, 0.9);
        expect(l.top + l.height).toBeLessThanOrEqual(0.9 + 1e-9);
        expect(l.top).toBeGreaterThanOrEqual(0);
      }
    }
    expect(laneBox(5, 6, 0.9)).toEqual(laneBox(2, 3, 0.9));
  });
});

describe("timelineHeight", () => {
  it("fits the top band with room to spare for five days and for seven", () => {
    expect(BAND_REM).toBe(11);
    expect(timelineHeight(5)).toBeLessThanOrEqual(BAND_REM - 0.5);
    expect(timelineHeight(7)).toBeLessThanOrEqual(BAND_REM - 0.5);
    expect(rowHeight(7)).toBeLessThan(rowHeight(5));
  });
  it("does not depend on overlaps: a Thursday with four overlapping classes is no taller", () => {
    const four = [1, 2, 3, 4].map((i) => S(`T${i}`, `Thu ${i}`, ["Thursday", "09:00", "12:00", `R${i}`]));
    const days = weekDays(four);
    expect(layoutDay(days.find((d) => d.day === "Thursday").beads).rows).toBe(4);
    expect(timelineHeight(days.length)).toBe(timelineHeight(5));
    render(<WeekTimeline subjects={four} />);
    const sum = screen.getAllByTestId("day-track").reduce((n, t) => n + parseFloat(t.style.height), 0);
    expect(sum).toBeCloseTo(5 * rowHeight(5), 3);
  });
  it("the rendered card is not cut off: no overflow-hidden on it", () => {
    render(<WeekTimeline subjects={SUBJECTS} fill />);
    expect(screen.getByRole("region", { name: "Your week" }).className).not.toMatch(/overflow-hidden/);
  });
});

import React from "react";
import { render, screen } from "@testing-library/react";
import MascotCorner, { speechLine } from "./MascotCorner";
import { PreferencesContext } from "../../preferences/PreferencesProvider";

const DAYNAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const at = (h, m = 0) => { const d = new Date(2026, 9, 19, h, m); return d; }; // Monday 19 Oct 2026
const subj = (...slots) => ({ code: "CSC1", name: "One", schedule: slots.map(([day, start, end]) => ({ day, start, end, room: "R" })) });

describe("speechLine", () => {
  it("says how to start when no class times are set", () => {
    expect(speechLine([{ name: "x", schedule: [] }], at(9))).toMatch(/Add your class times/);
    expect(speechLine([], at(9))).toMatch(/Add your class times/);
  });
  it("is cheerful on a day without classes", () => {
    expect(DAYNAME[at(9).getDay()]).toBe("Monday");
    expect(speechLine([subj(["Tuesday", "09:00", "10:00"])], at(9))).toBe("No classes today, enjoy!");
  });
  it("gives the count and the next class with its time", () => {
    const s = [subj(["Monday", "11:10", "12:40"]), { code: "CSC2", name: "Two", schedule: [{ day: "Monday", start: "14:00", end: "15:00" }] }];
    expect(speechLine(s, at(9))).toBe("2 classes today. Next is CSC1 at 11:10 AM.");
    expect(speechLine(s, at(12))).toBe("2 classes today. Next is CSC2 at 2:00 PM.");
  });
  it("uses the singular for one class", () => {
    expect(speechLine([subj(["Monday", "11:10", "12:40"])], at(9))).toBe("1 class today. Next is CSC1 at 11:10 AM.");
  });
  it("says all done after the last class starts", () => {
    expect(speechLine([subj(["Monday", "11:10", "12:40"])], at(15))).toBe("1 class today, all done. Nice work!");
  });
});

describe("MascotCorner", () => {
  const sheetOf = (c) => Array.from(c.querySelectorAll('span[style*="background-image"]')).map((s) => s.style.backgroundImage).join();
  it("shows the default mascot with no provider, and no card behind it", () => {
    const { container } = render(<MascotCorner subjects={[]} />);
    expect(sheetOf(container)).toContain("/mascots/sloth-directions.webp");
    expect(screen.getByRole("status")).toHaveTextContent(/Add your class times/);
    expect(screen.getByTestId("mascot-corner").className).not.toMatch(/shadow-neu|rounded-3xl|bg-surface/);
  });
  it("shows the mascot the student picked", () => {
    const { container } = render(
      <PreferencesContext.Provider value={{ profile: { mascot: "rocket" } }}><MascotCorner subjects={[]} /></PreferencesContext.Provider>,
    );
    expect(sheetOf(container)).toContain("/mascots/rocket-directions.webp");
  });
  it("falls back to the default for an unknown mascot id", () => {
    const { container } = render(
      <PreferencesContext.Provider value={{ profile: { mascot: "nope" } }}><MascotCorner subjects={[]} /></PreferencesContext.Provider>,
    );
    expect(sheetOf(container)).toContain("/mascots/sloth-directions.webp");
  });
});

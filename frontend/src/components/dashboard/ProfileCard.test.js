import React from "react";
import { render, screen, fireEvent, createEvent, within } from "@testing-library/react";
import ProfileCard, { tiltFor, statFill, STAT_GOALS, MASCOT_WIDTH_PCT, HEAD_POKE_PX } from "./ProfileCard";
import { PreferencesContext } from "../../preferences/PreferencesProvider";

let updateProfile;
function card(profile, props = {}) {
  updateProfile = jest.fn();
  return render(
    <PreferencesContext.Provider value={{ profile, updateProfile }}>
      <ProfileCard displayName="Ahmad" streak={3} doneTasks={5} focusSessions={2} {...props} />
    </PreferencesContext.Provider>
  );
}

// jsdom has no PointerEvent, so give the generic event the fields the card reads.
function move(el, x, y, pointerType) {
  const ev = createEvent.pointerMove(el, {});
  Object.defineProperties(ev, { clientX: { value: x }, clientY: { value: y }, pointerType: { value: pointerType } });
  fireEvent(el, ev);
}

beforeEach(() => {
  window.matchMedia = (q) => ({ matches: /reduce/.test(q) && window.__reduce === true, addEventListener() {}, removeEventListener() {} });
  window.__reduce = false;
});

test("a mascot stands in the card's art window, with the badge, the name and the power stats around it", () => {
  card({ mascot: "cap", segment: "Gen Z" });
  const window_ = screen.getByTestId("mascot-backdrop");
  expect(window_).toHaveClass("relative", "bg-surface");
  expect(window_.querySelector(".bg-\\[rgb\\(var\\(--sage\\)\\/0\\.3\\)\\]")).not.toBeNull();
  expect(within(window_).getByRole("button", { name: "Boop the Cap" })).toBeInTheDocument();
  expect(screen.getByText("Gen Z")).toBeInTheDocument();
  expect(screen.getByTestId("card-name")).toHaveTextContent("Ahmad");
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("Streak")).toBeInTheDocument();
  expect(screen.getByText("Done")).toBeInTheDocument();
  expect(screen.getByText("Focus")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /change mascot/i })).toBeInTheDocument();
  expect(screen.queryByRole("img")).toBeNull();
});

test("the decorative layers over the mascot never take a click, so it can still be poked", () => {
  const { container } = card({ mascot: "cap" });
  const tints = container.querySelectorAll(".bg-gradient-to-t");
  expect(tints.length).toBeGreaterThan(0);
  tints.forEach((el) => expect(el).toHaveClass("pointer-events-none"));
  expect(screen.getByTestId("card-name")).toHaveClass("pointer-events-none");
  const shine = container.querySelector("[aria-hidden='true'].pointer-events-none");
  expect(shine).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Boop the Cap" }));
  const [directions, reactions] = Array.from(screen.getByTestId("mascot-backdrop").querySelectorAll('span[style*="background-image"]'));
  expect(directions.style.opacity).toBe("0");
  expect(reactions.style.opacity).toBe("1");
});

test("a photo fills the art window and wins over a mascot", () => {
  card({ mascot: "cap", avatarUrl: "data:image/png;base64,x" });
  expect(screen.getByRole("img", { name: "Ahmad" })).toHaveAttribute("src", "data:image/png;base64,x");
  expect(screen.queryByRole("button", { name: /boop/i })).toBeNull();
});

test("with neither, the initial and Pick a mascot show", () => {
  card({});
  expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^pick a mascot$/i })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /boop/i })).toBeNull();
  expect(screen.getByText("FocusFlow Member")).toBeInTheDocument();
});

test("Change mascot opens the picker and saves the pick", () => {
  card({ mascot: "cap" });
  fireEvent.click(screen.getByRole("button", { name: /change mascot/i }));
  fireEvent.click(within(screen.getByRole("dialog", { name: "Choose your mascot" })).getByText("Rocket Bot"));
  expect(updateProfile).toHaveBeenCalledWith({ mascot: "rocket", avatarUrl: null });
});

test("the badge row lets pokes through to the mascot's head, but its button still works", () => {
  card({ mascot: "cap" });
  const button = screen.getByRole("button", { name: /change mascot/i });
  expect(button).toHaveClass("pointer-events-auto");
  expect(button.parentElement).toHaveClass("pointer-events-none");
});

test("each power stat has a bar that fills toward its goal", () => {
  card({ mascot: "cap" }, { streak: 7, doneTasks: 20, focusSessions: 0 });
  expect(screen.getByTestId("bar-streak").style.width).toBe("50%");
  expect(screen.getByTestId("bar-done").style.width).toBe("100%");
  expect(screen.getByTestId("bar-focus").style.width).toBe("0%");
});

test("bar maths: capped at full, never negative, empty input is empty", () => {
  expect(statFill(7, STAT_GOALS.streak)).toBeCloseTo(0.5);
  expect(statFill(99, STAT_GOALS.done)).toBe(1);
  expect(statFill(-4, STAT_GOALS.focus)).toBe(0);
  expect(statFill(undefined, STAT_GOALS.focus)).toBe(0);
  expect(statFill("x", STAT_GOALS.focus)).toBe(0);
});

test("the card leans toward the pointer and settles flat when it leaves", () => {
  card({ mascot: "cap" });
  const section = screen.getByTestId("profile-card");
  const tilt = screen.getByTestId("profile-tilt");
  tilt.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 400 });
  move(section, 200, 0, "mouse");
  expect(tilt.style.getPropertyValue("--ry")).toBe("9.00deg");
  expect(tilt.style.getPropertyValue("--rx")).toBe("9.00deg");
  fireEvent.pointerLeave(section);
  expect(tilt.style.getPropertyValue("--ry")).toBe("0deg");
  expect(tilt.style.getPropertyValue("--rx")).toBe("0deg");
});

test("no tilt on touch or with reduced motion", () => {
  card({ mascot: "cap" });
  const section = screen.getByTestId("profile-card");
  const tilt = screen.getByTestId("profile-tilt");
  tilt.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 400 });
  move(section, 200, 0, "touch");
  expect(tilt.style.getPropertyValue("--ry")).toBe("");
  window.__reduce = true;
  move(section, 200, 0, "mouse");
  expect(tilt.style.getPropertyValue("--ry")).toBe("");
});

test("tilt maths: centre is flat, corners lean at most 9 degrees, outside the box is clamped", () => {
  const rect = { left: 100, top: 100, width: 200, height: 200 };
  const mid = tiltFor(200, 200, rect);
  expect(Math.abs(mid.rx)).toBeCloseTo(0);
  expect(Math.abs(mid.ry)).toBeCloseTo(0);
  expect(tiltFor(300, 100, rect)).toMatchObject({ ry: 9, rx: 9 });
  expect(tiltFor(9999, -9999, rect)).toMatchObject({ ry: 9, rx: 9 });
  expect(tiltFor(0, 0, { left: 0, top: 0, width: 0, height: 0 }).mx).toBe(50);
  expect(tiltFor(undefined, NaN, rect)).toMatchObject({ rx: 0, ry: 0 }); // a missing position never gives NaN
});

test("the mascot is sized and placed with plain percentages, so it never depends on container-query units", () => {
  const { container } = card({ mascot: "cap" });
  const figure = screen.getByTestId("mascot-figure");
  expect(figure.style.width).toBe(`${MASCOT_WIDTH_PCT}%`);
  expect(figure.style.aspectRatio).toBe("1 / 1");
  expect(figure.style.marginTop).toBe(`${-MASCOT_WIDTH_PCT / 10}%`);
  expect(figure.style.top).toBe(`${-HEAD_POKE_PX}px`);
  expect(container.innerHTML).not.toMatch(/cqw|cqh|container-type/);
  expect(screen.getByTestId("mascot-clip")).toContainElement(figure);
});

test("the picker also offers a picture of yourself, and a photo replaces the mascot", () => {
  card({ mascot: "cap" });
  fireEvent.click(screen.getByRole("button", { name: /change mascot/i }));
  const dialog = screen.getByRole("dialog", { name: "Choose your mascot" });
  expect(within(dialog).getByRole("button", { name: /add a picture of yourself/i })).toBeInTheDocument();
});

test("in a one-column page the card stays card-sized and centred (the mascot is sized from its width)", () => {
  card({ mascot: "cap" });
  const section = screen.getByTestId("profile-card");
  expect(section).toHaveClass("max-w-[24rem]", "mx-auto", "lg:max-w-none");
});

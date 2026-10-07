import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import RolePicker from "./RolePicker";
import { SWATCHES, TEXT_SWATCHES } from "../../design/theme/palettes";

const ROWS = [
  { label: "Soft", swatches: SWATCHES.soft },
  { label: "Bold", swatches: SWATCHES.bold },
];

function setup(props = {}) {
  const fns = { onPick: jest.fn(), onDrag: jest.fn(), onDragEnd: jest.fn() };
  render(
    <RolePicker role="brand" title="Brand" description="Buttons and highlights." value="#EC706D" rows={ROWS} autoHex="#123456" {...fns} {...props} />
  );
  return fns;
}

test("shows the title, description, the current value and the labelled rows", () => {
  setup();
  const group = screen.getByRole("group", { name: "Brand" });
  expect(within(group).getByText("Buttons and highlights.")).toBeInTheDocument();
  expect(within(group).getByText("Now: #EC706D")).toBeInTheDocument();
  expect(within(group).getByText("Soft")).toBeInTheDocument();
  expect(within(group).getByText("Bold")).toBeInTheDocument();
  expect(within(group).getAllByRole("button")).toHaveLength(16);
});

test("swatches are named, and only the current one is pressed (with a visible tick)", () => {
  setup();
  const coral = screen.getByRole("button", { name: "Coral #EC706D" });
  expect(coral).toHaveAttribute("aria-pressed", "true");
  expect(coral.querySelector("svg")).not.toBeNull();
  const sage = screen.getByRole("button", { name: "Sage #B8DCC4" });
  expect(sage).toHaveAttribute("aria-pressed", "false");
  expect(sage.querySelector("svg")).toBeNull();
  fireEvent.click(sage);
});

test("a swatch click sends its hex", () => {
  const { onPick } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Sage #B8DCC4" }));
  expect(onPick).toHaveBeenCalledWith("#B8DCC4");
});

test("Auto is shown only when allowed, and says whether it is on", () => {
  setup();
  expect(screen.queryByRole("button", { name: "Auto brand" })).toBeNull();
});

test("Auto picks 'auto'", () => {
  const { onPick } = setup({ autoAllowed: true, value: "auto", role: "text", title: "Text" });
  const auto = screen.getByRole("button", { name: "Auto text" });
  expect(auto).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("Now: Auto")).toBeInTheDocument();
  fireEvent.click(auto);
  expect(onPick).toHaveBeenCalledWith("auto");
});

test("the hex box normalises on Enter and on blur", () => {
  const { onPick } = setup();
  const input = screen.getByLabelText("Hex code for brand");
  fireEvent.change(input, { target: { value: " ab12cd " } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onPick).toHaveBeenLastCalledWith("#AB12CD");
  fireEvent.change(input, { target: { value: "#abc" } });
  fireEvent.blur(input);
  expect(onPick).toHaveBeenLastCalledWith("#AABBCC");
});

test("a bad code shows the error and applies nothing; typing clears it", () => {
  const { onPick } = setup();
  const input = screen.getByLabelText("Hex code for brand");
  fireEvent.change(input, { target: { value: "zz12" } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onPick).not.toHaveBeenCalled();
  expect(input).toHaveAttribute("aria-invalid", "true");
  const error = screen.getByText("That isn't a colour code. Try something like #EC706D.");
  expect(input).toHaveAttribute("aria-describedby", error.id);
  fireEvent.change(input, { target: { value: "zz1" } });
  expect(screen.queryByText("That isn't a colour code. Try something like #EC706D.")).toBeNull();
  expect(input).not.toHaveAttribute("aria-invalid");
});

test("an empty box, or the value that is already set, applies nothing", () => {
  const { onPick } = setup({ value: "auto", role: "text", title: "Text", autoAllowed: true });
  const input = screen.getByLabelText("Hex code for text");
  fireEvent.blur(input);
  expect(onPick).not.toHaveBeenCalled();
  expect(input).not.toHaveAttribute("aria-invalid");
});

test("the colour input shows the Auto colour, and reports drags and blur", () => {
  const { onDrag, onDragEnd } = setup({ value: "auto", role: "text", title: "Text", autoAllowed: true, rows: [{ label: "Dark text", swatches: TEXT_SWATCHES.dark }] });
  const color = screen.getByLabelText("Pick a text colour");
  expect(color).toHaveAttribute("type", "color");
  expect(color.value).toBe("#123456");
  fireEvent.change(color, { target: { value: "#654321" } });
  expect(onDrag).toHaveBeenCalledWith("#654321");
  fireEvent.blur(color);
  expect(onDragEnd).toHaveBeenCalled();
});

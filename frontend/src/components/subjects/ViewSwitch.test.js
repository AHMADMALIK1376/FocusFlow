import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ViewSwitch from "./ViewSwitch";

const Harness = ({ start = "cube", spy = () => {} }) => {
  const [v, setV] = useState(start);
  return <ViewSwitch value={v} onChange={(x) => { spy(x); setV(x); }} />;
};
const cube = () => screen.getByRole("radio", { name: /Cube/ });
const table = () => screen.getByRole("radio", { name: /Table/ });

it("is a radio group with Cube and Table, the chosen one checked", () => {
  render(<Harness />);
  expect(screen.getByRole("radiogroup", { name: "Subjects view" })).toBeInTheDocument();
  expect(screen.getAllByRole("radio")).toHaveLength(2);
  expect(cube()).toHaveAttribute("aria-checked", "true");
  expect(table()).toHaveAttribute("aria-checked", "false");
});
it("a click chooses the view", () => {
  const spy = jest.fn();
  render(<Harness spy={spy} />);
  fireEvent.click(table());
  expect(spy).toHaveBeenCalledWith("table");
  expect(table()).toHaveAttribute("aria-checked", "true");
  expect(cube()).toHaveAttribute("aria-checked", "false");
});
it("only the chosen radio is in the tab order", () => {
  render(<Harness />);
  expect(cube()).toHaveAttribute("tabindex", "0");
  expect(table()).toHaveAttribute("tabindex", "-1");
});
it("arrow keys move the choice and the focus, wrapping round", () => {
  render(<Harness />);
  cube().focus();
  fireEvent.keyDown(cube(), { key: "ArrowRight" });
  expect(table()).toHaveAttribute("aria-checked", "true");
  expect(table()).toHaveFocus();
  fireEvent.keyDown(table(), { key: "ArrowRight" });
  expect(cube()).toHaveAttribute("aria-checked", "true");
  expect(cube()).toHaveFocus();
  fireEvent.keyDown(cube(), { key: "ArrowLeft" });
  expect(table()).toHaveAttribute("aria-checked", "true");
  fireEvent.keyDown(table(), { key: "ArrowUp" });
  expect(cube()).toHaveAttribute("aria-checked", "true");
  fireEvent.keyDown(cube(), { key: "ArrowDown" });
  expect(table()).toHaveAttribute("aria-checked", "true");
});
it("other keys do nothing", () => {
  const spy = jest.fn();
  render(<Harness spy={spy} />);
  fireEvent.keyDown(cube(), { key: "a" });
  expect(spy).not.toHaveBeenCalled();
});
it("each option is a compact 32px pill with a 14px icon with its label", () => {
  render(<Harness />);
  expect(cube().className).toContain("min-h-[32px]");
  expect(cube().className).toContain("text-xs");
  expect(cube().querySelector("svg")).toHaveAttribute("width", "14");
  expect(cube().querySelector("svg")).not.toBeNull();
  expect(table().querySelector("svg")).not.toBeNull();
});

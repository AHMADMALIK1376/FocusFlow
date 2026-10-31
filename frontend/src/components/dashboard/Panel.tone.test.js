import React from "react";
import { render, screen } from "@testing-library/react";
import { Panel, PANEL_TONES } from "./DashKit";
import { EmptyState } from "../ui";

test("a panel is white and roomy by default, exactly as before", () => {
  render(<Panel title="Plain">body</Panel>);
  const section = screen.getByText("body").closest("section");
  expect(section).toHaveClass("bg-surface", "p-6", "shadow-neu");
});

test("a tone gives a light fill from the design tokens, and compact makes it smaller", () => {
  render(<Panel title="Tinted" tone="sage" compact>body</Panel>);
  const section = screen.getByText("body").closest("section");
  expect(section).toHaveClass("bg-[rgb(var(--sage)/0.32)]", "p-4");
  expect(section).not.toHaveClass("bg-surface");
  for (const cls of Object.values(PANEL_TONES)) expect(cls).toMatch(/^bg-\[rgb\(var\(--[a-z]+\)\/[0-9.]+\)\]$/); // tokens only, never a fixed colour
});

test("an unknown tone falls back to the normal white panel", () => {
  render(<Panel tone="nope">body</Panel>);
  expect(screen.getByText("body").closest("section")).toHaveClass("bg-surface");
});

test("a compact empty state is much smaller than the normal one", () => {
  const { container, rerender } = render(<EmptyState title="Nothing" description="Add one" icon="award" />);
  expect(container.firstChild).toHaveClass("py-12");
  rerender(<EmptyState compact title="Nothing" description="Add one" icon="award" />);
  expect(container.firstChild).toHaveClass("py-3");
  expect(container.firstChild).not.toHaveClass("py-12");
});

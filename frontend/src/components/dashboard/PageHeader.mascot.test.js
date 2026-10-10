import React from "react";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./DashKit";

test("the header shows the page mascot by default", () => {
  render(<PageHeader title="Anything" />);
  expect(screen.getAllByRole("button", { name: /^Boop the/ })).toHaveLength(1);
});

test("mascot={false} leaves it out", () => {
  render(<PageHeader title="Anything" mascot={false} />);
  expect(screen.queryByRole("button", { name: /^Boop the/ })).toBeNull();
});

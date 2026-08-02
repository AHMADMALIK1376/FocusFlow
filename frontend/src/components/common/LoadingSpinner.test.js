import React from "react";
import { render, screen, renderHook } from "@testing-library/react";
import { PageLoading, PanelLoading, useFirstLoad } from "./LoadingSpinner";

test("page and panel loaders show the logo with their message", () => {
  render(<><PageLoading message="Loading notes…" /><PanelLoading message="Loading grades…" /></>);
  expect(screen.getByRole("status", { name: "Loading notes…" })).toBeInTheDocument();
  expect(screen.getByRole("status", { name: "Loading grades…" })).toBeInTheDocument();
  expect(document.querySelectorAll(".ff-loader-logo img")).toHaveLength(4); // two lines per logo
});

test("useFirstLoad: true until the first load ends, then stays false through refreshes", () => {
  const { result, rerender } = renderHook(({ loading }) => useFirstLoad(loading), { initialProps: { loading: true } });
  expect(result.current).toBe(true);
  rerender({ loading: false });
  expect(result.current).toBe(false);
  rerender({ loading: true }); // a refresh after a save
  expect(result.current).toBe(false);
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CrashScreen, { isUpdateError } from "./CrashScreen";
import ErrorBoundary from "../common/ErrorBoundary";

test("a crash shows the 500 page, with what happened on request", () => {
  const onReload = jest.fn();
  render(<CrashScreen error={new Error("x is undefined")} onReload={onReload} onHome={() => {}} />);
  expect(screen.getByText("Something broke on our side")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Error 500" })).toBeInTheDocument();
  expect(screen.queryByText("x is undefined")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "What happened?" }));
  expect(screen.getByText("x is undefined")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Reload page/ }));
  expect(onReload).toHaveBeenCalled();
});

test("a page that failed to load after a new deploy reads as an update, not a crash", () => {
  const e = new Error("Loading chunk 412 failed.");
  e.name = "ChunkLoadError";
  expect(isUpdateError(e)).toBe(true);
  expect(isUpdateError(new Error("Failed to fetch dynamically imported module: /static/js/x.js"))).toBe(true);
  expect(isUpdateError(new Error("x is undefined"))).toBe(false);
  render(<CrashScreen error={e} onReload={() => {}} onHome={() => {}} />);
  expect(screen.getByText("FocusFlow was updated")).toBeInTheDocument();
});

test("ErrorBoundary shows the crash page when a child throws", () => {
  const Boom = () => { throw new Error("boom"); };
  jest.spyOn(console, "error").mockImplementation(() => {});
  render(<ErrorBoundary><Boom /></ErrorBoundary>);
  expect(screen.getByText("Something broke on our side")).toBeInTheDocument();
  console.error.mockRestore();
});

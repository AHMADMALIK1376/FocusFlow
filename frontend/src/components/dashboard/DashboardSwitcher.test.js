// Inside a Settings pop-up, Escape in the workspace inputs cancels the edit only.
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardSwitcher from "./DashboardSwitcher";
import { Modal } from "../ui";
import { PreferencesContext } from "../../preferences/PreferencesProvider";

const db = { id: "d1", name: "My Dashboard" };
function inPopup(switchDashboard = jest.fn()) {
  const onClose = jest.fn();
  render(
    <PreferencesContext.Provider value={{
      dashboards: [db], activeDashboard: db, activeDashboardId: "d1",
      createDashboard: jest.fn(), removeDashboard: jest.fn(), renameDashboard: jest.fn(), switchDashboard,
    }}>
      <Modal open onClose={onClose} title="Dashboard and workspaces"><DashboardSwitcher /></Modal>
    </PreferencesContext.Provider>
  );
  fireEvent.click(screen.getByRole("button", { name: "Workspaces" }));
  return onClose;
}

test("Escape while naming a new workspace cancels it, and leaves the pop-up open", () => {
  const onClose = inPopup();
  fireEvent.click(screen.getByText(/new workspace/i));
  const input = screen.getByPlaceholderText(/workspace name/i);
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByPlaceholderText(/workspace name/i)).toBeNull();
  expect(onClose).not.toHaveBeenCalled();
});

test("Escape while renaming a workspace cancels it, and leaves the pop-up open", () => {
  const onClose = inPopup();
  fireEvent.click(screen.getByRole("button", { name: /rename/i }));
  const input = screen.getByDisplayValue("My Dashboard");
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByDisplayValue("My Dashboard")).toBeNull();
  expect(onClose).not.toHaveBeenCalled();
});

test("the trigger says whether the menu is open", () => {
  inPopup();
  expect(screen.getByRole("button", { name: "Workspaces" })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("button", { name: "Workspaces" })).toHaveAttribute("aria-haspopup", "true");
});

test("a workspace is a real button that switches, and focus goes back to the trigger", () => {
  const switchDashboard = jest.fn();
  inPopup(switchDashboard);
  fireEvent.click(screen.getByRole("button", { name: /My Dashboard/ }));
  expect(switchDashboard).toHaveBeenCalledWith("d1");
  expect(screen.queryByRole("button", { name: "Rename" })).toBeNull();
  expect(screen.getByRole("button", { name: "Workspaces" })).toHaveFocus();
});

test("Rename and Delete are shown when focus is inside the row", () => {
  inPopup();
  expect(screen.getByRole("button", { name: "Rename" }).parentElement).toHaveClass("group-focus-within:opacity-100");
});

test("Escape closes the menu only, and focus goes back to the trigger", () => {
  const onClose = inPopup();
  screen.getByRole("button", { name: /My Dashboard/ }).focus();
  fireEvent.keyDown(document.activeElement, { key: "Escape" });
  expect(screen.queryByRole("button", { name: "Rename" })).toBeNull();
  expect(screen.getByRole("button", { name: "Workspaces" })).toHaveFocus();
  expect(onClose).not.toHaveBeenCalled();
});

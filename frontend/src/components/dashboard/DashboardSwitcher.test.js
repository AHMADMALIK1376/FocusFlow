// Inside a Settings pop-up, Escape in the workspace inputs cancels the edit only.
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardSwitcher from "./DashboardSwitcher";
import { Modal } from "../ui";
import { PreferencesContext } from "../../preferences/PreferencesProvider";

const db = { id: "d1", name: "My Dashboard" };
function inPopup() {
  const onClose = jest.fn();
  render(
    <PreferencesContext.Provider value={{
      dashboards: [db], activeDashboard: db, activeDashboardId: "d1",
      createDashboard: jest.fn(), removeDashboard: jest.fn(), renameDashboard: jest.fn(), switchDashboard: jest.fn(),
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

import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Modal } from "./Modal";

function Harness(props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Test" showClose {...props}>
        <input aria-label="Name" />
        <button>Save</button>
      </Modal>
    </>
  );
}

test("trapFocus: focus moves in, Tab wraps both ways, and focus returns to the opener", async () => {
  render(<Harness trapFocus />);
  const opener = screen.getByRole("button", { name: "Open" });
  opener.focus();
  fireEvent.click(opener);
  const dialog = screen.getByRole("dialog", { name: "Test" });
  expect(document.activeElement).toBe(dialog);

  const close = screen.getByRole("button", { name: "Close" });
  const save = screen.getByRole("button", { name: "Save" });
  save.focus();
  fireEvent.keyDown(document, { key: "Tab" });
  expect(document.activeElement).toBe(close);
  fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(save);

  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(document.activeElement).toBe(opener);
});

test("without trapFocus a modal behaves as before", () => {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
  const dialog = screen.getByRole("dialog", { name: "Test" });
  expect(dialog).not.toHaveAttribute("tabindex");
  expect(dialog).toHaveClass("max-h-[85vh]", "rounded-token-lg");
  expect(dialog.parentElement).toHaveClass("z-[1000]", "p-4");
});

test("fullHeightOnMobile: a full-height sheet on phones, above the tab bar", () => {
  render(<Harness fullHeightOnMobile />);
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
  const dialog = screen.getByRole("dialog", { name: "Test" });
  expect(dialog).toHaveClass("h-[100dvh]", "rounded-none", "sm:max-h-[85vh]", "sm:rounded-token-lg");
  expect(dialog.parentElement).toHaveClass("z-[1500]", "p-0", "sm:p-4");
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TimetableImportModal from "./TimetableImportModal";

const mockRefresh = jest.fn();
jest.mock("../../components/context/AppContext", () => ({ useApp: () => ({ refreshSubjectData: mockRefresh }) }));
jest.mock("../scanner/ocr", () => ({ ocrImage: jest.fn() }));
jest.mock("../scanner/tableLayout", () => ({ rebuildRows: jest.fn() }));
jest.mock("../../services/api", () => ({ subjectAPI: { create: jest.fn().mockResolvedValue({}), update: jest.fn() } }));

test("after the scanner saves, the dashboard's subject numbers are refreshed before the page's own refresh", async () => {
  const order = [];
  mockRefresh.mockImplementation(async () => { order.push("app"); });
  const onImported = jest.fn(async () => { order.push("page"); });
  render(<TimetableImportModal open onClose={jest.fn()} existing={[]} onImported={onImported} />);

  fireEvent.click(screen.getByText(/Paste text/i));
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "032610354\tCSC452\tCOMPILER CONSTRUCTION\t2\tMR. KHAN\tTUE 01:15 03:20 LR26" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Scan$/ }));
  fireEvent.click(await screen.findByRole("button", { name: /Add 1/ }));

  await waitFor(() => expect(onImported).toHaveBeenCalled());
  expect(order).toEqual(["app", "page"]);
});

import React from "react";
import { render } from "@testing-library/react";
import useLmsAutoSync from "./useLmsAutoSync";

const mockSync = jest.fn();
jest.mock("../../services/api", () => ({ lmsAPI: { sync: (...a) => mockSync(...a) } }));
const Probe = () => { useLmsAutoSync(); return null; };

beforeEach(() => { mockSync.mockReset(); sessionStorage.clear(); });

test("the dashboard asks for a refresh once per browser session, however often it opens", () => {
  mockSync.mockResolvedValue({ result: {} });
  const first = render(<Probe />);
  first.unmount();
  render(<Probe />);
  expect(mockSync).toHaveBeenCalledTimes(1);
});

test("a failed refresh is silent and never breaks the dashboard", async () => {
  mockSync.mockRejectedValue(new Error("offline"));
  expect(() => render(<Probe />)).not.toThrow();
  await Promise.resolve();
  expect(mockSync).toHaveBeenCalledTimes(1);
});

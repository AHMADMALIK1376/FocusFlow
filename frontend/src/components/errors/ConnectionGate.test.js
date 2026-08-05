import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import ConnectionGate, { RETRY_SECONDS } from "./ConnectionGate";
import { pingServer } from "../../services/api";

jest.mock("../../services/api", () => ({ pingServer: jest.fn(), SERVER_TROUBLE_EVENT: "ff:server-trouble" }));

const trouble = () => act(async () => { window.dispatchEvent(new Event("ff:server-trouble")); });
let onRecover;
beforeEach(() => { onRecover = jest.fn(); pingServer.mockReset(); });
afterEach(() => jest.useRealTimers());

test("hidden while everything works", () => {
  const { container } = render(<ConnectionGate onRecover={onRecover} />);
  expect(container).toBeEmptyDOMElement();
});

test("one failed request alone shows nothing if the server answers the health check", async () => {
  pingServer.mockResolvedValue(true);
  const { container } = render(<ConnectionGate onRecover={onRecover} />);
  await trouble();
  expect(pingServer).toHaveBeenCalledTimes(1);
  expect(container).toBeEmptyDOMElement();
  expect(onRecover).not.toHaveBeenCalled();
});

test("server down: 503 page, counts down, retries, then recovers", async () => {
  jest.useFakeTimers();
  pingServer.mockResolvedValue(false);
  render(<ConnectionGate onRecover={onRecover} />);
  await trouble();
  expect(screen.getByText("Can't reach FocusFlow's server")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Error 503" })).toBeInTheDocument();
  expect(screen.getByText(`Trying again in ${RETRY_SECONDS} seconds`)).toBeInTheDocument();

  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(screen.getByText(`Trying again in ${RETRY_SECONDS - 5} seconds`)).toBeInTheDocument();

  pingServer.mockResolvedValue(true);
  await act(async () => { jest.advanceTimersByTime((RETRY_SECONDS - 5) * 1000); });
  expect(pingServer).toHaveBeenCalledTimes(2);
  expect(onRecover).toHaveBeenCalledTimes(1);
});

test("Try now checks straight away", async () => {
  pingServer.mockResolvedValue(false);
  render(<ConnectionGate onRecover={onRecover} />);
  await trouble();
  pingServer.mockResolvedValue(true);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Try now/ })); });
  expect(onRecover).toHaveBeenCalledTimes(1);
});

test("offline page on the offline event; back online reloads once the server answers", async () => {
  pingServer.mockResolvedValue(true);
  render(<ConnectionGate onRecover={onRecover} />);
  await act(async () => { window.dispatchEvent(new Event("offline")); });
  expect(screen.getByText("You're offline")).toBeInTheDocument();
  await act(async () => { window.dispatchEvent(new Event("online")); });
  expect(onRecover).toHaveBeenCalledTimes(1);
});

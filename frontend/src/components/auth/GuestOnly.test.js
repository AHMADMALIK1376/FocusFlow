import React from "react";
import { render, screen } from "@testing-library/react";
import GuestOnly from "./GuestOnly";

let mockUser = { userName: null };
let mockToken = null;
jest.mock("react-router-dom", () => ({
  Navigate: ({ to }) => <p>redirected to {to}</p>,
}), { virtual: true });
jest.mock("./UserContext", () => ({ useUser: () => mockUser }));
jest.mock("../../services/api", () => ({ getToken: () => mockToken }));

const page = () => render(<GuestOnly><p>sign-in page</p></GuestOnly>);

test("a signed-out visitor sees the sign-in page", () => {
  mockUser = { userName: null }; mockToken = null;
  page();
  expect(screen.getByText("sign-in page")).toBeInTheDocument();
});

test("a signed-in student is sent straight to the dashboard", () => {
  mockUser = { userName: "Ahmad" }; mockToken = "abc";
  page();
  expect(screen.getByText("redirected to /dashboard")).toBeInTheDocument();
});

test("a saved name without a login (or the reverse) still counts as signed out", () => {
  mockUser = { userName: "Ahmad" }; mockToken = null;
  const a = page();
  expect(screen.getByText("sign-in page")).toBeInTheDocument();
  a.unmount();
  mockUser = { userName: null }; mockToken = "abc";
  page();
  expect(screen.getByText("sign-in page")).toBeInTheDocument();
});

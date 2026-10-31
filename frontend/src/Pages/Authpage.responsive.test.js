import React from "react";
import { render, screen } from "@testing-library/react";
import AuthPage from "./Authpage";

let mockPath = "/login";
jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...p }) => <a href={to} {...p}>{children}</a>,
  Outlet: () => <div data-testid="outlet" />,
  useLocation: () => ({ pathname: mockPath }),
  useNavigate: () => jest.fn(),
}), { virtual: true });
jest.mock("lottie-react", () => () => null);
jest.mock("../preferences/useThemedLottie", () => ({ useThemedLottie: (d) => d }));
jest.mock("../features/consent/googleSignIn", () => ({ loadGoogleScript: () => Promise.resolve() }));

beforeEach(() => { window.localStorage.clear(); });

const at = (p) => { mockPath = p; return render(<AuthPage />); };

test("phone: a short brand header replaces the sliding hero, with the right heading per page", () => {
  const { container, unmount } = at("/login");
  const header = container.querySelector(".md\\:hidden.bg-grad-hero");
  expect(header).not.toBeNull();
  expect(header).toHaveTextContent("The Ascent Awaits.");
  unmount();
  const signup = at("/signup");
  expect(signup.container.querySelector(".md\\:hidden.bg-grad-hero")).toHaveTextContent("System Ready.");
});

test("phone: the card is one column and the sliding background and hero are laptop-only", () => {
  const { container } = at("/signup");
  const card = container.querySelector(".md\\:w-\\[900px\\]");
  expect(card.className).toMatch(/\bw-full\b/);
  expect(container.querySelector(".absolute.inset-0.hidden.md\\:flex")).not.toBeNull();
  expect(container.querySelector(".hidden.md\\:block.absolute")).not.toBeNull();
  // the form column only slides on md and up
  expect(container.innerHTML).toContain("md:translate-x-full");
  expect(container.innerHTML).not.toMatch(/[" ]translate-x-full/);
});

test("phone: the sign-in and sign-up pages offer a link to each other; other pages do not", () => {
  const login = at("/login");
  expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
  login.unmount();
  const signup = at("/signup");
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  signup.unmount();
  const forgot = at("/forgot-password");
  expect(screen.queryByRole("link", { name: "Create an account" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  forgot.unmount();
  at("/verify");
  expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
});

test("laptop: the original switch button and title are still there", () => {
  at("/login");
  expect(screen.getByRole("button", { name: "Join the Tribe" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "The Ascent Awaits." })).toBeInTheDocument();
});

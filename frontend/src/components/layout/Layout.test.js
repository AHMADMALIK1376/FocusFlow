// The shell switches at lg: sidebar from lg up, tab bar and its bottom padding below.
import React from "react";
import { render } from "@testing-library/react";
import Layout from "./Layout";

jest.mock("react-router-dom", () => ({ Outlet: () => <div>page</div> }), { virtual: true });
jest.mock("./Navbar", () => () => <div>navbar</div>);
jest.mock("./MobileTabBar", () => () => <div>tabbar</div>);
jest.mock("./Sidebar", () => () => <div>sidebar</div>);
jest.mock("../../theme/useGlobalThemeShortcut", () => ({ useGlobalThemeShortcut: () => {} }));

test("the page keeps room for the tab bar until lg", () => {
  const { container } = render(<Layout />);
  const main = container.querySelector("main");
  expect(main.className).toContain("pb-24");
  expect(main.className).toContain("lg:pb-8");
  expect(main.className).not.toContain("md:pb-8");
});

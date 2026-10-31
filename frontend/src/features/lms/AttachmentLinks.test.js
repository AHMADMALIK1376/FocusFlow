import React from "react";
import { render, screen } from "@testing-library/react";
import AttachmentLinks, { sizeText } from "./AttachmentLinks";

test("each teacher file is a link that opens in a new tab through FocusFlow's own address, with its size", () => {
  render(<AttachmentLinks files={[{ id: "f 1", name: "Lab 4.pdf", size: 2048 }, { id: "f2", name: "data.csv", size: 0 }]} />);
  const pdf = screen.getByRole("link", { name: /Lab 4\.pdf/ });
  expect(pdf).toHaveAttribute("href", "/api/lms/file/f%201");
  expect(pdf).toHaveAttribute("target", "_blank");
  expect(pdf).toHaveAttribute("rel", "noopener noreferrer");
  expect(pdf).toHaveTextContent("2.0 KB");
  expect(screen.getByRole("link", { name: "data.csv" })).toBeInTheDocument();
  expect(screen.getByRole("list", { name: "Files from your teacher" })).toBeInTheDocument();
});

test("no files, or nothing at all, shows nothing", () => {
  const a = render(<AttachmentLinks files={[]} />);
  expect(a.container).toBeEmptyDOMElement();
  const b = render(<AttachmentLinks />);
  expect(b.container).toBeEmptyDOMElement();
});

test("sizes read plainly", () => {
  expect(sizeText(0)).toBe("");
  expect(sizeText(512)).toBe("512 B");
  expect(sizeText(1536)).toBe("1.5 KB");
  expect(sizeText(5 * 1024 * 1024)).toBe("5.0 MB");
  expect(sizeText("x")).toBe("");
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MascotPicker } from "./MascotPicker";
import * as avatarImage from "./avatarImage";

afterEach(() => jest.restoreAllMocks());
const choose = (file) => fireEvent.change(screen.getByTestId("photo-input"), { target: { files: [file] } });

test("without onPhoto there is no picture button (mascots only)", () => {
  render(<MascotPicker open onClose={() => {}} onPick={() => {}} />);
  expect(screen.queryByRole("button", { name: /add a picture/i })).toBeNull();
});

test("with onPhoto, the button opens the file chooser and a good photo is handed over and the pop-up closes", async () => {
  jest.spyOn(avatarImage, "fileToAvatar").mockResolvedValue("data:image/jpeg;base64,abc");
  const onPhoto = jest.fn(), onClose = jest.fn(), onPick = jest.fn();
  render(<MascotPicker open onClose={onClose} onPick={onPick} onPhoto={onPhoto} />);
  const click = jest.spyOn(screen.getByTestId("photo-input"), "click");
  fireEvent.click(screen.getByRole("button", { name: /add a picture of yourself/i }));
  expect(click).toHaveBeenCalled();
  choose(new File(["x"], "me.png", { type: "image/png" }));
  await waitFor(() => expect(onPhoto).toHaveBeenCalledWith("data:image/jpeg;base64,abc"));
  expect(onClose).toHaveBeenCalled();
  expect(onPick).not.toHaveBeenCalled();
});

test("a bad file shows a plain message, keeps the pop-up open and changes nothing", async () => {
  jest.spyOn(avatarImage, "fileToAvatar").mockRejectedValue(new Error("Please choose an image file."));
  const onPhoto = jest.fn(), onClose = jest.fn();
  render(<MascotPicker open onClose={onClose} onPick={() => {}} onPhoto={onPhoto} />);
  choose(new File(["x"], "a.pdf", { type: "application/pdf" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Please choose an image file.");
  expect(onPhoto).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

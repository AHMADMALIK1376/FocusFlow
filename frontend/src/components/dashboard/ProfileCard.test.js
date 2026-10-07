import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import ProfileCard from "./ProfileCard";
import { PreferencesContext } from "../../preferences/PreferencesProvider";

let updateProfile;
function card(profile) {
  updateProfile = jest.fn();
  return render(
    <PreferencesContext.Provider value={{ profile, updateProfile }}>
      <ProfileCard displayName="Ahmad" streak={3} doneTasks={5} focusSessions={2} />
    </PreferencesContext.Provider>
  );
}

test("a mascot fills the card on a light sage backdrop, with the stats on top", () => {
  card({ mascot: "cap", segment: "Gen Z" });
  const backdrop = screen.getByTestId("mascot-backdrop");
  expect(backdrop).toHaveClass("absolute", "inset-0", "bg-surface");
  expect(backdrop.querySelector(".bg-\\[rgb\\(var\\(--sage\\)\\/0\\.3\\)\\]")).not.toBeNull();
  expect(within(backdrop).getByRole("button", { name: "Boop the Cap" })).toBeInTheDocument();
  expect(screen.getByText("Gen Z")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("Streak")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /change mascot/i })).toBeInTheDocument();
  expect(screen.queryByRole("img")).toBeNull();
});

test("the mascot can still be poked through the fade", () => {
  const { container } = card({ mascot: "cap" });
  // The fade sits over the mascot but lets the pointer through.
  const fades = container.querySelectorAll(".bg-gradient-to-t");
  expect(fades).toHaveLength(1);
  expect(fades[0]).toHaveClass("pointer-events-none");
  fireEvent.click(screen.getByRole("button", { name: "Boop the Cap" }));
  const [directions, reactions] = Array.from(screen.getByTestId("mascot-backdrop").querySelectorAll('span[style*="background-image"]'));
  expect(directions.style.opacity).toBe("0");
  expect(reactions.style.opacity).toBe("1");
});

test("a photo still fills the card, and wins over a mascot", () => {
  card({ mascot: "cap", avatarUrl: "data:image/png;base64,x" });
  expect(screen.getByRole("img", { name: "Ahmad" })).toHaveAttribute("src", "data:image/png;base64,x");
  expect(screen.queryByTestId("mascot-backdrop")).toBeNull();
  expect(screen.queryByRole("button", { name: /boop/i })).toBeNull();
});

test("with neither, the initial and Pick a mascot show", () => {
  card({});
  expect(screen.getByRole("button", { name: "A" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^pick a mascot$/i })).toBeInTheDocument();
  expect(screen.queryByTestId("mascot-backdrop")).toBeNull();
});

test("Change mascot opens the picker and saves the pick", () => {
  card({ mascot: "cap" });
  fireEvent.click(screen.getByRole("button", { name: /change mascot/i }));
  fireEvent.click(within(screen.getByRole("dialog", { name: "Choose your mascot" })).getByText("Rocket Bot"));
  expect(updateProfile).toHaveBeenCalledWith({ mascot: "rocket", avatarUrl: null });
});

// A token whose account was deleted (or that expired) must not leave the app
// half-working: the saved login is cleared and the student is sent to /login.
import { subjectAPI, authAPI } from "./api";

const makeResponse = (status, body) => ({
  ok: status < 400, status,
  json: () => Promise.resolve(body),
  clone: () => makeResponse(status, body),
});
const reply = (status, body) => Promise.resolve(makeResponse(status, body));

let assign;
beforeEach(() => {
  assign = jest.fn();
  delete window.location;
  window.location = { assign, pathname: "/subjects" };
  localStorage.setItem("focus_token", "abc");
  localStorage.setItem("focus_username", "Ahmad");
});

test("deleted account: login is forgotten, student goes to /login, the message is clear", async () => {
  global.fetch = jest.fn(() => reply(401, { error: "This account no longer exists. Please sign in again.", code: "USER_NOT_FOUND" }));
  await expect(subjectAPI.getAll()).rejects.toThrow("This account no longer exists");
  expect(localStorage.getItem("focus_token")).toBeNull();
  expect(localStorage.getItem("focus_username")).toBeNull();
  expect(assign).toHaveBeenCalledWith("/login");
});

test("expired token does the same", async () => {
  global.fetch = jest.fn(() => reply(401, { error: "Token expired.", code: "TOKEN_EXPIRED" }));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(localStorage.getItem("focus_token")).toBeNull();
  expect(assign).toHaveBeenCalledWith("/login");
});

test("a normal failure (wrong password, server error) keeps the login", async () => {
  global.fetch = jest.fn(() => reply(401, { error: "Invalid email or password." }));
  await expect(authAPI.getMe()).rejects.toThrow("Invalid email or password");
  global.fetch = jest.fn(() => reply(500, { error: "boom" }));
  await expect(subjectAPI.getAll()).rejects.toThrow("boom");
  expect(localStorage.getItem("focus_token")).toBe("abc");
  expect(assign).not.toHaveBeenCalled();
});

test("already on the login page: no redirect loop", async () => {
  window.location.pathname = "/login";
  global.fetch = jest.fn(() => reply(401, { error: "x", code: "INVALID_TOKEN" }));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(assign).not.toHaveBeenCalled();
});

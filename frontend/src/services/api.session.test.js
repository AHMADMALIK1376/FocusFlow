// The sign-in is an HttpOnly cookie the browser sends by itself. The page keeps only a
// "signed in" marker. A login that stopped working (account deleted, expired, cookie
// gone) must not leave the app half-working: the marker is cleared and the student is
// sent to /login.
import { subjectAPI, authAPI, getToken, setToken } from "./api";

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
  localStorage.clear();
  localStorage.setItem("focus_signedin", "1");
  localStorage.setItem("focus_username", "Ahmad");
});

test("deleted account: the marker is forgotten, student goes to /login, the message is clear", async () => {
  global.fetch = jest.fn(() => reply(401, { error: "This account no longer exists. Please sign in again.", code: "USER_NOT_FOUND" }));
  await expect(subjectAPI.getAll()).rejects.toThrow("This account no longer exists");
  expect(getToken()).toBeNull();
  expect(localStorage.getItem("focus_username")).toBeNull();
  expect(assign).toHaveBeenCalledWith("/login");
});

test("expired login does the same", async () => {
  global.fetch = jest.fn(() => reply(401, { error: "Token expired.", code: "TOKEN_EXPIRED" }));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(getToken()).toBeNull();
  expect(assign).toHaveBeenCalledWith("/login");
});

test("the cookie is gone but the page still thinks it is signed in: signed out cleanly", async () => {
  global.fetch = jest.fn(() => reply(401, { error: "Access denied. No token provided.", code: "NO_TOKEN" }));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(getToken()).toBeNull();
  expect(assign).toHaveBeenCalledWith("/login");
});

test("a normal failure (wrong password, server error) keeps the sign-in", async () => {
  global.fetch = jest.fn(() => reply(401, { error: "Invalid email or password." }));
  await expect(authAPI.getMe()).rejects.toThrow("Invalid email or password");
  global.fetch = jest.fn(() => reply(500, { error: "boom" }));
  await expect(subjectAPI.getAll()).rejects.toThrow("boom");
  expect(getToken()).toBe("session");
  expect(assign).not.toHaveBeenCalled();
});

test("already on the login page: no redirect loop", async () => {
  window.location.pathname = "/login";
  global.fetch = jest.fn(() => reply(401, { error: "x", code: "INVALID_TOKEN" }));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(assign).not.toHaveBeenCalled();
});

test("a signed-out visitor getting NO_TOKEN is not redirected (they are already on public pages)", async () => {
  localStorage.clear();
  global.fetch = jest.fn(() => reply(401, { error: "Access denied.", code: "NO_TOKEN" }));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(assign).not.toHaveBeenCalled();
});

// ---- how requests are sent ----
test("every request carries the cookie and the CSRF header, and no token", async () => {
  global.fetch = jest.fn(() => reply(200, []));
  await subjectAPI.getAll();
  const [url, init] = global.fetch.mock.calls[0];
  expect(url).toBe("/api/subjects");
  expect(init.credentials).toBe("include");
  expect(init.headers["X-Requested-With"]).toBe("FocusFlow");
  expect(init.headers.Authorization).toBeUndefined();
});

test("the sign-in marker is all the page keeps: no login token in storage after signing in", () => {
  setToken("anything-the-server-said");
  expect(localStorage.getItem("focus_token")).toBeNull();
  expect(getToken()).toBe("session");
  expect(JSON.stringify({ ...localStorage })).not.toContain("anything-the-server-said");
  setToken(null);
  expect(getToken()).toBeNull();
});

// ---- a browser signed in before the cookie existed ----
test("an older saved login is sent one last time, then dropped once the server accepts it", async () => {
  localStorage.clear();
  localStorage.setItem("focus_token", "old-token");
  localStorage.setItem("focus_username", "Ahmad");
  expect(getToken()).toBe("old-token");
  global.fetch = jest.fn(() => reply(200, []));
  await subjectAPI.getAll();
  expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer old-token");
  expect(localStorage.getItem("focus_token")).toBeNull();
  expect(getToken()).toBe("session");
  await subjectAPI.getAll();
  expect(global.fetch.mock.calls[1][1].headers.Authorization).toBeUndefined();
});

test("an older login the server rejects is signed out, not kept", async () => {
  localStorage.clear();
  localStorage.setItem("focus_token", "dead-token");
  global.fetch = jest.fn(() => reply(401, { error: "Invalid token.", code: "INVALID_TOKEN" }));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(localStorage.getItem("focus_token")).toBeNull();
  expect(assign).toHaveBeenCalledWith("/login");
});

// ---- confirm before signing out (a one-off "no cookie" must not end the session) ----
const NO_TOKEN = { error: "Access denied.", code: "NO_TOKEN" };
const meCalls = () => global.fetch.mock.calls.filter(([url]) => url === "/api/auth/me");
const routed = (me, other = () => reply(401, NO_TOKEN)) =>
  jest.fn((url) => (url === "/api/auth/me" ? me() : other(url)));
const { readSignOutReason } = require("./sessionReason");

test("NO_TOKEN, then /auth/me says the cookie is fine: still signed in, no redirect", async () => {
  global.fetch = routed(() => reply(200, { userId: 1 }));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(meCalls()).toHaveLength(1);
  expect(getToken()).toBe("session");
  expect(assign).not.toHaveBeenCalled();
  expect(readSignOutReason()).toBeNull();
});

test("NO_TOKEN confirmed by /auth/me: signed out and the reason is saved", async () => {
  global.fetch = routed(() => reply(401, NO_TOKEN));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(getToken()).toBeNull();
  expect(assign).toHaveBeenCalledWith("/login");
  expect(readSignOutReason().code).toBe("NO_TOKEN");
});

test("INVALID_TOKEN confirmed: reason INVALID_TOKEN, and it survives clearAllUserData's sessionStorage wipe", async () => {
  global.fetch = routed(() => reply(401, { error: "x", code: "INVALID_TOKEN" }), () => reply(401, { error: "x", code: "INVALID_TOKEN" }));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(readSignOutReason().code).toBe("INVALID_TOKEN");
});

test.each([
  ["a network error", () => Promise.reject(new TypeError("Failed to fetch"))],
  ["a 500", () => reply(500, { error: "boom" })],
  ["a 503", () => reply(503, { error: "waking up" })],
  ["a 408", () => reply(408, { error: "timeout" })],
  ["a 429", () => reply(429, { error: "slow down" })],
  ["a 403", () => reply(403, { error: "blocked" })],
])("when the confirmation gets %s the student stays signed in", async (_name, me) => {
  global.fetch = routed(me);
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(getToken()).toBe("session");
  expect(localStorage.getItem("focus_username")).toBe("Ahmad");
  expect(assign).not.toHaveBeenCalled();
  expect(readSignOutReason()).toBeNull();
});

test("a failed confirmation does not stick: the next problem is confirmed again", async () => {
  global.fetch = routed(() => reply(503, {}));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  global.fetch = routed(() => reply(401, NO_TOKEN));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(getToken()).toBeNull();
});

test.each(["TOKEN_EXPIRED", "USER_NOT_FOUND"])("%s signs out at once, without asking /auth/me", async (code) => {
  global.fetch = jest.fn(() => reply(401, { error: "x", code }));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(meCalls()).toHaveLength(0);
  expect(getToken()).toBeNull();
  expect(readSignOutReason().code).toBe(code);
  expect(assign).toHaveBeenCalledTimes(1);
});

test("three parallel NO_TOKEN requests share one confirmation and one sign-out", async () => {
  global.fetch = routed(() => reply(401, NO_TOKEN));
  const results = await Promise.allSettled([subjectAPI.getAll(), subjectAPI.getAll(), subjectAPI.getAll()]);
  expect(results.every((r) => r.status === "rejected")).toBe(true);
  expect(meCalls()).toHaveLength(1);
  expect(assign).toHaveBeenCalledTimes(1);
  expect(readSignOutReason().code).toBe("NO_TOKEN");
});

test("asking /auth/me itself and getting NO_TOKEN signs out without a second /auth/me", async () => {
  global.fetch = routed(() => reply(401, NO_TOKEN));
  await expect(authAPI.getMe()).rejects.toThrow();
  expect(meCalls()).toHaveLength(1);
  expect(getToken()).toBeNull();
});

test("a signed-out visitor's /auth/me (session recovery) never signs anything out or saves a reason", async () => {
  localStorage.clear();
  global.fetch = routed(() => reply(401, NO_TOKEN));
  await expect(authAPI.getMe()).rejects.toThrow();
  expect(assign).not.toHaveBeenCalled();
  expect(readSignOutReason()).toBeNull();
});

test("the confirmation is sent with the cookie, the CSRF header and no cache", async () => {
  global.fetch = routed(() => reply(200, {}));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  const init = meCalls()[0][1];
  expect(init.credentials).toBe("include");
  expect(init.cache).toBe("no-store");
  expect(init.headers["X-Requested-With"]).toBe("FocusFlow");
});

test("signing in again clears the saved reason; signing out on purpose saves 'manual'", () => {
  localStorage.setItem("ff_signout_reason", JSON.stringify({ code: "NO_TOKEN", at: "x" }));
  setToken("session");
  expect(readSignOutReason()).toBeNull();
  global.fetch = jest.fn(() => reply(200, {}));
  authAPI.logout();
  expect(readSignOutReason().code).toBe("manual");
  expect(getToken()).toBeNull();
});

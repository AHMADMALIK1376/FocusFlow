// The sign-in is an HttpOnly cookie the browser sends by itself. The page keeps only a
// "signed in" marker. A login that stopped working (account deleted, expired, cookie
// gone) must not leave the app half-working: the marker is cleared and the student is
// sent to /login.
import { subjectAPI, authAPI, getToken, setToken } from "./api";
import { peekSignOutReason, rememberSignOutReason as rememberReason } from "./signOutReason";

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


// ---- never sign anyone out on a guess ----------------------------------------------------

const urlOf = (call) => String(call[0]);

test("NO_TOKEN but the session is alive: the request is tried again and the student stays signed in", async () => {
  global.fetch = jest.fn()
    .mockImplementationOnce(() => reply(401, { error: "Access denied.", code: "NO_TOKEN" }))   // the original request
    .mockImplementationOnce(() => reply(200, { user: { email: "a@b.c" } }))                    // /auth/me: alive
    .mockImplementationOnce(() => reply(200, [{ id: 1 }]));                                    // the retry
  const out = await subjectAPI.getAll();
  expect(out).toEqual([{ id: 1 }]);
  expect(urlOf(global.fetch.mock.calls[1])).toBe("/api/auth/me");
  expect(urlOf(global.fetch.mock.calls[2])).toBe("/api/subjects");
  expect(getToken()).toBe("session");
  expect(assign).not.toHaveBeenCalled();
  expect(peekSignOutReason()).toBeNull();
});

test("NO_TOKEN and the server confirms there is no session: signed out, with the reason remembered", async () => {
  global.fetch = jest.fn(() => reply(401, { error: "Access denied.", code: "NO_TOKEN" }));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(global.fetch).toHaveBeenCalledTimes(2); // the request, then one confirmation
  expect(getToken()).toBeNull();
  expect(assign).toHaveBeenCalledWith("/login");
  expect(peekSignOutReason().code).toBe("NO_TOKEN");
});

test("NO_TOKEN but the server can't be asked (offline, waking up, error): nobody is signed out on a guess", async () => {
  for (const second of [() => Promise.reject(new TypeError("Failed to fetch")), () => reply(503, { error: "waking up" }), () => reply(500, { error: "boom" }), () => reply(429, { error: "slow down" })]) {
    localStorage.setItem("focus_signedin", "1");
    global.fetch = jest.fn()
      .mockImplementationOnce(() => reply(401, { error: "Access denied.", code: "NO_TOKEN" }))
      .mockImplementationOnce(second);
    await expect(subjectAPI.getAll()).rejects.toThrow();
    expect(getToken()).toBe("session");
    expect(assign).not.toHaveBeenCalled();
    expect(peekSignOutReason()).toBeNull();
  }
});

test("definitive answers (expired, invalid, deleted account) sign out at once, with no extra check", async () => {
  for (const code of ["TOKEN_EXPIRED", "INVALID_TOKEN", "USER_NOT_FOUND"]) {
    localStorage.setItem("focus_signedin", "1");
    assign.mockClear();
    global.fetch = jest.fn(() => reply(401, { error: "x", code }));
    await expect(subjectAPI.getAll()).rejects.toThrow();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(getToken()).toBeNull();
    expect(peekSignOutReason().code).toBe(code);
    expect(assign).toHaveBeenCalledWith("/login");
  }
});

test("a server error or a timeout is never a reason to sign out", async () => {
  for (const make of [() => reply(500, { error: "boom" }), () => reply(502, { error: "bad gateway" }), () => reply(503, { error: "waking up" }), () => reply(504, { error: "timeout" })]) {
    global.fetch = jest.fn(make);
    await expect(subjectAPI.getAll()).rejects.toThrow();
    expect(getToken()).toBe("session");
  }
  global.fetch = jest.fn(() => Promise.reject(new TypeError("Failed to fetch")));
  await expect(subjectAPI.getAll()).rejects.toThrow();
  expect(getToken()).toBe("session");
  expect(assign).not.toHaveBeenCalled();
});

test("pressing Log out is the student's own choice: no reason is recorded", () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
  authAPI.logout();
  expect(getToken()).toBeNull();
  expect(peekSignOutReason()).toBeNull();
});

test("signing in again forgets an old reason", () => {
  rememberReason("TOKEN_EXPIRED");
  expect(peekSignOutReason()).not.toBeNull();
  setToken("session");
  expect(peekSignOutReason()).toBeNull();
});

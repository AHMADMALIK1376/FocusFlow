# Reminders, email and sign-out: production reliability

Branch `fix/reminders-email-and-session`. Urgent reliability work for production (Vercel, Render free, Supabase),
not a feature. Nothing outside the lists below is added.

## What is wrong (checked in the code; the live server cannot be reached from this environment)
1. **No class reminder email ever arrives.** Render's free plan sleeps when idle, and the only reminder job is an
   in-process cron, so nothing is sent while it sleeps. Render's free plan also blocks outbound SMTP (ports 25, 465, 587;
   changelog effective 26 Sep 2025), and `emailQueueService.js` uses nodemailer `service: 'gmail'` (port 465), so no email
   of any kind can leave production: reminders, sign-up codes, password-reset codes.
2. **`claim()` before delivery.** `runTick()` records the reminder in NOTIFICATION_LOG first; if every channel fails it
   is never retried.
3. **`CATCH_UP_MINUTES` is 5.** A server that wakes later than that skips the reminder.
4. **The email "sent" answer is a lie.** `addEmail()` returns `queued: true` as soon as the message is queued, so
   `sendVerificationEmail` and the sign-up, resend and forgot-password handlers say "code sent" although nothing has
   been tried yet (and the send later fails silently).
5. **Open admin endpoints.** `GET /api/email/queue/stats`, `DELETE /api/email/queue/clear` and `GET /api/health/detailed`
   have no authentication.
6. **Signed out unexpectedly.** Cause unknown (see Part C).

## A. Email that works on Render's free plan

### Options checked (free, HTTPS only, no domain)
| Option | Verdict |
|---|---|
| **Gmail API with an OAuth2 refresh token** (HTTPS to googleapis.com, port 443) | **Recommended.** Sends from the owner's own Gmail, so it is Gmail sending for itself (passes SPF, DKIM and DMARC for gmail.com). Works for any recipient. Limit about 500 messages a day on a consumer account. Free, no domain, no new package: nodemailer (already installed) builds the MIME message (inline CID icons included) and two plain HTTPS calls do the rest. |
| Resend free | Rejected: without a verified domain it only delivers to the address the account was created with. |
| Brevo / Mailjet free | Rejected: need a sender you control; a gmail.com sender fails DMARC alignment (Gmail's policy rejects or spams it), and the fix needs a domain. |
| Mailgun sandbox, SendGrid | Rejected: sandbox only reaches pre-authorised recipients; SendGrid no longer has a free plan (not verified here: treat as unavailable). |
| Gmail over SMTP / XOAUTH2 | Rejected: still SMTP, blocked on Render free. |

Trap: a refresh token from an OAuth consent screen left in **Testing** expires after 7 days. The checklist says to
**publish the consent screen to "In production"** (an unverified-app warning shows once; the owner clicks
Advanced, then Go to the app) and then create the refresh token AFTER publishing.

### Design
- `services/emailProviders/` : `index.js` picks the provider from `EMAIL_PROVIDER` (`gmail_api` | `smtp`; default
  `smtp` so local development is unchanged; production sets `gmail_api`). Interface: `send(mailOptions) -> { ok, id?, error? }`,
  `describe()` (name, configured?, missing env names) and nothing else. `smtp` is the current nodemailer transport.
  `gmail_api` builds the raw message with nodemailer's stream transport (buffer), base64url-encodes it, gets an
  access token from `https://oauth2.googleapis.com/token` (cached until 60 s before expiry) and posts to
  `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`. Timeouts on every call. Errors are turned into
  short plain-English reasons (invalid_grant means the token was revoked or expired; 401, 403, 429, 5xx, network).
  No secret, token or message body is ever logged.
- `EmailQueue` keeps its rate limits and priority but calls the provider, records the outcome, and gives each item an
  optional `maxRetries` and a promise for its final outcome (`sent`, or `failed` with the reason).
  Codes (sign-up, resend, reset): one quick retry, the request waits up to about 20 s. Reminders: no queue retries
  (the tick is the retry, see B1).
- Every attempt updates counters and `lastOk` / `lastError` (reason, time); these are also stored in the heartbeat table
  (B4) so they survive restarts.
- Sign-up, resend-code and forgot-password answer honestly: when the email could not be sent they return
  `EMAIL_SEND_FAILED` with a plain message (sign-up still rolls the new account back); when the provider is not
  configured the message says the server cannot send email yet. The frontend shows the server's message.
- `POST /api/notify/test` accepts `kind: 'email'`; Settings, Reminders gets a "Send test email" button that shows
  success, or the plain reason.
- `server.js`: `EMAIL_USER` / `EMAIL_PASS` are no longer unconditionally required; each provider names its own
  variables, a missing one is a loud warning at boot and a "failing: not configured" status, not a crash.
- Themed emails and CID icons are untouched: attachments pass through to the raw message unchanged (tested).

## B. Reminders that survive a sleeping server
1. **Release the claim.** `deliver()` returns per-channel results with a plain `delivered` verdict (push sent >= 1,
   email sent, WhatsApp ok). If nothing delivered, the claim row is deleted so a later tick retries while the reminder
   is still valid. The claim stays an atomic `INSERT ... ON CONFLICT DO NOTHING`, so two ticks can never both send.
   Channels that did deliver are not repeated on a retry: the result is stored on the claim row (additive column) and
   the retry only tries channels that have not delivered.
2. **Catch-up windows (pure, in `utils/reminders.js`).** Every kind has a window `[due, until)` instead of five minutes.
   Before-events (class, exam, routine): until the thing starts. Submit prompt: until the due time. Attendance and
   quiz follow-ups: 6 hours. Morning digest: 4 hours. Wording is computed from the minutes actually left ("starts in 12
   min"), never the original lead. With lead 60 and a class at 10:00, a server awake at 09:00, 09:10, 09:40 sends
   "in 60", "in 50", "in 20 minutes", and at 10:10 sends nothing. One tick runs at boot, immediately.
3. **External trigger.** `GET|POST /api/cron/tick`, secured by `CRON_SECRET` (header `Authorization: Bearer ...` or
   `X-Cron-Secret`, or `?key=` for pingers that cannot send headers). Constant-time comparison; 401 when wrong; 503
   `not configured` when `CRON_SECRET` is unset (fails closed); rate limited; the secret is never logged (the request
   logger prints the path only, the query string is never printed). Runs one tick and returns counts only. A shared
   in-process lock means the endpoint, the cron job and the boot tick never overlap (a busy answer says so).
4. **Heartbeat.** Additive table `SYSTEM_HEARTBEAT (name PRIMARY KEY, last_at, ok, detail, counts)` in
   `config/postgres-init.sql` plus `scripts/migrate-heartbeat.js`; rows `tick` and `email`. Every code path that reads
   or writes it fails gracefully (try/catch, "unknown") when the table is missing. `GET /api/notify/status`
   (signed-in) returns minutes since the last tick, whether it is older than 15 minutes, this student's push device count,
   and the email state (working or failing with a plain reason). Settings, Reminders shows these three lines and a
   warning when the last check is older than 15 minutes.
5. **Docs.** README and the Owner checklist explain the pinger precisely (cron-job.org, GET, URL, every 5 minutes,
   header; UptimeRobot alternative with `?key=`).

## C. Why was the owner signed out?
Ranked suspects (the cause cannot be proven from here; the instrumentation must identify it next time):
1. `JWT_SECRET` changed or differs after a redeploy: every cookie becomes `INVALID_TOKEN` (invalid signature).
2. The cookie is not sent: an installed app and Chrome on the phone, or a different Vercel address (a preview or alias
   host has its own cookie jar), or site data cleared: `NO_TOKEN` while the page still says "signed in".
3. The reverse: the "signed in" marker in localStorage is gone but the cookie is fine, so the app shows the login page.
4. A real expiry: the cookie is renewed only on use after 1 day; 20 days unused expires it (`TOKEN_EXPIRED`).
5. Account row missing (`USER_NOT_FOUND`) or a database blip: the code already lets a blip through; tests prove it.
6. Vercel or Render dropping or overwriting `Set-Cookie` (cold start, error response): attributes are checked by test
   (HttpOnly, Secure in production, SameSite=Lax, Max-Age 20 days, no Domain); an error response never clears it.

Changes: (a) a server log line for every 401: code, reason, method, path, token age (no token text), whether a cookie
header and an `ff_session` cookie were present; (b) the client confirms with one `GET /api/auth/me` before signing
out on `NO_TOKEN` or `INVALID_TOKEN`, shared by parallel requests (one confirmation, one sign-out); definitive codes
(`USER_NOT_FOUND`, `TOKEN_EXPIRED`) still sign out; network errors, 5xx, 408, 429 and 403 never do; (c) the reason is
saved on the device and the login page shows one calm line ("You were signed out because your session expired");
(d) when the marker is missing but the cookie is valid, one `/auth/me` on the login page restores the session.
Rejected: ignoring `NO_TOKEN` (a real sign-out would loop), a longer cookie (20 days is enough), `SameSite=None`
(weaker, not needed because the API shares the app's address).

## D. Close the open admin endpoints
`/api/email/queue/stats` and `/api/health/detailed` need `CRON_SECRET` (same check, fails closed); `DELETE
/api/email/queue/clear` is removed (nothing uses it). `/api/health` stays public and cheap.

## E. Tests, docs
Provider selection and failure fallback, MIME with CID attachments, claim release and no duplicates, catch-up with a
fake clock (0, 10, 40, 70 minutes), tick endpoint auth and overlap, heartbeat with the table missing, honest
sign-up/resend/forgot answers, 401 logging and sign-out reasons on both sides, closed endpoints. Run all suites and the
`CI=true` build more than once. Update `decision.md`, `flow.md`, `README.md` (env vars `EMAIL_PROVIDER`, `GMAIL_*`,
`CRON_SECRET`) and `backend/.env.example`.

## Owner must do (the PR carries the click-by-click checklist)
Get the Gmail credentials and publish the consent screen; add the env variables on Render; run the heartbeat migration
BEFORE merging; set up the pinger; test email from Settings; test a reminder end to end; check the cookie on the phone.

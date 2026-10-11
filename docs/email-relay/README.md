# Getting email and reminders working on Render's free plan

Two things were wrong in production, and both are fixed in the code. Each needs a few minutes of setup from you,
because they involve your own accounts. Do **Part 1** first.

| | What was wrong | What you do |
|---|---|---|
| **Part 1: Email** | Render's free plan blocks the ports Gmail uses (25, 465, 587), so no email could leave: sign-up codes, password-reset codes, reminder emails. | Pick **Option A** (easiest) or **Option B**, then add 2 to 4 settings on Render. |
| **Part 2: Reminders** | A free Render server goes to sleep after about 15 minutes of silence. While it sleeps, nothing checks for reminders. | Add a free monitor that visits a private address every 5 minutes. |

Nothing here costs money.

---

## Part 1: Email

### Option A: Google Apps Script (recommended, about 5 minutes)

A tiny script that lives in your Google account and sends mail as you. FocusFlow calls it over HTTPS (port 443, which is allowed).
No Google Cloud project, nothing expires.

1. Open **https://script.google.com** (signed in to the Gmail you want emails to come from). Click **New project**.
2. Delete the sample code. Open the file `docs/email-relay/Code.gs` from this repository, copy **everything**, and paste it in. Click the **save** icon.
3. Click the **gear icon** (Project Settings) on the left. Scroll to **Script Properties** → **Add script property**.
   - Property: `SECRET`
   - Value: make up a long random password, for example 30 random letters and numbers. **Write it down**; you need it again below.
   - Click **Save script properties**.
4. Click **Deploy** (top right) → **New deployment**. Click the gear next to "Select type" → **Web app**.
   - Description: `FocusFlow email`
   - **Execute as: Me**
   - **Who has access: Anyone**
   - Click **Deploy**.
5. Google asks you to **Authorize access**. Click it, choose your account. You will see "Google hasn't verified this app". That is expected, because you wrote the script. Click **Advanced** → **Go to (project name) (unsafe)** → **Allow**.
6. Copy the **Web app URL** (it ends in `/exec`).
7. On **Render** → your `focusflow-api` service → **Environment**, add these three (names exactly as written):

   | Name | Value |
   |---|---|
   | `EMAIL_PROVIDER` | `apps-script` |
   | `APPS_SCRIPT_URL` | the Web app URL from step 6 |
   | `APPS_SCRIPT_SECRET` | the same secret you chose in step 3 |

   Save. Render redeploys by itself.
8. Test: open FocusFlow → **Settings → Reminders → Is it working? → Send test email**. You should get an email within a minute (check spam the first time).

Good to know: a free Gmail account can send about **100 emails a day** this way. That is plenty for you and a few friends, because reminders also go to phones as pop-ups, which have no limit.
If you change the script later, use **Deploy → Manage deployments → edit → New version**; otherwise the old version keeps running.

### Option B: Gmail API (more official, about 15 minutes)

Sends through Google's Gmail API using a permission you grant once. Use this only if you prefer it over Option A.
Warning: if the consent screen stays in "Testing" mode, **Google cancels the permission after 7 days**. Step 4 avoids that.

1. Go to **https://console.cloud.google.com**. Create a **new project** (name: FocusFlow).
2. **APIs & Services → Library** → search **Gmail API** → **Enable**.
3. **APIs & Services → OAuth consent screen**: user type **External**, app name FocusFlow, your email for support and developer contact. Under **Scopes** add `.../auth/gmail.send`. Save.
4. **Publishing status → Publish app** (so it says "In production"). It stays "unverified", which is fine for your own use and stops the 7-day expiry.
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**: type **Web application**. Under **Authorised redirect URIs** add `https://developers.google.com/oauthplayground`. Create, then copy the **Client ID** and **Client secret**.
6. Open **https://developers.google.com/oauthplayground**. Click the **gear icon** → tick **Use your own OAuth credentials** → paste the Client ID and secret.
7. In the list on the left, find **Gmail API v1** → tick `https://www.googleapis.com/auth/gmail.send` → **Authorize APIs**. Sign in, click **Advanced → Go to FocusFlow (unsafe) → Allow**.
8. Click **Exchange authorization code for tokens**. Copy the **Refresh token**.
9. On **Render → Environment** add:

   | Name | Value |
   |---|---|
   | `EMAIL_PROVIDER` | `gmail-api` |
   | `EMAIL_USER` | your Gmail address |
   | `GMAIL_CLIENT_ID` | the Client ID |
   | `GMAIL_CLIENT_SECRET` | the Client secret |
   | `GMAIL_REFRESH_TOKEN` | the Refresh token |

10. Test with **Settings → Reminders → Send test email**.

If the test says *"Google refused the saved Gmail permission"*, the refresh token expired or was revoked. Repeat steps 6 to 8 and replace `GMAIL_REFRESH_TOKEN`.

---

## Part 2: Keep the server awake, and send reminders on time

FocusFlow now has a private address that does one reminder pass and wakes the server if it is asleep:

```
https://focusflow-api-3wud.onrender.com/api/cron/tick?key=YOUR_CRON_SECRET
```

1. On **Render → Environment** add `CRON_SECRET` with a long random value (for example 30 random letters and numbers). Save.
   (Without it the address does not exist at all, which is the safe default.)
2. Go to **https://uptimerobot.com** → sign up (free) → **Add New Monitor**:
   - Monitor type: **HTTP(s)**
   - Friendly name: `FocusFlow reminders`
   - URL: the address above, with your real secret in place of `YOUR_CRON_SECRET`
   - Monitoring interval: **5 minutes**
   - Save.
3. (Optional second pinger, so one outage does not leave you uncovered) **https://cron-job.org** → free account → create a cron job with the same URL, every 5 minutes.

What this gives you:
- The server never sleeps for long, so reminders are not missed.
- If it was asleep, the first visit wakes it and the reminder is sent then. A class reminder that is late still says the real time left ("starts in 20 minutes") and is never sent after the class has started.
- Opening that address in a browser is safe: it runs one pass, and a reminder can never be sent twice.
- It also **lets you see whether it works**: Settings → Reminders → **Is it working?** shows "Last checked N minutes ago".

The first call can take up to a minute while Render wakes up; UptimeRobot may mark that one as "down" once. That is normal.

---

## Checking that everything works

1. **Settings → Reminders → Is it working?** should show *Reminder server: Awake*, *Phone pop-ups: On* (after you press "Turn on" on your phone) and *Email: Working*.
2. **Reminder, end to end:** add a class that starts about 70 minutes from now (Subjects → edit, or the timetable). Within a few minutes you should get a pop-up on your phone and an email saying it starts in about an hour.
3. **A friend signs up:** the verification code should arrive by email. If it cannot be sent, the sign-up page now says so instead of waiting.

## If something is wrong

| What you see | What it means |
|---|---|
| Email: **Not set up** | A setting from Part 1 is missing on Render. The panel names it. |
| Email: **Not working**, "bad secret" | `APPS_SCRIPT_SECRET` on Render differs from `SECRET` in the script. |
| Email: **Not working**, "web page, not a result" | The Apps Script is not deployed as "Execute as Me / Anyone", or needs authorising again. |
| Email: **Not working**, "refresh token expired" | Option B token expired. Redo steps 6 to 8 and publish the consent screen. |
| Reminder server: **Asleep?** | The monitor in Part 2 is not set up, or its secret is wrong. |
| Signed out unexpectedly | The login page now says why. In the Render logs, search for `401`: each line gives the reason and how old the login was. |

import React, { useEffect, useState } from "react";
import { BellRing, Mail, MessageCircle, Send } from "lucide-react";
import { Button, Input, Select, Field, Switch, Badge } from "../../components/ui";
import { useToast } from "../../components/ui/Toast";
import { notifyAPI } from "../../services/api";
import { pushStatus, enablePush, disablePush } from "./push";

const LEADS = [
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 90, label: "1½ hours before" },
  { value: 120, label: "2 hours before" },
];

const AFTER_CLASS = [
  { value: 0, label: "Right when it ends" },
  { value: 5, label: "5 min after" },
  { value: 10, label: "10 min after" },
  { value: 15, label: "15 min after" },
  { value: 30, label: "30 min after" },
  { value: 60, label: "1 hour after" },
];
const BEFORE_DEADLINE = [
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 180, label: "3 hours before" },
  { value: 360, label: "6 hours before" },
  { value: 720, label: "12 hours before" },
  { value: 1440, label: "1 day before" },
];
const AFTER_QUIZ = [
  { value: 0, label: "Right when it ends" },
  { value: 10, label: "10 min after" },
  { value: 20, label: "20 min after" },
  { value: 30, label: "30 min after" },
  { value: 60, label: "1 hour after" },
];

// Keep a saved custom value selectable even if it isn't one of the presets.
function withValue(options, value, fmt) {
  return options.some((o) => o.value === Number(value)) ? options : [...options, { value: Number(value), label: fmt(Number(value)) }].sort((a, b) => a.value - b.value);
}

const PUSH_TEXT = {
  unsupported: "This browser can't show notifications. On Android, open FocusFlow in Chrome.",
  denied: "Notifications are blocked for this site. Allow them in Chrome → Site settings → Notifications, then come back.",
  off: "Off on this device.",
  on: "On for this device. Reminders pop up even when the app is closed.",
};

function Row({ title, hint, checked, onChange, children }) {
  return (
    <div className={`flex justify-between gap-x-4 gap-y-2 py-2.5 ${children ? "flex-col sm:flex-row sm:items-center" : "items-center"}`}>
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">{title}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        <Switch checked={checked} onChange={onChange} label={title} />
      </div>
    </div>
  );
}

function TimeSelect({ value, onChange, options, disabled, fmt, label }) {
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))} disabled={disabled} className="!py-2 !px-3 text-sm !w-auto shrink-0">
      {withValue(options, value, fmt).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  );
}

export default function RemindersSettings() {
  const { toast } = useToast();
  const [s, setS] = useState(null);
  const [push, setPush] = useState("off");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    notifyAPI.getSettings().then(setS).catch((e) => setError(e.message));
    pushStatus().then(setPush).catch(() => setPush("unsupported"));
  }, []);

  if (error && !s) return <p className="text-sm text-focus">{error}</p>;
  if (!s) return <p className="text-sm text-muted">Loading reminders…</p>;

  const set = (k, v) => setS((p) => ({ ...p, [k]: v }));
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function run(name, fn) {
    setBusy(name);
    try { await fn(); } catch (e) { toast(e.message || "Something went wrong", { tone: "focus" }); } finally { setBusy(""); }
  }

  const save = () => run("save", async () => {
    await notifyAPI.saveSettings({
      timezone,
      digestEnabled: s.digestEnabled, digestTime: s.digestTime,
      classReminders: s.classReminders, deadlineReminders: s.deadlineReminders,
      routineReminders: s.routineReminders, attendancePrompts: s.attendancePrompts,
      leadMinutes: Number(s.leadMinutes),
      attendanceDelay: Number(s.attendanceDelay),
      submitPrompts: s.submitPrompts, submitLead: Number(s.submitLead),
      quizFollowups: s.quizFollowups, quizFollowupDelay: Number(s.quizFollowupDelay),
      emailEnabled: s.emailEnabled,
      whatsappEnabled: s.whatsappEnabled, whatsappPhone: s.whatsappPhone, whatsappApikey: s.whatsappApikey,
    });
    toast("Reminder settings saved", { tone: "success" });
  });

  const togglePush = () => run("push", async () => {
    if (push === "on") { await disablePush(); setPush("off"); toast("Notifications turned off on this device"); }
    else { await enablePush(s.vapidPublicKey); setPush("on"); toast("Notifications on for this device", { tone: "success" }); }
  });

  const test = (kind) => run(kind, async () => {
    const { result } = await notifyAPI.sendTest(kind);
    const parts = [];
    if (result.push) parts.push(result.push.devices ? `pop-up to ${result.push.sent}/${result.push.devices} device(s)` : "no device has pop-ups on");
    if (result.email) parts.push(result.email.queued ? "email sent" : "email failed");
    if (result.whatsapp) parts.push(result.whatsapp.ok ? "WhatsApp sent" : "WhatsApp failed");
    toast(`Test: ${parts.join(" · ")}`, { tone: "success" });
  });

  return (
    <div className="space-y-6">
      {/* Where reminders go */}
      <div>
        <h3 className="text-sm font-black text-ink uppercase tracking-wider mb-2">Where to remind me</h3>
        <div className="rounded-token-md bg-surface-2/60 p-3.5 space-y-2">
          <div className="flex items-start gap-3">
            <BellRing size={18} className="mt-0.5 text-brand shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-ink">Pop-up on this phone / computer</p>
                {push === "on" && <Badge tone="success">On</Badge>}
              </div>
              <p className="text-xs text-muted">{PUSH_TEXT[push]}</p>
            </div>
            {push !== "unsupported" && push !== "denied" && (
              <Button size="sm" variant={push === "on" ? "ghost" : "primary"} onClick={togglePush} disabled={busy === "push"}>
                {busy === "push" ? "…" : push === "on" ? "Turn off" : "Turn on"}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 py-2.5 mt-1">
          <Mail size={18} className="text-brand shrink-0" />
          <div className="flex-1"><p className="text-sm font-bold text-ink">Email</p><p className="text-xs text-muted">To the email you signed up with.</p></div>
          <Switch checked={s.emailEnabled} onChange={(v) => set("emailEnabled", v)} label="Email reminders" />
        </div>

        <div className="flex items-center gap-3 py-2.5">
          <MessageCircle size={18} className="text-brand shrink-0" />
          <div className="flex-1"><p className="text-sm font-bold text-ink">WhatsApp</p><p className="text-xs text-muted">Free, through CallMeBot (personal use).</p></div>
          <Switch checked={s.whatsappEnabled} onChange={(v) => set("whatsappEnabled", v)} label="WhatsApp reminders" />
        </div>
        {s.whatsappEnabled && (
          <div className="rounded-token-md bg-surface-2/60 p-3.5 space-y-3">
            <ol className="text-xs text-muted list-decimal pl-4 space-y-1">
              <li>Open <a className="text-brand font-bold underline" href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer">callmebot.com WhatsApp setup</a> and save their WhatsApp number in your contacts.</li>
              <li>Send it the message <b>I allow callmebot to send me messages</b>.</li>
              <li>You get an API key back. Paste it below with your number (with country code, e.g. +923001234567).</li>
            </ol>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="WhatsApp number"><Input value={s.whatsappPhone || ""} onChange={(e) => set("whatsappPhone", e.target.value)} placeholder="+923001234567" /></Field>
              <Field label="CallMeBot API key"><Input value={s.whatsappApikey || ""} onChange={(e) => set("whatsappApikey", e.target.value)} placeholder={s.hasWhatsappKey ? "Saved (type to replace)" : "123456"} /></Field>
            </div>
          </div>
        )}
      </div>

      {/* What to remind about */}
      <div>
        <h3 className="text-sm font-black text-ink uppercase tracking-wider mb-1">What to remind me about</h3>
        <Row title="Today's timetable every morning" hint="Classes, exams, deadlines and routine for the day." checked={s.digestEnabled} onChange={(v) => set("digestEnabled", v)}>
          <Input type="time" aria-label="Morning timetable time" value={s.digestTime} onChange={(e) => set("digestTime", e.target.value)} disabled={!s.digestEnabled} className="!py-2 !px-2 text-sm !w-[7.5rem]" />
        </Row>
        <Row title="Before each class" hint="With the room number." checked={s.classReminders} onChange={(v) => set("classReminders", v)} />
        <Row title="Exams, quizzes and deadlines" hint="Before timed ones; all of them in the morning list." checked={s.deadlineReminders} onChange={(v) => set("deadlineReminders", v)} />
        <Row title="Daily routine activities" checked={s.routineReminders} onChange={(v) => set("routineReminders", v)} />
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">How early</p>
            <p className="text-xs text-muted">For classes, exams and routine. A subject can have its own time (Subjects → edit).</p>
          </div>
          <TimeSelect label="How early" value={s.leadMinutes} onChange={(v) => set("leadMinutes", v)} options={LEADS} fmt={(m) => `${m} minutes before`} />
        </div>

        <h3 className="text-sm font-black text-ink uppercase tracking-wider mt-4 mb-1">Questions</h3>
        <Row title="“Did you attend?” after each class" hint="Yes/No marks your attendance and sends your attendance report." checked={s.attendancePrompts} onChange={(v) => set("attendancePrompts", v)}>
          <TimeSelect label="When to ask about attendance" value={s.attendanceDelay} onChange={(v) => set("attendanceDelay", v)} options={AFTER_CLASS} disabled={!s.attendancePrompts} fmt={(m) => `${m} min after`} />
        </Row>
        <Row title="“Did you submit?” before deadlines" hint="Assignments, projects, submissions. “Submitted” marks it done." checked={s.submitPrompts} onChange={(v) => set("submitPrompts", v)}>
          <TimeSelect label="When to ask about submitting" value={s.submitLead} onChange={(v) => set("submitLead", v)} options={BEFORE_DEADLINE} disabled={!s.submitPrompts} fmt={(m) => `${m} min before`} />
        </Row>
        <Row title="Ask for marks after a quiz / test / exam" hint="Your marks go straight into Grades." checked={s.quizFollowups} onChange={(v) => set("quizFollowups", v)}>
          <TimeSelect label="When to ask for marks" value={s.quizFollowupDelay} onChange={(v) => set("quizFollowupDelay", v)} options={AFTER_QUIZ} disabled={!s.quizFollowups} fmt={(m) => `${m} min after`} />
        </Row>
        <p className="text-xs text-muted">Times use your timezone: {timezone}.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button variant="primary" onClick={save} disabled={busy === "save"}>{busy === "save" ? "Saving…" : "Save reminders"}</Button>
        <Button variant="soft" onClick={() => test("basic")} disabled={!!busy} className="gap-1.5"><Send size={15} /> {busy === "basic" ? "Sending…" : "Send a test"}</Button>
        <Button variant="soft" onClick={() => test("attendance")} disabled={!!busy}>{busy === "attendance" ? "Sending…" : "Test attendance question"}</Button>
        <Button variant="soft" onClick={() => test("submit")} disabled={!!busy}>{busy === "submit" ? "Sending…" : "Test “Did you submit?”"}</Button>
        <Button variant="soft" onClick={() => test("quiz")} disabled={!!busy}>{busy === "quiz" ? "Sending…" : "Test quiz marks"}</Button>
      </div>
      <p className="text-xs text-muted -mt-3">Save first. Tests go to every channel that's on.</p>
    </div>
  );
}

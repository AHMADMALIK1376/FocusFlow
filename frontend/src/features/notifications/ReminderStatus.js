// "Is it working?": whether the reminder server is awake, whether a phone will get pop-ups, and
// whether email works, in plain words. It exists because free servers sleep and email can fail
// quietly, and a student should be able to see that instead of just not getting reminders.
import React from "react";
import { Activity, Mail, Smartphone, TriangleAlert } from "lucide-react";
import { Badge, Button } from "../../components/ui";

// 45 -> "less than a minute ago", 600 -> "10 minutes ago", 7200 -> "2 hours ago"
export function ago(seconds) {
  if (seconds == null) return "";
  if (seconds < 60) return "less than a minute ago";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

const REMINDERS = {
  awake: { tone: "success", label: "Awake" },
  asleep: { tone: "warn", label: "Asleep?" },
  unknown: { tone: "muted", label: "Not reported yet" },
};
const EMAIL = {
  working: { tone: "success", label: "Working" },
  failing: { tone: "focus", label: "Not working" },
  "not-set-up": { tone: "warn", label: "Not set up" },
  unknown: { tone: "muted", label: "Not tried yet" },
};

function Line({ icon: Icon, title, badge, children, action }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon size={18} className="mt-0.5 text-brand shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-ink">{title}</p>
          {badge}
        </div>
        <div className="text-xs text-muted mt-0.5">{children}</div>
      </div>
      {action}
    </div>
  );
}

export default function ReminderStatus({ status, error, onTestEmail, testing }) {
  if (error && !status) {
    return <p className="text-xs text-muted">Couldn&apos;t check the reminder status right now ({error}).</p>;
  }
  if (!status) return null;

  const r = REMINDERS[status.reminders.state] || REMINDERS.unknown;
  const e = EMAIL[status.email.state] || EMAIL.unknown;
  const devices = status.phone.devices;

  return (
    <div className="rounded-token-md bg-surface-2/60 p-3.5">
      <Line icon={Activity} title="Reminder server" badge={<Badge tone={r.tone}>{r.label}</Badge>}>
        {status.reminders.lastCheckedSecondsAgo != null
          ? `Last checked ${ago(status.reminders.lastCheckedSecondsAgo)}.`
          : "It has not checked yet."}
        {status.reminders.warning && (
          <span className="mt-1 flex items-start gap-1.5 text-warn-ink">
            <TriangleAlert size={13} className="mt-0.5 shrink-0" />
            <span>{status.reminders.warning}</span>
          </span>
        )}
        {status.keepAlive && !status.keepAlive.triggerConfigured && (
          <span className="mt-1 block">The free keep-alive is not switched on yet, so reminders only run while the server happens to be awake.</span>
        )}
      </Line>

      <Line icon={Smartphone} title="Phone pop-ups" badge={<Badge tone={devices > 0 ? "success" : "muted"}>{devices > 0 ? "On" : "Off"}</Badge>}>
        {devices > 0
          ? `${devices} device${devices === 1 ? "" : "s"} will get pop-ups.`
          : "No phone has pop-ups turned on yet. Use the button above on your phone."}
      </Line>

      <Line
        icon={Mail}
        title="Email"
        badge={<Badge tone={e.tone}>{e.label}</Badge>}
        action={<Button size="sm" variant="soft" onClick={onTestEmail} disabled={testing}>{testing ? "Sending…" : "Send test email"}</Button>}
      >
        {status.email.note || (status.email.state === "working" ? "Emails are going out." : "")}
      </Line>
    </div>
  );
}

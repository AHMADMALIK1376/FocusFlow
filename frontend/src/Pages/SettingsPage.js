import React, { useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BellRing, ChevronRight, Languages, LayoutGrid, Palette, ShieldCheck, Smile, UserRound } from "lucide-react";
import { usePreferences } from "../preferences/usePreferences";
import { useToast } from "../components/ui/Toast";
import {
  Field,
  Input,
  Button,
  Modal,
  LanguageSelect,
  MascotPicker,
  mascotSheets,
  mascotName,
} from "../components/ui";
import FontSelector from "../components/dashboard/FontSelector";
import WidgetManager from "../components/dashboard/WidgetManager";
import DashboardSwitcher from "../components/dashboard/DashboardSwitcher";
import RemindersSettings from "../features/notifications/RemindersSettings";
import CookieChoice from "../components/consent/CookieChoice";
import Mascot from "../components/common/Mascot";
import { DEFAULT_MASCOT } from "../components/common/PageMascot";

// A titled block inside a pop-up (the dashboard pop-up has two).
function Group({ title, subtitle, children }) {
  return (
    <div className="mb-6 last:mb-0">
      {title && <h3 className="text-sm font-black text-ink uppercase tracking-wider">{title}</h3>}
      {subtitle ? <p className="text-sm text-muted mt-1 mb-4">{subtitle}</p> : <div className="mb-4" />}
      {children}
    </div>
  );
}

function ProfileForm() {
  const { t } = useTranslation();
  const { profile, updateProfile } = usePreferences();
  const { toast } = useToast();

  const [form, setForm] = useState({
    displayName: profile.displayName || "",
    username: profile.username || "",
    email: profile.email || "",
    phone: profile.phone || "",
    university: profile.university || "",
    pronouns: profile.pronouns || "",
    role: profile.role || "",
  });

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  function handleSaveProfile(e) {
    e.preventDefault();
    updateProfile(form);
    toast("Profile saved", { tone: "success" });
  }

  return (
    <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Display name" htmlFor="s-displayName">
          <Input id="s-displayName" name="displayName" value={form.displayName} onChange={handleChange} placeholder="How should we greet you?" />
        </Field>
        <Field label="Username" htmlFor="s-username">
          <Input id="s-username" name="username" value={form.username} onChange={handleChange} placeholder="@username" />
        </Field>
        <Field label="Role / profession" htmlFor="s-role">
          <Input id="s-role" name="role" value={form.role} onChange={handleChange} placeholder="Student, Designer…" />
        </Field>
        <Field label="Pronouns" htmlFor="s-pronouns">
          <Input id="s-pronouns" name="pronouns" value={form.pronouns} onChange={handleChange} placeholder="she/her, he/him, they/them…" />
        </Field>
        <Field label="Email" htmlFor="s-email">
          <Input id="s-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
        </Field>
        <Field label="Phone (for WhatsApp reminders)" htmlFor="s-phone">
          <Input id="s-phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+1 555 000 0000" />
        </Field>
      </div>
      <Field label="University / College" htmlFor="s-university">
        <Input id="s-university" name="university" value={form.university} onChange={handleChange} placeholder="Iqra University" />
      </Field>
      <Button type="submit" variant="primary" size="md" className="self-start mt-1">
        {t("common.save", "Save changes")}
      </Button>
    </form>
  );
}

// The student's mascot, with the existing picker.
function MascotCard() {
  const { profile, updateProfile } = usePreferences();
  const [pickerOpen, setPickerOpen] = useState(false);
  const id = mascotSheets(profile?.mascot) ? profile.mascot : DEFAULT_MASCOT;
  const sheets = mascotSheets(id);

  return (
    <section className="rounded-token-lg bg-surface shadow-neu p-4 sm:p-5 mb-6 flex items-center gap-4 sm:gap-6">
      <div className="shrink-0 rounded-2xl overflow-hidden bg-surface">
        <div className="bg-[rgb(var(--sage)/0.3)]">
          <Mascot directions={sheets.directions} reactions={sheets.reactions} size={104} label={mascotName(id)} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-wider text-muted">Your mascot</p>
        <p className="text-xl font-black text-ink truncate">{mascotName(id)}</p>
        <p className="text-sm text-muted">It watches your cursor. Poke it.</p>
        <Button variant="primary" size="sm" onClick={() => setPickerOpen(true)} className="mt-3 gap-1.5">
          <Smile size={15} /> Choose mascot
        </Button>
      </div>
      <MascotPicker open={pickerOpen} onClose={() => setPickerOpen(false)} value={profile?.mascot}
        onPick={(m) => updateProfile({ mascot: m, avatarUrl: null })} />
    </section>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const pushedOpen = useRef(false);

  const cards = [
    {
      id: "profile", icon: UserRound, title: t("settings.profile", "Profile"),
      subtitle: "Your name and details, for the greeting and profile card.",
      wide: true,
      body: <ProfileForm />,
    },
    {
      id: "reminders", icon: BellRing, title: "Reminders",
      subtitle: "Class alarms, your morning timetable, exams, deadlines and attendance.",
      wide: true,
      body: <RemindersSettings />,
    },
    {
      id: "appearance", icon: Palette, title: t("settings.appearance", "Appearance"),
      subtitle: "Pick a font. Changes apply instantly across the whole app.",
      body: (
        <>
          <Group title="Font"><FontSelector /></Group>
          {/* The colour studio goes here, as its own Group, when it is built. */}
        </>
      ),
    },
    {
      id: "dashboard", icon: LayoutGrid, title: "Dashboard and workspaces",
      subtitle: "Your workspaces, and which features show on your dashboard.",
      wide: true,
      body: (
        <>
          {/* Workspaces first: the features list is long, and the workspace menu opens downwards. */}
          <Group title={t("dashboards.title", "Workspaces")} subtitle="Switch workspaces from the top bar, or manage them here.">
            <DashboardSwitcher />
          </Group>
          <Group title={t("settings.widgets", "Dashboard features")} subtitle="Turn features on to show them on your dashboard. Drag to reorder.">
            <WidgetManager />
          </Group>
        </>
      ),
    },
    {
      id: "language", icon: Languages, title: t("settings.language", "Language"),
      subtitle: "The language FocusFlow uses.",
      body: <div className="min-h-[18rem]"><LanguageSelect /></div>,
    },
    {
      id: "privacy", icon: ShieldCheck, title: "Privacy and cookies",
      subtitle: "What FocusFlow stores, and your cookie choice.",
      body: (
        <div className="text-sm text-muted leading-relaxed space-y-2">
          <p>FocusFlow keeps you signed in with a secure cookie and remembers your settings in this browser. There are no ads or tracking.</p>
          <p>
            <Link to="/privacy" className="inline-flex items-center gap-1.5 font-bold text-brand hover:underline">
              Read the privacy details <ArrowRight size={14} />
            </Link>
          </p>
          <h3 className="text-sm font-black text-ink uppercase tracking-wider pt-3">Your cookie choice</h3>
          <CookieChoice />
        </div>
      ),
    },
  ];

  // The open card lives in the address (?open=reminders), so a link can open it
  // and the phone's back button closes it. A card click adds a history entry, so
  // closing goes back over it; a pop-up opened by a link just clears the address.
  const active = cards.find((c) => c.id === params.get("open")) || null;
  if (!active) pushedOpen.current = false; // closed some other way (e.g. the back button)
  // Keep the last card's content while the pop-up animates closed.
  const lastShown = useRef(null);
  if (active) lastShown.current = active;
  const shown = active || lastShown.current;
  const openCard = (id) => {
    pushedOpen.current = true;
    setParams({ open: id });
  };
  const close = () => {
    if (pushedOpen.current) {
      pushedOpen.current = false;
      navigate(-1);
    } else {
      setParams({}, { replace: true });
    }
  };

  return (
    <div className="p-4 sm:p-5 md:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-ink mb-1">{t("settings.title", "Settings")}</h1>
        <p className="text-muted">Personalise FocusFlow — your font, features, reminders and profile.</p>
      </div>

      <MascotCard />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ id, icon: Icon, title, subtitle }) => (
          <button
            key={id}
            type="button"
            onClick={() => openCard(id)}
            className="group text-left rounded-token-lg bg-surface shadow-neu p-5 flex items-start gap-4 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--brand))]"
          >
            <span className="shrink-0 w-11 h-11 rounded-2xl bg-grad-sage text-on-sage shadow-neu-sm grid place-items-center">
              <Icon size={20} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black text-ink">{title}</span>
              <span className="block text-sm text-muted mt-0.5">{subtitle}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 mt-1 text-muted group-hover:text-brand transition-colors" />
          </button>
        ))}
      </div>

      <Modal
        open={Boolean(active)}
        onClose={close}
        title={shown?.title}
        showClose
        trapFocus
        fullHeightOnMobile
        maxWidthClassName={shown?.wide ? "max-w-2xl" : "max-w-lg"}
      >
        {shown && <p className="text-sm text-muted -mt-2 mb-5">{shown.subtitle}</p>}
        {shown?.body}
      </Modal>
    </div>
  );
}

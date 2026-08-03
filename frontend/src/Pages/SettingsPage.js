import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePreferences } from "../preferences/usePreferences";
import { useToast } from "../components/ui/Toast";
import {
  Card,
  Field,
  Input,
  Button,
  LanguageSelect,
} from "../components/ui";
import FontSelector from "../components/dashboard/FontSelector";
import WidgetManager from "../components/dashboard/WidgetManager";
import DashboardSwitcher from "../components/dashboard/DashboardSwitcher";

function Section({ title, subtitle, children }) {
  return (
    <Card className="mb-6">
      <h2 className="text-base font-black text-ink uppercase tracking-wider">{title}</h2>
      {subtitle ? <p className="text-sm text-muted mt-1 mb-5">{subtitle}</p> : <div className="mb-5" />}
      {children}
    </Card>
  );
}

export default function SettingsPage() {
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
    toast("Profile saved ✓", { tone: "success" });
  }

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-3xl font-black text-ink mb-1">{t("settings.title", "Settings")}</h1>
      <p className="text-muted mb-8">Personalise FocusFlow — your colours, font, features and profile.</p>

      {/* ── Appearance ───────────────────────────────────────────── */}
      <Section
        title={t("settings.appearance", "Appearance")}
        subtitle="Pick a font. Changes apply instantly across the whole app."
      >
        <div className="mb-6">
          <FontSelector />
        </div>

        <div>
          <p className="text-sm font-bold text-ink mb-2">{t("settings.language", "Language")}</p>
          <LanguageSelect />
        </div>
      </Section>

      {/* ── Dashboard features ───────────────────────────────────── */}
      <Section
        title={t("settings.widgets", "Dashboard features")}
        subtitle="Turn features on to show them on your dashboard. Drag to reorder."
      >
        <WidgetManager />
      </Section>

      {/* ── Workspaces ───────────────────────────────────────────── */}
      <Section
        title={t("dashboards.title", "Workspaces")}
        subtitle="Switch workspaces from the top bar, or manage them here."
      >
        <DashboardSwitcher />
      </Section>

      {/* ── Profile ──────────────────────────────────────────────── */}
      <Section title={t("settings.profile", "Profile")} subtitle="This information personalises your dashboard greeting and profile card.">
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
      </Section>
    </div>
  );
}

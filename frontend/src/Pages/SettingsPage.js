import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePreferences } from "../preferences/usePreferences";
import {
  Card,
  Field,
  Input,
  Button,
  ThemeToggle,
  LanguageSelect,
} from "../components/ui";
import PalettePicker from "../components/dashboard/PalettePicker";
import FontSelector from "../components/dashboard/FontSelector";
import WidgetManager from "../components/dashboard/WidgetManager";
import DashboardSwitcher from "../components/dashboard/DashboardSwitcher";

function Section({ title, children }) {
  return (
    <Card className="mb-6">
      <h2 className="text-base font-black text-ink mb-5 uppercase tracking-wider">{title}</h2>
      {children}
    </Card>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { profile, updateProfile } = usePreferences();

  const [form, setForm] = useState({
    displayName: profile.displayName || "",
    username: profile.username || "",
    email: profile.email || "",
    phone: profile.phone || "",
    university: profile.university || "",
    pronouns: profile.pronouns || "",
  });

  function handleChange(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  function handleSaveProfile(e) {
    e.preventDefault();
    updateProfile(form);
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-black text-ink mb-8">
          {t("settings.title", "Settings")}
        </h1>

        {/* ── Appearance ───────────────────────────────────────────── */}
        <Section title={t("settings.appearance", "Appearance")}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm font-bold text-ink">{t("settings.theme", "Theme")}</p>
              <p className="text-xs text-muted">Press "t" anywhere to toggle quickly</p>
            </div>
            <ThemeToggle />
          </div>

          <div className="mb-5">
            <p className="text-sm font-bold text-ink mb-2">
              {t("settings.colorScheme", "Color scheme")}
            </p>
            <PalettePicker />
          </div>

          <div>
            <p className="text-sm font-bold text-ink mb-2">
              {t("settings.font", "Font")}
            </p>
            <FontSelector />
          </div>

          <div className="mt-5">
            <p className="text-sm font-bold text-ink mb-2">
              {t("settings.language", "Language")}
            </p>
            <LanguageSelect />
          </div>
        </Section>

        {/* ── Dashboards ───────────────────────────────────────────── */}
        <Section title={t("dashboards.title", "Workspaces")}>
          <p className="text-sm text-muted mb-4">
            Switch workspaces from the top bar, or manage them here.
          </p>
          <DashboardSwitcher />
        </Section>

        {/* ── Widgets ──────────────────────────────────────────────── */}
        <Section title={t("settings.widgets", "Widgets")}>
          <p className="text-sm text-muted mb-4">
            Toggle widgets and drag to reorder for the current workspace.
          </p>
          <WidgetManager />
        </Section>

        {/* ── Profile ──────────────────────────────────────────────── */}
        <Section title={t("settings.profile", "Profile")}>
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <Field label="Display name" htmlFor="s-displayName">
              <Input
                id="s-displayName"
                name="displayName"
                value={form.displayName}
                onChange={handleChange}
                placeholder="How should we greet you?"
              />
            </Field>
            <Field label="Username" htmlFor="s-username">
              <Input
                id="s-username"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="@username"
              />
            </Field>
            <Field label="Email" htmlFor="s-email">
              <Input
                id="s-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Phone (for WhatsApp reminders)" htmlFor="s-phone">
              <Input
                id="s-phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 555 000 0000"
              />
            </Field>
            <Field label="University / College" htmlFor="s-university">
              <Input
                id="s-university"
                name="university"
                value={form.university}
                onChange={handleChange}
                placeholder="Iqra University"
              />
            </Field>
            <Field label="Pronouns" htmlFor="s-pronouns">
              <Input
                id="s-pronouns"
                name="pronouns"
                value={form.pronouns}
                onChange={handleChange}
                placeholder="she/her, he/him, they/them…"
              />
            </Field>
            <Button type="submit" variant="primary" size="md" className="self-start mt-1">
              {t("common.save", "Save")}
            </Button>
          </form>
        </Section>
    </div>
  );
}

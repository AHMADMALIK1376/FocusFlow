// Public page (no sign-in needed): what FocusFlow stores, where, and who handles it.
// Keep this honest and in step with the code: if the app starts storing or sending
// something new, this page and features/consent/consent.js (CONSENT_VERSION) change too.
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Cookie, Database, Share2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import CookieChoice from "../components/consent/CookieChoice";

const Section = ({ icon: Icon, title, children }) => (
  <section className="rounded-token-lg bg-surface shadow-neu p-6">
    <h2 className="flex items-center gap-3 text-lg font-black text-ink mb-3">
      <span className="w-9 h-9 rounded-xl bg-grad-sage text-on-sage shadow-neu-sm grid place-items-center shrink-0"><Icon size={18} strokeWidth={1.75} /></span>
      {title}
    </h2>
    <div className="text-sm text-muted leading-relaxed space-y-2">{children}</div>
  </section>
);

const Row = ({ name, children }) => (
  <li className="flex flex-col sm:flex-row sm:gap-3">
    <code className="shrink-0 sm:w-56 text-xs font-bold text-ink bg-surface-2 rounded-md px-2 py-1 self-start break-all">{name}</code>
    <span className="mt-1 sm:mt-0">{children}</span>
  </li>
);

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-canvas px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-brand hover:underline">
          <ArrowLeft size={16} /> Back to FocusFlow
        </Link>

        <header>
          <h1 className="text-3xl sm:text-4xl font-black text-ink">Privacy and cookies</h1>
          <p className="text-muted mt-2 text-sm">
            FocusFlow is a student project that is being tested. This page says plainly what it stores and who handles it.
          </p>
        </header>

        <Section icon={Cookie} title="What stays in your browser">
          <p>Everything here is needed for the app to work. None of it is used for ads or tracking.</p>
          <ul className="space-y-2.5 mt-2">
            <Row name="ff_session (cookie)">Keeps you signed in. It is <b className="text-ink">HttpOnly</b> (scripts on the page cannot read it), <b className="text-ink">Secure</b> (sent over HTTPS only) and <b className="text-ink">SameSite</b> (not sent along with requests started by other websites). It lasts 20 days and is renewed whenever you use the app. Signing out removes it.</Row>
            <Row name="focus_signedin, focus_username, focus_email">Remember that you are signed in and your name, so the right screens show.</Row>
            <Row name="focusflow:preferences">Your dashboard layout, workspace name, profile, mascot choice and colour theme.</Row>
            <Row name="focusflow:theme.colors">The colours of your theme, so the app opens in them before it has loaded. Removed when you sign out.</Row>
            <Row name="focusflow:theme.mode, focusflow:i18n.language, focusflow:sidebar.collapsed">Light or dark mode, your language, and whether the sidebar is folded.</Row>
            <Row name="focusflow:consent">The choice you make below.</Row>
          </ul>
        </Section>

        <Section icon={Database} title="What we keep on our servers">
          <ul className="list-disc pl-5 space-y-1">
            <li>Your account: name, email, and your password as a one-way hash (we cannot read it).</li>
            <li>Your study data: subjects, classes, attendance, grades, exams, assignments, flashcards, notes, goals, habits, budget, study hours.</li>
            <li>Reminder settings, and if you turn them on, your phone&apos;s push subscription and a WhatsApp number or key you choose to add.</li>
          </ul>
          <p>It is not sold or shared for advertising. Sign-in codes and reminders are sent by email.</p>
        </Section>

        <Section icon={Share2} title="Who handles it">
          <ul className="list-disc pl-5 space-y-1">
            <li><b className="text-ink">Vercel</b> hosts the app and passes requests to our server.</li>
            <li><b className="text-ink">Render</b> runs the server.</li>
            <li><b className="text-ink">Supabase</b> stores the database.</li>
            <li><b className="text-ink">Gmail</b> sends the emails.</li>
            <li><b className="text-ink">Google Fonts</b> supplies the typefaces, so your browser contacts Google when a page loads.</li>
            <li><b className="text-ink">Google sign-in</b> is optional. Only if you allow it below does Google&apos;s script load, and then Google may set its own cookies.</li>
            <li>Phone reminders pass through your browser&apos;s push service (Google, Mozilla or Apple).</li>
          </ul>
        </Section>

        <Section icon={SlidersHorizontal} title="Your choice">
          <CookieChoice />
        </Section>

        <Section icon={ShieldCheck} title="Questions or deleting your data">
          <p>
            To ask for your data to be deleted or corrected, open an issue on the project page:{" "}
            <a className="font-bold text-brand hover:underline" href="https://github.com/AHMADMALIK1376/FocusFlow/issues" target="_blank" rel="noreferrer">github.com/AHMADMALIK1376/FocusFlow</a>.
            Because the app is still being tested, data may be reset without notice.
          </p>
        </Section>
      </div>
    </main>
  );
}

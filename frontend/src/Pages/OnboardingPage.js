import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import workAnim from "../assets/animation/Man Working on Laptop in Office.json";
import { usePreferences } from "../preferences/usePreferences";
import { ageFromDOB, segmentFromAge } from "../preferences/segment";
import { Field, Input, Select, Button, Badge, Pill, useToast } from "../components/ui";
import FontSelector from "../components/dashboard/FontSelector";

const PROFESSION_OPTIONS = [
  { id: "student", label: "Student" },
  { id: "college-student", label: "College Student" },
  { id: "university-student", label: "University Student" },
  { id: "office-professional", label: "Office Professional" },
  { id: "business-owner", label: "Business Owner" },
  { id: "freelancer", label: "Freelancer" },
  { id: "teacher", label: "Teacher" },
  { id: "homemaker", label: "Homemaker" },
  { id: "developer", label: "Developer" },
  { id: "other", label: "Other" },
];

const PRONOUN_OPTIONS = [
  { value: "she/her", label: "she/her" },
  { value: "he/him", label: "he/him" },
  { value: "they/them", label: "they/them" },
  { value: "prefer-not", label: "Prefer not to say" },
  { value: "self-describe", label: "Self-describe…" },
];

const STEPS = 6;

const STEP_META = [
  { title: "Welcome aboard", sub: "Let's craft a workspace that's truly yours." },
  { title: "Tell us about you", sub: "A few details to personalize your experience." },
  { title: "What's your world?", sub: "We'll tune FocusFlow to how you work." },
  { title: "Name your workspace", sub: "Give your dashboard an identity." },
  { title: "Make it yours", sub: "Pick a font you love." },
  { title: "You're ready", sub: "Everything's set — time to focus." },
];

const slide = {
  enter: (d) => ({ x: d > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d) => ({ x: d < 0 ? 40 : -40, opacity: 0 }),
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const {
    onboardingComplete,
    updateProfile,
    completeOnboarding,
    activeDashboard,
    renameDashboard,
    activeDashboardId,
  } = usePreferences();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const pendingEmail =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("pendingVerificationEmail") || ""
      : "";

  const [draft, setDraft] = useState({
    username: "",
    displayName: "",
    email: pendingEmail,
    phone: "",
    dob: "",
    pronouns: "prefer-not",
    customPronouns: "",
    profession: "university-student",
    dashboardName: "",
  });

  if (onboardingComplete) return <Navigate to="/dashboard" replace />;

  const patch = (k, v) => setDraft((p) => ({ ...p, [k]: v }));
  const goNext = () => { setDir(1); setStep((s) => Math.min(STEPS - 1, s + 1)); };
  const goBack = () => { setDir(-1); setStep((s) => Math.max(0, s - 1)); };

  const age = ageFromDOB(draft.dob);
  const segment = segmentFromAge(age);
  const resolvedPronouns = () =>
    draft.pronouns === "self-describe" ? draft.customPronouns : draft.pronouns;

  function handleFinish() {
    if (!draft.username.trim()) {
      toast({ message: "Username is required.", tone: "warn" });
      setStep(1);
      return;
    }
    if (!draft.dashboardName.trim()) {
      toast({ message: "Workspace name is required.", tone: "warn" });
      setStep(3);
      return;
    }
    updateProfile({
      username: draft.username.trim(),
      displayName: draft.displayName.trim() || draft.username.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      dob: draft.dob,
      age,
      segment,
      pronouns: resolvedPronouns(),
      profession: draft.profession,
      role: draft.profession,
    });
    if (activeDashboard && activeDashboardId) {
      renameDashboard(activeDashboardId, draft.dashboardName.trim());
    }
    completeOnboarding();
    navigate("/dashboard");
  }

  const progress = ((step + 1) / STEPS) * 100;

  const steps = [
    // 0 — Welcome
    <div key="welcome" className="flex flex-col items-center text-center gap-6">
      <div className="text-6xl">👋</div>
      <h1 className="text-3xl md:text-4xl font-black text-ink leading-tight">
        Welcome to <span className="bg-grad-hero bg-clip-text text-transparent">FocusFlow</span>
      </h1>
      <p className="text-muted text-base max-w-sm">
        We'll set up your personal workspace in a few quick, painless steps.
      </p>
      <Button variant="primary" size="lg" onClick={goNext} full>Get started →</Button>
    </div>,

    // 1 — Profile
    <div key="profile" className="flex flex-col gap-4">
      <Field label="Username" htmlFor="ob-username">
        <Input id="ob-username" value={draft.username} onChange={(e) => patch("username", e.target.value)} placeholder="@username" required />
      </Field>
      <Field label="Display name" htmlFor="ob-display">
        <Input id="ob-display" value={draft.displayName} onChange={(e) => patch("displayName", e.target.value)} placeholder="How should we greet you?" />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Email" htmlFor="ob-email">
          <Input id="ob-email" type="email" value={draft.email} onChange={(e) => patch("email", e.target.value)} placeholder="you@example.com" />
        </Field>
        <Field label="Phone" hint="For WhatsApp reminders" htmlFor="ob-phone">
          <Input id="ob-phone" type="tel" value={draft.phone} onChange={(e) => patch("phone", e.target.value)} placeholder="+1 555 000 0000" />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Date of birth" htmlFor="ob-dob">
          <Input id="ob-dob" type="date" value={draft.dob} onChange={(e) => patch("dob", e.target.value)} />
          {age !== null && <div className="mt-2"><Badge tone="brand">{segment}</Badge></div>}
        </Field>
        <Field label="Pronouns" htmlFor="ob-pronouns">
          <Select id="ob-pronouns" value={draft.pronouns} onChange={(e) => patch("pronouns", e.target.value)}>
            {PRONOUN_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
          {draft.pronouns === "self-describe" && (
            <Input className="mt-2" value={draft.customPronouns} onChange={(e) => patch("customPronouns", e.target.value)} placeholder="Describe your pronouns…" />
          )}
        </Field>
      </div>
      <NavRow onBack={goBack} onNext={goNext} />
    </div>,

    // 2 — Profession
    <div key="profession" className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2.5">
        {PROFESSION_OPTIONS.map((opt) => (
          <Pill key={opt.id} active={draft.profession === opt.id} onClick={() => patch("profession", opt.id)}>
            {opt.label}
          </Pill>
        ))}
      </div>
      <NavRow onBack={goBack} onNext={goNext} />
    </div>,

    // 3 — Workspace
    <div key="workspace" className="flex flex-col gap-5">
      <Field label="Workspace name" hint="e.g. Iqra University, Kitchen Story, My Studio" htmlFor="ob-ws">
        <Input id="ob-ws" value={draft.dashboardName} onChange={(e) => patch("dashboardName", e.target.value)} placeholder="Name your workspace" required />
      </Field>
      <NavRow onBack={goBack} onNext={goNext} />
    </div>,

    // 4 — Personalize
    <div key="personalize" className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-bold text-ink mb-2">Font</p>
        <FontSelector />
      </div>
      <NavRow onBack={goBack} onNext={goNext} />
    </div>,

    // 5 — Finish
    <div key="allset" className="flex flex-col items-center text-center gap-6">
      <div className="text-6xl">🚀</div>
      <h1 className="text-3xl font-black text-ink">You're all set!</h1>
      <p className="text-muted text-base max-w-sm">
        <b className="text-ink">{draft.dashboardName || "Your workspace"}</b> is ready. Let's get to work.
      </p>
      <div className="flex flex-col gap-3 w-full">
        <Button variant="primary" size="lg" onClick={handleFinish} full>Enter my workspace →</Button>
        <Button variant="ghost" size="sm" onClick={goBack} full>Back</Button>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* LEFT — navy brand panel */}
      <aside className="hidden md:flex md:w-2/5 lg:w-[38%] bg-grad-hero text-on-brand relative overflow-hidden flex-col justify-between p-10">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-[rgb(var(--brand-soft)/0.25)] blur-3xl" />
        <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-[rgb(var(--on-brand)/0.08)] blur-3xl" />

        <div className="relative z-10">
          <span className="text-xl font-black tracking-tighter">FOCUS FLOW</span>
          <p className="text-sm opacity-70 mt-1">Your life, beautifully organized.</p>
        </div>

        <div className="relative z-10 w-full max-w-[300px] mx-auto -my-4">
          <Lottie animationData={workAnim} loop className="w-full h-auto" />
        </div>

        <div className="relative z-10">
          <p className="text-[11px] font-bold uppercase tracking-[3px] opacity-70 mb-2">
            Step {step + 1} of {STEPS}
          </p>
          <h2 className="text-2xl font-black leading-tight">{STEP_META[step].title}</h2>
          <p className="text-sm opacity-80 mt-1.5">{STEP_META[step].sub}</p>
          <div className="flex gap-1.5 mt-5">
            {Array.from({ length: STEPS }).map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? "w-8 bg-[rgb(var(--on-brand))]" : i < step ? "w-4 bg-[rgb(var(--on-brand)/0.7)]" : "w-4 bg-[rgb(var(--on-brand)/0.25)]"}`} />
            ))}
          </div>
        </div>
      </aside>

      {/* RIGHT — content */}
      <main className="flex-1 flex flex-col">
        <div className="h-1.5 bg-surface-2 flex-shrink-0">
          <div className="h-full bg-grad-hero transition-all duration-500 ease-spring" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 md:p-14 overflow-y-auto">
          <div className="w-full max-w-lg">
            {/* mobile step label */}
            <div className="md:hidden mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[3px] text-brand mb-1">Step {step + 1} of {STEPS}</p>
              <h2 className="text-2xl font-black text-ink">{STEP_META[step].title}</h2>
            </div>
            {/* desktop step heading */}
            <div className="hidden md:block mb-7">
              <h2 className="text-2xl font-black text-ink">{STEP_META[step].title}</h2>
              <p className="text-sm text-muted mt-1">{STEP_META[step].sub}</p>
            </div>

            <AnimatePresence custom={dir} mode="wait">
              <motion.div key={step} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25, ease: "easeInOut" }}>
                {steps[step]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavRow({ onBack, onNext }) {
  return (
    <div className="flex gap-3 pt-3">
      <Button variant="neu" size="md" onClick={onBack}>Back</Button>
      <Button variant="primary" size="md" full onClick={onNext}>Continue →</Button>
    </div>
  );
}

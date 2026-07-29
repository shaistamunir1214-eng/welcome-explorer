import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import globeAnimals from "@/assets/globe-animals.png";
import forestScene from "@/assets/forest-scene.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

type Language = {
  code: "ur" | "hi" | "bn";
  name: string;
  native: string;
  flag: string;
  hello: string;
  color: string;
};

const LANGUAGES: Language[] = [
  { code: "ur", name: "Urdu",    native: "اردو",     flag: "🇵🇰", hello: "السلام علیکم", color: "bg-primary" },
  { code: "hi", name: "Hindi",   native: "हिन्दी",   flag: "🇮🇳", hello: "नमस्ते",      color: "bg-secondary" },
  { code: "bn", name: "Bengali", native: "বাংলা",    flag: "🇧🇩", hello: "নমস্কার",    color: "bg-accent" },
];

type Category = { key: string; label: string; emoji: string; bg: string; enabled: boolean; count: number };

const CATEGORIES: Category[] = [
  { key: "animals",  label: "Animals",  emoji: "🐘", bg: "bg-primary",   enabled: true,  count: 25 },
  { key: "fruits",   label: "Fruits",   emoji: "🍎", bg: "bg-accent",    enabled: true,  count: 25 },
  { key: "colors",   label: "Colors",   emoji: "🎨", bg: "bg-secondary", enabled: false, count: 10 },
  { key: "numbers",  label: "Numbers",  emoji: "🔢", bg: "bg-primary",   enabled: false, count: 20 },
  { key: "alphabet", label: "Alphabet", emoji: "🔤", bg: "bg-accent",    enabled: false, count: 30 },
  { key: "vehicles", label: "Vehicles", emoji: "🚗", bg: "bg-secondary", enabled: false, count: 15 },
  { key: "objects",  label: "Objects",  emoji: "🧸", bg: "bg-primary",   enabled: false, count: 20 },
];

type Step = "welcome" | "language" | "name" | "ready" | "home";

function Index() {
  const [step, setStep] = useState<Step>("welcome");
  const [language, setLanguage] = useState<Language | null>(null);
  const [name, setName] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("ll_lang");
    const savedName = localStorage.getItem("ll_name");
    if (savedLang && savedName) {
      const lang = LANGUAGES.find((l) => l.code === savedLang);
      if (lang) {
        setLanguage(lang);
        setName(savedName);
        setStep("home");
      }
    }
    setHydrated(true);
  }, []);

  const handleLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("ll_lang", lang.code);
    setStep("name");
  };

  const handleName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem("ll_name", trimmed);
    setStep("ready");
  };

  const reset = () => {
    localStorage.removeItem("ll_lang");
    localStorage.removeItem("ll_name");
    setLanguage(null);
    setName("");
    setStep("welcome");
  };

  if (!hydrated) return null;

  return (
    <main
      className="min-h-screen w-full"
      style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
    >
      {step === "welcome" && <WelcomeStep onStart={() => setStep("language")} />}
      {step === "language" && <LanguageStep onPick={handleLanguage} onBack={() => setStep("welcome")} />}
      {step === "name" && language && (
        <NameStep
          language={language}
          name={name}
          setName={setName}
          onSubmit={handleName}
          onBack={() => setStep("language")}
        />
      )}
      {step === "ready" && language && (
        <ReadyStep name={name} language={language} onStart={() => setStep("home")} />
      )}
      {step === "home" && language && <HomeScreen name={name} language={language} onReset={reset} />}
      <style>{`
        @keyframes ll-float { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-14px) rotate(2deg); } }
        @keyframes ll-pop { 0% { transform: scale(0.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes ll-bounce-soft { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes ll-pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(99,196,57,0.55); } 100% { box-shadow: 0 0 0 22px rgba(99,196,57,0); } }
        .ll-float { animation: ll-float 6s ease-in-out infinite; }
        .ll-pop { animation: ll-pop 0.35s ease-out both; }
        .ll-bounce { animation: ll-bounce-soft 2.2s ease-in-out infinite; }
        .ll-pulse { animation: ll-pulse-ring 1.6s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ll-float, .ll-bounce, .ll-pulse, .ll-pop { animation: none !important; }
        }
      `}</style>
    </main>
  );
}

/* ---------- Shared bits ---------- */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-xl rounded-[2rem] bg-card p-6 shadow-2xl ring-4 ring-white/70 sm:p-10 ${className}`}>
      {children}
    </div>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="mt-6 flex items-center justify-center gap-2" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-3 rounded-full transition-all ${
            i + 1 === current ? "w-8 bg-primary" : i + 1 < current ? "w-3 bg-primary/60" : "w-3 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

/* ---------- Step 0: Welcome ---------- */

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top, oklch(0.92 0.08 220) 0%, oklch(0.96 0.05 140) 55%, oklch(0.98 0.03 60) 100%)",
      }}
    >
      <div className="w-full max-w-xl text-center ll-pop">
        <div className="mx-auto mb-6 flex justify-center">
          <img
            src={globeAnimals}
            alt="Friendly Earth mascot with animals"
            width={512}
            height={512}
            className="ll-float h-auto w-[75%] max-w-[380px] drop-shadow-2xl select-none"
            draggable={false}
          />
        </div>
        <h1 className="text-4xl font-bold text-foreground sm:text-6xl">Little Learners</h1>
        <p className="mt-3 text-xl text-muted-foreground sm:text-2xl">Let's learn new words together! 🌟</p>
        <button
          onClick={onStart}
          className="ll-pulse mx-auto mt-8 flex min-h-[72px] items-center justify-center gap-3 rounded-full bg-primary px-10 text-2xl font-bold text-primary-foreground shadow-xl transition hover:brightness-105 active:scale-95 sm:text-3xl"
        >
          Tap to Start
          <span className="text-3xl">👉</span>
        </button>
        <StepDots current={1} total={4} />
      </div>
    </div>
  );
}

/* ---------- Step 1: Language ---------- */

function LanguageStep({ onPick, onBack }: { onPick: (l: Language) => void; onBack: () => void }) {
  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-8"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top, oklch(0.92 0.08 220) 0%, oklch(0.96 0.04 200) 55%, oklch(0.98 0.03 100) 100%)",
      }}
    >
      <BackButton onBack={onBack} />
      <div className="mx-auto mt-2 grid w-full max-w-5xl items-center gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="hidden justify-center lg:flex">
          <img
            src={globeAnimals}
            alt="Friendly Earth mascot"
            className="ll-float h-auto w-[85%] max-w-[440px] select-none drop-shadow-2xl"
            draggable={false}
          />
        </div>
        <Card className="ll-pop">
          <div className="mb-6 text-center">
            <div className="mb-2 text-5xl ll-bounce">🌍</div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Pick your language</h1>
            <p className="mt-2 text-lg text-muted-foreground">Tap one!</p>
          </div>
          <div className="grid gap-4">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => onPick(lang)}
                className="group flex min-h-[88px] items-center gap-4 rounded-3xl border-4 border-border bg-background p-4 text-left transition hover:border-primary hover:bg-primary/5 focus:border-primary focus:outline-none active:scale-[0.98] sm:p-5"
              >
                <span className={`${lang.color} grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-4xl shadow-md`} aria-hidden="true">
                  {lang.flag}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-2xl font-bold text-foreground sm:text-3xl">{lang.name}</span>
                  <span className="text-xl text-muted-foreground sm:text-2xl">{lang.native}</span>
                </span>
                <span className="text-3xl text-primary transition group-hover:translate-x-1">→</span>
              </button>
            ))}
          </div>
          <StepDots current={2} total={4} />
        </Card>
      </div>
    </div>
  );
}

/* ---------- Step 2: Name ---------- */

function NameStep({
  language,
  name,
  setName,
  onSubmit,
  onBack,
}: {
  language: Language;
  name: string;
  setName: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}) {
  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-8"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top, oklch(0.94 0.07 140) 0%, oklch(0.97 0.04 60) 55%, oklch(0.99 0.02 100) 100%)",
      }}
    >
      <BackButton onBack={onBack} />
      <div className="flex min-h-[80vh] items-center justify-center">
        <Card className="ll-pop">
          <div className="mb-6 text-center">
            <div className="mb-3 text-7xl ll-bounce" aria-hidden="true">👋</div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">What's your name?</h1>
            <p className="mt-2 text-lg text-muted-foreground">
              {language.hello} — you picked <span className="font-bold">{language.flag} {language.name}</span>
            </p>
          </div>
          <form onSubmit={onSubmit} className="grid gap-5">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type your name"
              maxLength={20}
              aria-label="Your name"
              className="min-h-[72px] w-full rounded-3xl border-4 border-border bg-background px-5 text-center text-3xl font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="min-h-[72px] rounded-3xl bg-primary px-6 text-2xl font-bold text-primary-foreground shadow-xl transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-3xl"
            >
              Next →
            </button>
          </form>
          <StepDots current={3} total={4} />
        </Card>
      </div>
    </div>
  );
}

/* ---------- Step 3: Ready to start ---------- */

function ReadyStep({ name, language, onStart }: { name: string; language: Language; onStart: () => void }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top, oklch(0.92 0.09 140) 0%, oklch(0.96 0.05 60) 55%, oklch(0.98 0.03 100) 100%)",
      }}
    >
      <div className="w-full max-w-xl text-center ll-pop">
        <div className="mx-auto mb-4 text-8xl ll-bounce" aria-hidden="true">🎉</div>
        <h1 className="text-3xl font-bold text-foreground sm:text-5xl">Hi {name}!</h1>
        <p className="mt-3 text-xl text-muted-foreground sm:text-2xl">
          Ready to learn <span className="font-bold text-foreground">{language.flag} {language.name}</span>?
        </p>
        <button
          onClick={onStart}
          className="ll-pulse mx-auto mt-8 flex min-h-[80px] items-center justify-center gap-3 rounded-full bg-primary px-10 text-2xl font-bold text-primary-foreground shadow-2xl transition hover:brightness-105 active:scale-95 sm:text-3xl"
        >
          Start Learning
          <span className="text-3xl">🚀</span>
        </button>
        <StepDots current={4} total={4} />
      </div>
    </div>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      aria-label="Go back"
      className="flex min-h-[56px] min-w-[56px] items-center justify-center rounded-full bg-card px-5 text-lg font-bold text-foreground shadow-md ring-2 ring-border hover:bg-primary/10"
    >
      ← Back
    </button>
  );
}

/* ---------- Home (placeholder for next phase) ---------- */

function HomeScreen({
  name,
  language,
  onReset,
}: {
  name: string;
  language: Language;
  onReset: () => void;
}) {
  const wordsLearned = 0;
  const streak = 1;
  const level = 1;

  return (
    <div
      className="min-h-screen px-4 py-6 sm:px-8 sm:py-10"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0.75)), url(${forestScene})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl bg-card/90 p-3 shadow-lg backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-3xl">
              {language.flag}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted-foreground">Hi there,</p>
              <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{name}! 👋</h1>
            </div>
          </div>
          <button
            onClick={onReset}
            className="min-h-[48px] shrink-0 rounded-full border-2 border-border bg-card px-4 text-sm font-semibold text-foreground hover:border-primary"
          >
            Reset
          </button>
        </header>

        <section className="mt-6 grid grid-cols-3 gap-3 rounded-3xl bg-card/90 p-4 shadow-lg backdrop-blur sm:p-6">
          <Stat emoji="📚" label="Words" value={wordsLearned} />
          <Stat emoji="🏆" label="Level" value={level} />
          <Stat emoji="🔥" label="Streak" value={streak} />
        </section>

        <section className="mt-6">
          <h2 className="mb-4 rounded-2xl bg-card/85 px-4 py-2 text-xl font-bold text-foreground shadow backdrop-blur sm:text-2xl">
            Let's learn!
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                disabled={!cat.enabled}
                className={`${cat.bg} relative flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl p-4 text-primary-foreground shadow-lg ring-4 ring-white/60 transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {!cat.enabled && (
                  <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs font-bold text-foreground">
                    🔒
                  </span>
                )}
                <span className="text-5xl sm:text-6xl" aria-hidden="true">{cat.emoji}</span>
                <span className="text-lg font-bold sm:text-xl">{cat.label}</span>
                <span className="text-xs opacity-90">{cat.count} words</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-background/70 p-3 text-center">
      <span className="text-3xl" aria-hidden="true">{emoji}</span>
      <span className="mt-1 text-2xl font-bold text-foreground">{value}</span>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

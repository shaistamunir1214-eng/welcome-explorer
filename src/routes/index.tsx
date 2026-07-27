import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import globeAnimals from "@/assets/globe-animals.png";
import forestScene from "@/assets/forest-scene.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

type Language = { code: string; name: string; native: string; flag: string };

const LANGUAGES: Language[] = [
  { code: "ur", name: "Urdu", native: "اردو", flag: "🇵🇰" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", native: "বাংলা", flag: "🇧🇩" },
];

type Category = { key: string; label: string; emoji: string; bg: string };

const CATEGORIES: Category[] = [
  { key: "alphabet", label: "Alphabet", emoji: "🔤", bg: "bg-primary" },
  { key: "numbers", label: "Numbers", emoji: "🔢", bg: "bg-secondary" },
  { key: "animals", label: "Animals", emoji: "🐘", bg: "bg-accent" },
  { key: "colors", label: "Colors", emoji: "🎨", bg: "bg-primary" },
  { key: "words", label: "Words", emoji: "📚", bg: "bg-secondary" },
  { key: "songs", label: "Songs", emoji: "🎵", bg: "bg-accent" },
];

type Step = "language" | "name" | "home";

function Index() {
  const [step, setStep] = useState<Step>("language");
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
    setStep("home");
  };

  const reset = () => {
    localStorage.removeItem("ll_lang");
    localStorage.removeItem("ll_name");
    setLanguage(null);
    setName("");
    setStep("language");
  };

  if (!hydrated) return null;

  return (
    <main
      className="min-h-screen w-full px-4 py-6 sm:px-8 sm:py-10"
      style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
    >
      {step === "language" && <LanguageStep onPick={handleLanguage} />}
      {step === "name" && language && (
        <NameStep
          language={language}
          name={name}
          setName={setName}
          onSubmit={handleName}
          onBack={() => setStep("language")}
        />
      )}
      {step === "home" && language && <HomeScreen name={name} language={language} onReset={reset} />}
      <style>{`
        @keyframes ll-float-slow { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-14px) rotate(2deg); } }
        @keyframes ll-drift { 0%,100% { transform: translate(0,0); } 50% { transform: translate(10px,-8px); } }
        .ll-globe { animation: ll-float-slow 6s ease-in-out infinite; transform-origin: center; cursor: grab; }
        .ll-globe:active { cursor: grabbing; }
      `}</style>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl bg-card p-6 shadow-xl sm:p-10">
      {children}
    </div>
  );
}

function LanguageStep({ onPick }: { onPick: (l: Language) => void }) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  return (
    <div
      className="flex min-h-[85vh] items-center justify-center"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at top, oklch(0.92 0.08 220) 0%, oklch(0.96 0.04 200) 55%, oklch(0.98 0.03 100) 100%)",
      }}
    >
      <div className="grid w-full max-w-5xl items-center gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex justify-center">
          <img
            src={globeAnimals}
            alt="A smiling Earth globe surrounded by playful cartoon animals"
            width={1024}
            height={1024}
            draggable={false}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              setDrag({ x: e.clientX - offset.x, y: e.clientY - offset.y });
            }}
            onPointerMove={(e) => {
              if (!drag) return;
              setOffset({ x: e.clientX - drag.x, y: e.clientY - drag.y });
            }}
            onPointerUp={() => setDrag(null)}
            onPointerCancel={() => setDrag(null)}
            onDoubleClick={() => setOffset({ x: 0, y: 0 })}
            className="ll-globe h-auto w-[85%] max-w-[520px] select-none drop-shadow-2xl"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              animation: drag ? "none" : undefined,
              touchAction: "none",
            }}
          />
        </div>
        <Card>
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Choose your language</h1>
            <p className="mt-2 text-lg text-muted-foreground">Drag the globe & pick one!</p>
          </div>
          <div className="grid gap-4">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => onPick(lang)}
                className="group flex items-center gap-4 rounded-2xl border-4 border-border bg-background p-5 text-left transition hover:border-primary hover:bg-primary/5 focus:border-primary focus:outline-none active:scale-[0.98] sm:gap-6 sm:p-6"
              >
                <span className="text-5xl sm:text-6xl" aria-hidden="true">{lang.flag}</span>
                <span className="flex flex-1 flex-col">
                  <span className="text-2xl font-bold text-foreground sm:text-3xl">{lang.name}</span>
                  <span className="text-xl text-muted-foreground sm:text-2xl">{lang.native}</span>
                </span>
                <span className="text-3xl text-primary opacity-0 transition group-hover:opacity-100">→</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

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
    <div className="flex min-h-[85vh] items-center justify-center">
      <Card>
        <button
          onClick={onBack}
          className="mb-4 text-lg font-semibold text-secondary hover:underline"
        >
          ← Back
        </button>
        <div className="mb-8 text-center">
          <div className="mb-3 text-6xl sm:text-7xl">👋</div>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">What's your name?</h1>
          <p className="mt-2 text-lg text-muted-foreground">
            You picked <span className="font-bold">{language.flag} {language.name}</span>
          </p>
        </div>
        <form onSubmit={onSubmit} className="grid gap-5">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Type your name here"
            maxLength={20}
            className="w-full rounded-2xl border-4 border-border bg-background px-5 py-5 text-center text-2xl font-semibold text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:text-3xl"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-2xl bg-primary px-6 py-5 text-2xl font-bold text-primary-foreground shadow-lg transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:text-3xl"
          >
            Let's Go! 🚀
          </button>
        </form>
      </Card>
    </div>
  );
}

function HomeScreen({
  name,
  language,
  onReset,
}: {
  name: string;
  language: Language;
  onReset: () => void;
}) {
  const progress = 3;
  const total = CATEGORIES.length;
  const pct = Math.round((progress / total) * 100);

  return (
    <div
      className="relative -mx-4 -my-6 min-h-screen px-4 py-6 sm:-mx-8 sm:-my-10 sm:px-8 sm:py-10"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0.75)), url(${forestScene})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl bg-card/85 p-3 shadow-lg backdrop-blur">
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
            className="shrink-0 rounded-full border-2 border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-primary"
          >
            Reset
          </button>
        </header>

        <section className="mt-6 rounded-3xl bg-card/90 p-6 shadow-lg backdrop-blur sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Your progress</p>
              <p className="text-2xl font-bold text-foreground sm:text-3xl">
                {progress} of {total} done!
              </p>
            </div>
            <div className="text-4xl">⭐</div>
          </div>
          <div className="mt-4 h-5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-4 rounded-2xl bg-card/85 px-4 py-2 text-xl font-bold text-foreground shadow backdrop-blur sm:text-2xl">
            Let's learn!
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`${cat.bg} flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl p-4 text-primary-foreground shadow-lg ring-4 ring-white/60 transition hover:brightness-105 active:scale-95`}
              >
                <span className="text-5xl sm:text-6xl" aria-hidden="true">{cat.emoji}</span>
                <span className="text-lg font-bold sm:text-xl">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

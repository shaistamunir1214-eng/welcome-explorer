import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Word Wizard — Onboarding" },
      { name: "description", content: "Fun language learning onboarding for kids ages 2-6." },
      { property: "og:title", content: "Word Wizard — Onboarding" },
      { property: "og:description", content: "Fun language learning onboarding for kids ages 2-6." },
    ],
  }),
  component: Onboarding,
});

type LangCode = "ur" | "hi" | "bn";
type Language = {
  code: LangCode;
  flag: string;
  name: string;
  native: string;
  align: "left" | "center" | "right";
  dir: "ltr" | "rtl";
  bg: string; // tailwind color class
  inputLang: string;
};

const LANGUAGES: Language[] = [
  { code: "ur", flag: "🇵🇰", name: "Urdu",    native: "اردو",    align: "right",  dir: "rtl", bg: "bg-[#E23E57]", inputLang: "ur" },
  { code: "hi", flag: "🇮🇳", name: "Hindi",   native: "हिंदी",  align: "center", dir: "ltr", bg: "bg-[#F5A623]", inputLang: "hi" },
  { code: "bn", flag: "🇧🇩", name: "Bengali", native: "বাংলা",  align: "left",   dir: "ltr", bg: "bg-[#2FB380]", inputLang: "bn" },
];

const TOTAL_STEPS = 4;

function Onboarding() {
  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState<Language | null>(null);
  const [name, setName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [done, setDone] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Hydrate saved progress
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("ww_lang");
      const savedName = localStorage.getItem("ww_name");
      const savedConsent = localStorage.getItem("ww_consent");
      if (savedLang) {
        const l = LANGUAGES.find((x) => x.code === savedLang);
        if (l) setLanguage(l);
      }
      if (savedName) setName(savedName);
      if (savedConsent === "1" && savedLang && savedName) setDone(true);
    } catch {}
  }, []);

  const ding = () => {
    if (muted) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = audioCtxRef.current ?? (audioCtxRef.current = new Ctx());
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 660;
      o.type = "sine";
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.12);
    } catch {}
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  };

  const goNext = () => {
    ding();
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };
  const goBack = () => {
    ding();
    setStep((s) => Math.max(1, s - 1));
  };

  const pickLanguage = (l: Language) => {
    setLanguage(l);
    try { localStorage.setItem("ww_lang", l.code); } catch {}
    ding();
    setStep(3);
  };

  const submitName = () => {
    const trimmed = name.trim();
    if (!trimmed) return showToast("Please enter your name!");
    if (trimmed.length < 2) return showToast("That's too short!");
    try { localStorage.setItem("ww_name", trimmed); } catch {}
    goNext();
  };

  const [confirmed, setConfirmed] = useState(false);

  const consent = () => {
    if (!confirmed) return;
    try { localStorage.setItem("ww_consent", "1"); } catch {}
    ding();
    setDone(true);
  };

  if (done && language) {
    return <HomeScreen name={name} language={language} onReset={() => {
      try {
        localStorage.removeItem("ww_lang");
        localStorage.removeItem("ww_name");
        localStorage.removeItem("ww_consent");
      } catch {}
      setLanguage(null); setName(""); setStep(1); setDone(false);
    }} />;
  }

  return (
    <main
      className="relative flex min-h-dvh w-full flex-col items-center justify-between px-4 py-6 sm:py-10"
      style={{
        fontFamily: "'Fredoka', system-ui, sans-serif",
        backgroundImage: "linear-gradient(160deg, #63C439 0%, #378ADD 100%)",
      }}
      aria-label={`Step ${step} of ${TOTAL_STEPS}`}
    >
      {/* Top bar */}
      <div className="flex w-full max-w-[600px] items-center justify-between">
        {step > 1 ? (
          <button
            onClick={goBack}
            aria-label="Go back"
            className="min-h-11 min-w-11 rounded-full bg-white/90 px-4 text-base font-bold text-[#1c6b12] shadow-md ring-2 ring-white/70 transition active:scale-95"
          >
            ← Back
          </button>
        ) : <div className="min-h-11 min-w-11" />}
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          className="min-h-11 min-w-11 rounded-full bg-white/90 px-4 text-lg shadow-md ring-2 ring-white/70 transition active:scale-95"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Card */}
      <section
        key={step}
        className="ww-slide-up mx-auto w-full max-w-[600px] rounded-[30px] bg-white p-6 shadow-2xl sm:p-10"
        aria-live="polite"
      >
        {step === 1 && <WelcomeStep onStart={goNext} />}
        {step === 2 && <LanguageStep onPick={pickLanguage} />}
        {step === 3 && language && (
          <NameStep
            language={language}
            name={name}
            setName={setName}
            onSubmit={submitName}
          />
        )}
        {step === 4 && (
          <ConsentStep
            childName={name}
            privacyOpen={privacyOpen}
            togglePrivacy={() => setPrivacyOpen((p) => !p)}
            confirmed={confirmed}
            setConfirmed={setConfirmed}
            onYes={consent}
            onAsk={() => showToast("Please ask a grown-up 👨‍👩‍👧")}
          />
        )}
      </section>

      {/* Progress dots */}
      <div className="mt-4 flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <span
            key={i}
            className={`h-3 rounded-full transition-all ${
              i + 1 === step ? "w-10 bg-white" : i + 1 < step ? "w-3 bg-white/80" : "w-3 bg-white/40"
            }`}
          />
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="alert"
          className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full bg-[#E23E57] px-5 py-3 text-lg font-bold text-white shadow-xl"
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes ww-fade-up { from { opacity: 0; transform: translateY(20px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes ww-slide-up { from { opacity: 0; transform: translateY(40px);} to { opacity: 1; transform: translateY(0);} }
        @keyframes ww-head { 0%,100% { transform: rotate(-6deg);} 50% { transform: rotate(6deg);} }
        @keyframes ww-blink { 0%,92%,100% { transform: scaleY(1);} 95% { transform: scaleY(0.1);} }
        @keyframes ww-pop { 0% { transform: scale(0.7); opacity: 0;} 100% { transform: scale(1); opacity: 1;} }
        .ww-slide-up { animation: ww-slide-up 300ms ease-out both; }
        .ww-fade-up { animation: ww-fade-up 200ms ease-out both; }
        .ww-mascot { animation: ww-head 3.5s ease-in-out infinite; transform-origin: 50% 80%; }
        .ww-eye { animation: ww-blink 4s ease-in-out infinite; transform-origin: center; }
        .ww-pop { animation: ww-pop 350ms ease-out both; }
        .ww-tap { transition: transform 120ms ease; }
        .ww-tap:active { transform: scale(1.05); }
        @media (prefers-reduced-motion: reduce) {
          .ww-slide-up, .ww-fade-up, .ww-mascot, .ww-eye, .ww-pop { animation: none !important; }
        }
      `}</style>
    </main>
  );
}

/* ---------- Mascot ---------- */
function Elephant({ size = 100 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className="ww-mascot drop-shadow-xl"
      role="img"
      aria-label="Friendly elephant mascot"
    >
      {/* Body */}
      <ellipse cx="60" cy="72" rx="38" ry="34" fill="#8FB6E8" />
      {/* Ears */}
      <ellipse cx="22" cy="60" rx="14" ry="18" fill="#7AA3D6" />
      <ellipse cx="98" cy="60" rx="14" ry="18" fill="#7AA3D6" />
      {/* Head */}
      <ellipse cx="60" cy="55" rx="28" ry="26" fill="#A8CBEF" />
      {/* Trunk */}
      <path d="M60 70 Q56 92 68 100 Q78 104 78 92" stroke="#8FB6E8" strokeWidth="10" fill="none" strokeLinecap="round" />
      {/* Eyes */}
      <g>
        <ellipse className="ww-eye" cx="48" cy="52" rx="4" ry="5" fill="#22303B" />
        <ellipse className="ww-eye" cx="72" cy="52" rx="4" ry="5" fill="#22303B" />
        <circle cx="49" cy="50" r="1.4" fill="white" />
        <circle cx="73" cy="50" r="1.4" fill="white" />
      </g>
      {/* Cheeks */}
      <circle cx="42" cy="62" r="3" fill="#F5A9B8" opacity="0.7" />
      <circle cx="78" cy="62" r="3" fill="#F5A9B8" opacity="0.7" />
      {/* Smile */}
      <path d="M56 66 Q60 70 64 66" stroke="#22303B" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Step 1: Welcome ---------- */
function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="ww-pop"><Elephant size={140} /></div>
      <h1 className="ww-fade-up mt-4 text-3xl font-bold text-[#1c6b12] sm:text-4xl" style={{ fontSize: "clamp(28px, 6vw, 40px)" }}>
        Welcome to Word Wizard! 🧙‍♀️
      </h1>
      <p className="ww-fade-up mt-3 font-medium text-slate-600" style={{ fontSize: "clamp(18px, 4vw, 24px)", animationDelay: "80ms" }}>
        Let's learn new languages together
      </p>
      <button
        onClick={onStart}
        className="ww-tap mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#63C439] font-bold text-white shadow-xl focus:outline-none focus:ring-4 focus:ring-[#378ADD]/60"
        style={{ minHeight: 80, fontSize: 26 }}
      >
        Start ✨
      </button>
    </div>
  );
}

/* ---------- Step 2: Language ---------- */
function LanguageStep({ onPick }: { onPick: (l: Language) => void }) {
  return (
    <div className="text-center">
      <h2 className="font-bold text-[#1c6b12]" style={{ fontSize: "clamp(22px, 5vw, 30px)" }}>
        Which language do you speak at home?
      </h2>
      <div className="mt-6 grid gap-4">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => onPick(l)}
            dir={l.dir}
            className={`ww-tap w-full rounded-2xl ${l.bg} px-5 font-bold text-white shadow-lg focus:outline-none focus:ring-4 focus:ring-white/70`}
            style={{
              minHeight: 100,
              fontSize: 26,
              textAlign: l.align,
            }}
          >
            <span className="mr-2 text-3xl align-middle">{l.flag}</span>
            <span className="align-middle" style={{ fontSize: 30 }}>{l.native}</span>
            <span className="ml-2 align-middle opacity-90"> {l.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Step 3: Name ---------- */
function NameStep({
  language, name, setName, onSubmit,
}: {
  language: Language;
  name: string;
  setName: (v: string) => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [listening, setListening] = useState(false);

  const handleFocus = () => {
    // Auto-scroll form up if keyboard blocks input on mobile
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only letters (any script) + spaces, max 20
    const cleaned = e.target.value.replace(/[0-9!@#$%^&*()_+=\-\[\]{};':"\\|,.<>/?`~]/g, "").slice(0, 20);
    setName(cleaned);
  };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = language.inputLang;
    rec.onresult = (ev: any) => {
      const text = ev.results?.[0]?.[0]?.transcript ?? "";
      setName(text.replace(/[^\p{L}\s]/gu, "").slice(0, 20));
    };
    rec.onend = () => setListening(false);
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  };

  return (
    <div className="text-center">
      <div className="flex justify-center"><Elephant size={90} /></div>
      <h2 className="mt-3 font-bold text-[#1c6b12]" style={{ fontSize: "clamp(22px, 5vw, 30px)" }}>
        What's your name?
      </h2>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="mt-5 grid gap-4"
      >
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={handleChange}
            onFocus={handleFocus}
            placeholder="Type your name here"
            maxLength={20}
            lang={language.inputLang}
            inputMode="text"
            autoComplete="off"
            dir={language.dir}
            aria-label="Your name"
            className="w-full rounded-2xl border-4 border-[#63C439]/40 bg-white px-5 py-4 text-center font-semibold text-slate-800 placeholder:text-slate-400 focus:border-[#63C439] focus:outline-none"
            style={{ fontSize: 22, minHeight: 72 }}
          />
          <button
            type="button"
            onClick={startVoice}
            aria-label="Speak your name"
            className={`absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full ${listening ? "bg-[#E23E57]" : "bg-[#378ADD]"} text-xl text-white shadow-md`}
          >
            🎤
          </button>
        </div>
        <button
          type="submit"
          disabled={!name.trim()}
          className="ww-tap w-full rounded-2xl bg-[#63C439] font-bold text-white shadow-xl disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-4 focus:ring-[#378ADD]/60"
          style={{ minHeight: 80, fontSize: 24 }}
        >
          Next →
        </button>
      </form>
    </div>
  );
}

/* ---------- Step 4: Consent ---------- */
function ConsentStep({
  childName, privacyOpen, togglePrivacy, onYes, onAsk,
}: {
  childName: string;
  privacyOpen: boolean;
  togglePrivacy: () => void;
  onYes: () => void;
  onAsk: () => void;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#63C439] px-4 py-2 text-white shadow-md" style={{ fontSize: 18 }}>
        <span aria-hidden="true">✓</span>
        <span className="font-bold">Child-Safe Certified</span>
      </div>
      <p className="mt-4 font-medium text-slate-700" style={{ fontSize: 20 }}>
        {childName ? `${childName}, ` : ""}by using Word Wizard, you agree to our Privacy Policy.
      </p>

      <button
        type="button"
        onClick={togglePrivacy}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#378ADD]/10 px-4 py-2 font-bold text-[#378ADD] transition active:scale-95"
        style={{ fontSize: 18 }}
        aria-expanded={privacyOpen}
        aria-controls="privacy-policy"
      >
        {privacyOpen ? "▲ Hide Privacy Policy" : "▼ Read Privacy Policy"}
      </button>

      <div
        id="privacy-policy"
        className={`mx-auto mt-3 max-w-md overflow-hidden rounded-3xl bg-slate-50 text-left text-slate-700 transition-all duration-300 ${privacyOpen ? "max-h-[600px] p-5 opacity-100" : "max-h-0 p-0 opacity-0"}`}
      >
        <h3 className="font-bold text-[#1c6b12]" style={{ fontSize: 18 }}>
          🔒 Keeping kids safe is our job
        </h3>
        <ul className="mt-2 list-disc space-y-2 pl-5" style={{ fontSize: 16 }}>
          <li>We only ask for a first name and the language you picked.</li>
          <li>We do not ask for email, phone, address, or photos.</li>
          <li>We do not show ads to kids.</li>
          <li>We do not track where your child goes after using our app.</li>
          <li>We do not sell or share any information with other companies.</li>
        </ul>

        <h3 className="mt-4 font-bold text-[#1c6b12]" style={{ fontSize: 18 }}>
          🛡️ For grown-ups
        </h3>
        <p className="mt-1" style={{ fontSize: 16 }}>
          Word Wizard is designed to be COPPA-friendly. Your child’s name and learning progress are stored only on this device. You can delete everything at any time by tapping “Start Over” on the home screen.
        </p>

        <p className="mt-3 font-semibold text-[#378ADD]" style={{ fontSize: 16 }}>
          Questions? Email us at privacy@wordwizard.app
        </p>
      </div>

      <p className="mt-6 font-bold text-[#1c6b12]" style={{ fontSize: 22 }}>
        Does your child have permission to use this app?
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          onClick={onYes}
          className="ww-tap rounded-2xl bg-[#63C439] font-bold text-white shadow-xl focus:outline-none focus:ring-4 focus:ring-white/70"
          style={{ minHeight: 80, fontSize: 22 }}
        >
          Yes, Let's Go! 🎉
        </button>
        <button
          onClick={onAsk}
          className="ww-tap rounded-2xl bg-slate-400 font-bold text-white shadow-md focus:outline-none focus:ring-4 focus:ring-white/70"
          style={{ minHeight: 80, fontSize: 22 }}
        >
          Ask Parent
        </button>
      </div>
    </div>
  );
}

/* ---------- Home (post-onboarding) ---------- */
function HomeScreen({ name, language, onReset }: { name: string; language: Language; onReset: () => void }) {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-10 text-center text-white"
      style={{
        fontFamily: "'Fredoka', system-ui, sans-serif",
        backgroundImage: "linear-gradient(160deg, #63C439 0%, #378ADD 100%)",
      }}
    >
      <Elephant size={140} />
      <h1 className="mt-4 font-bold" style={{ fontSize: "clamp(28px, 6vw, 44px)" }}>
        {name}, you're going to be a WORD WIZARD! 🧙‍♀️
      </h1>
      <p className="mt-3 font-medium opacity-95" style={{ fontSize: 22 }}>
        Learning {language.flag} {language.native} together
      </p>
      <button
        onClick={onReset}
        className="ww-tap mt-8 rounded-2xl bg-white px-6 font-bold text-[#1c6b12] shadow-xl"
        style={{ minHeight: 64, fontSize: 20 }}
      >
        Start Over
      </button>
    </main>
  );
}

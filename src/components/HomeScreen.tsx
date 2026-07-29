import { useEffect, useMemo, useRef, useState } from "react";
import { LearningScreen } from "@/components/LearningScreen";

export type HomeLanguage = { code: string; flag: string; name: string; native: string };

type Category = {
  id: string;
  emoji: string;
  name: string;
  color: string;
  learned: number;
  total: number;
  locked: boolean;
  unlockHint: string;
};

const GREETING_ANIMALS = ["🐘", "🐯", "🦜", "🐨", "🦁"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TABS = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "learn", label: "Learn", icon: "📖" },
  { id: "quiz", label: "Quiz", icon: "🎮" },
  { id: "achievements", label: "Achievements", icon: "🏆", badge: 3 },
  { id: "parent", label: "Parent", icon: "👨‍👩‍👧" },
] as const;

export function HomeScreen({
  name,
  language,
  onReset,
}: {
  name: string;
  language: HomeLanguage;
  onReset: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [lessonCategory, setLessonCategory] = useState<string | null>(null);
  const [challengeDone, setChallengeDone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    try {
      setChallengeDone(localStorage.getItem("ww_challenge_day") === new Date().toDateString());
    } catch {}
  }, []);

  const today = new Date();
  const animal = GREETING_ANIMALS[today.getDate() % GREETING_ANIMALS.length];

  // Progress state (local for now — swap for a backend read when Cloud is enabled)
  const wordsLearned = 23;
  const streak = 7;

  const categories: Category[] = useMemo(() => {
    const animals = { learned: 4, total: 10 };
    const unlockedByAnimals = animals.learned >= 10;
    return [
      { id: "animals", emoji: "🐾", name: "Animals", color: "#63C439", learned: animals.learned, total: animals.total, locked: false, unlockHint: "" },
      { id: "fruits", emoji: "🍎", name: "Fruits", color: "#E2564A", learned: 2, total: 10, locked: false, unlockHint: "" },
      { id: "colors", emoji: "🌈", name: "Colors", color: "#378ADD", learned: 0, total: 10, locked: !unlockedByAnimals, unlockHint: "Learn 10 words in Animals to unlock Colors" },
      { id: "numbers", emoji: "1️⃣", name: "Numbers", color: "#F5A623", learned: 0, total: 10, locked: true, unlockHint: "Finish Colors to unlock Numbers" },
      { id: "alphabet", emoji: "🔤", name: "Alphabet", color: "#9B59B6", learned: 0, total: 26, locked: true, unlockHint: "Finish Numbers to unlock Alphabet" },
      { id: "vehicles", emoji: "🚗", name: "Vehicles", color: "#2FB380", learned: 0, total: 10, locked: true, unlockHint: "Finish Alphabet to unlock Vehicles" },
      { id: "objects", emoji: "🏠", name: "Everyday Objects", color: "#D85A30", learned: 0, total: 12, locked: true, unlockHint: "Finish Vehicles to unlock Everyday Objects" },
    ];
  }, []);

  const openCategory = (c: Category) => {
    if (c.locked) {
      setNotice(`${c.name} is locked. ${c.unlockHint}`);
      return;
    }
    setActiveTab("learn");
    setNotice(`Opening ${c.name}. Loading your first word.`);
    setLessonCategory(c.id);
  };

  const onTabKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : (i - 1 + TABS.length) % TABS.length;
    tabRefs.current[next]?.focus();
    setActiveTab(TABS[next].id);
  };

  if (lessonCategory) {
    return (
      <LearningScreen
        categoryId={lessonCategory}
        onClose={() => {
          setLessonCategory(null);
          setActiveTab("home");
        }}
      />
    );
  }


  return (
    <div
      className="min-h-dvh bg-[#F7F9F4] pb-[76px]"
      style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
    >
      <p aria-live="polite" className="sr-only">{notice}</p>

      {/* Status bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between bg-[#63C439] px-3 text-white"
        style={{ height: 60 }}
      >
        <button
          onClick={() => { setSettingsOpen((s) => !s); setMenuOpen(false); }}
          aria-label="Settings: language, sound and parent lock"
          aria-expanded={settingsOpen}
          className="flex size-10 items-center justify-center rounded-full text-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
        >
          <span aria-hidden="true">⚙️</span>
        </button>
        <p className="truncate text-[20px] font-bold">
          {name} <span aria-hidden="true">{language.flag}</span>
          <span className="sr-only">learning {language.name}</span>
        </p>
        <button
          onClick={() => { setMenuOpen((m) => !m); setSettingsOpen(false); }}
          aria-label="Open menu: settings, help and about"
          aria-expanded={menuOpen}
          className="flex size-10 items-center justify-center rounded-full text-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
        >
          <span aria-hidden="true">☰</span>
        </button>
      </header>

      {(menuOpen || settingsOpen) && (
        <nav
          aria-label={settingsOpen ? "Settings" : "Main menu"}
          className="mx-auto max-w-[900px] px-4 pt-3"
        >
          <ul className="rounded-2xl bg-white p-2 shadow-lg">
            {(settingsOpen
              ? ["Language", "Sound", "Parent lock"]
              : ["Settings", "Help", "About"]
            ).map((item) => (
              <li key={item}>
                <button
                  onClick={() => setNotice(`${item} is coming soon.`)}
                  className="w-full rounded-xl px-4 py-3 text-left text-base font-semibold text-[#333] hover:bg-[#F5F5F5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#63C439]"
                >
                  {item}
                </button>
              </li>
            ))}
            <li>
              <button
                onClick={onReset}
                className="w-full rounded-xl px-4 py-3 text-left text-base font-semibold text-[#D85A30] hover:bg-[#F5F5F5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#63C439]"
              >
                Start Over
              </button>
            </li>
          </ul>
        </nav>
      )}

      <main className="mx-auto max-w-[900px] px-4">
        {/* Greeting card */}
        <section
          aria-labelledby="ww-greeting-heading"
          className="mt-3 flex flex-col items-center justify-center rounded-[20px] px-5 py-4 text-center text-white shadow-lg"
          style={{ minHeight: 140, backgroundImage: "linear-gradient(90deg, #63C439 0%, #378ADD 100%)" }}
        >
          <span className="ww-spin-once block leading-none" style={{ fontSize: 100 }} aria-hidden="true">
            {animal}
          </span>
          <h1
            id="ww-greeting-heading"
            ref={headingRef}
            tabIndex={-1}
            className="mt-2 font-bold outline-none"
            style={{ fontSize: 28 }}
          >
            Hi {name}! Today is {DAYS[today.getDay()]}. <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-1 font-medium" style={{ fontSize: 18 }}>
            You learned 12 words this week! <span aria-hidden="true">🌟</span>
          </p>
          <p className="mt-1 font-semibold" style={{ fontSize: 16 }}>
            <span aria-hidden="true">🔥</span> Your streak: {streak} days! Keep it going!
          </p>
        </section>

        {/* Quick stats */}
        <section aria-labelledby="ww-stats-heading" className="mt-4">
          <h2 id="ww-stats-heading" className="sr-only">Your progress</h2>
          <ul className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
            <li className="ww-slide-in min-w-[220px] flex-1 rounded-[15px] bg-white p-3 shadow-md" style={{ minHeight: 100, animationDelay: "0ms" }}>
              <p className="text-sm font-semibold text-[#333]"><span aria-hidden="true">📚</span> Words Learned</p>
              <p className="text-2xl font-bold text-[#63C439]">{wordsLearned}/50</p>
              <p className="text-xs text-[#666]">Progress to Level 2</p>
              <div
                className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#EEE]"
                role="progressbar"
                aria-valuenow={50}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress to Level 2: 50 percent"
              >
                <div className="ww-fill h-full rounded-full bg-[#63C439]" style={{ ["--ww-fill" as string]: "50%" }} />
              </div>
            </li>
            <li className="ww-slide-in min-w-[220px] flex-1 rounded-[15px] bg-white p-3 shadow-md" style={{ minHeight: 100, animationDelay: "200ms" }}>
              <p className="text-sm font-semibold text-[#333]"><span aria-hidden="true">⭐</span> Points This Week</p>
              <p className="text-2xl font-bold text-[#378ADD]">240</p>
              <p className="text-xs text-[#666]">15 away from next star!</p>
            </li>
            <li className="ww-slide-in min-w-[220px] flex-1 rounded-[15px] bg-white p-3 shadow-md" style={{ minHeight: 100, animationDelay: "400ms" }}>
              <p className="text-sm font-semibold text-[#333]"><span aria-hidden="true">🏆</span> Your Level</p>
              <p className="text-2xl font-bold text-[#D85A30]">Level 1/5</p>
              <p className="text-xs text-[#666]">Beginner</p>
            </li>
          </ul>
        </section>

        {/* Daily challenge */}
        <section
          aria-labelledby="ww-challenge-heading"
          className={`mt-4 rounded-[18px] bg-[#D85A30] p-4 text-white shadow-lg sm:flex sm:items-center sm:justify-between sm:gap-4 ${challengeDone ? "" : "ww-pulse-border"}`}
          style={{ minHeight: 100 }}
        >
          {challengeDone ? (
            <p id="ww-challenge-heading" className="font-bold" style={{ fontSize: 20 }}>
              <span aria-hidden="true">✅</span> Completed! Return tomorrow for a new challenge
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="ww-pulse-emoji" style={{ fontSize: 40 }} aria-hidden="true">🎯</span>
                <div>
                  <h2 id="ww-challenge-heading" className="font-bold" style={{ fontSize: 20 }}>
                    Daily Challenge Available!
                  </h2>
                  <p style={{ fontSize: 16 }}>
                    Learn 5 new words today, keep your {streak}-day streak alive! <span aria-hidden="true">⏰</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab("quiz");
                  setNotice("Starting today's challenge quiz with 5 pre-selected words.");
                  try { localStorage.setItem("ww_challenge_day", new Date().toDateString()); } catch {}
                  setChallengeDone(true);
                }}
                className="mt-3 w-full shrink-0 rounded-2xl bg-[#63C439] px-6 font-bold text-white shadow-md transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white sm:mt-0 sm:w-auto"
                style={{ height: 60, fontSize: 18 }}
              >
                Start Challenge
              </button>
            </>
          )}
        </section>

        {/* Categories */}
        <section aria-labelledby="ww-categories-heading" className="mt-5">
          <h2 id="ww-categories-heading" className="mb-2 text-lg font-bold text-[#333]">
            Pick a category
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => openCategory(c)}
                  aria-describedby={c.locked ? `${c.id}-hint` : undefined}
                  className="relative flex h-full w-full flex-col items-center gap-1 rounded-[18px] p-4 text-center transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#378ADD]"
                  style={
                    c.locked
                      ? { background: "#F5F5F5", border: "2px solid #DDD", color: "#333" }
                      : { background: c.color, border: `3px solid ${c.color}`, color: "#fff" }
                  }
                >
                  <span aria-hidden="true" style={{ fontSize: 60, lineHeight: 1 }}>{c.emoji}</span>
                  <span className="text-base font-bold">{c.name}</span>
                  <span className={`text-sm ${c.locked ? "text-[#666]" : "text-white/90"}`}>
                    {c.learned}/{c.total} words
                  </span>
                  {c.locked && (
                    <span id={`${c.id}-hint`} className="text-xs font-semibold text-[#666]">
                      <span aria-hidden="true">🔒</span> Locked — {c.unlockHint}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </main>

      {/* Bottom navigation */}
      <nav
        aria-label="Main sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[#EEE] bg-white"
        style={{ height: 60 }}
      >
        <ul className="mx-auto flex h-full max-w-[900px]">
          {TABS.map((t, i) => {
            const active = activeTab === t.id;
            return (
              <li key={t.id} className="flex-1">
                <button
                  ref={(el) => { tabRefs.current[i] = el; }}
                  onClick={() => { setActiveTab(t.id); setNotice(`${t.label} selected.`); }}
                  onKeyDown={(e) => onTabKeyDown(e, i)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#63C439] ${
                    active ? "font-bold text-[#63C439] underline underline-offset-4" : "text-[#666]"
                  }`}
                >
                  <span aria-hidden="true" style={{ fontSize: 20 }}>{t.icon}</span>
                  <span style={{ fontSize: 12 }}>{t.label}</span>
                  {"badge" in t && t.badge ? (
                    <span className="absolute right-1/4 top-1 rounded-full bg-[#D85A30] px-1.5 text-[10px] font-bold text-white">
                      {t.badge}
                      <span className="sr-only"> new achievements</span>
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

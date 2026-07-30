import { useEffect, useMemo, useRef, useState } from "react";
import { explain, type LangKey, type Question, type QuestionResult } from "@/lib/quiz-store";
import {
  applyQuizSession,
  categoryMeta,
  MAX_STARS,
  nextCategory,
  saveSession,
  trackEvent,
  type SessionSummary,
} from "@/lib/profile";

export type ResultsData = {
  questions: Question[];
  results: (QuestionResult | null)[];
  points: number;
  bestStreak: number;
  finalStreak: number;
  mode: "practice" | "daily";
  categoryId: string;
  categoryName: string;
};

const CONFETTI = Array.from({ length: 34 }, (_, i) => i);
const CONFETTI_COLORS = ["#63C439", "#378ADD", "#F5A623", "#E2564A", "#9B59B6"];

export function QuizResults({
  data,
  lang,
  rtl,
  onRetry,
  onClose,
  onLearnMore,
  onReviewMistakes,
}: {
  data: ResultsData;
  lang: LangKey;
  rtl: boolean;
  onRetry: () => void;
  onClose: () => void;
  onLearnMore?: (categoryId: string) => void;
  onReviewMistakes?: (categoryId: string, wordIds: string[]) => void;
}) {
  const { questions, results, points, bestStreak, mode, categoryId, categoryName } = data;
  const [open, setOpen] = useState<number | null>(null);
  const [confettiOn, setConfettiOn] = useState(true);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "offline">("saving");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setConfettiOn(false), 2000);
    return () => window.clearTimeout(t);
  }, []);

  const total = questions.length;
  const correct = results.filter((r) => r?.correct).length;
  const missed = total - correct;
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const meta = categoryMeta(categoryId);
  const missedWordIds = questions.filter((_, i) => !results[i]?.correct).map((q) => q.word.id);

  const byAttempt = (n: number) => results.filter((r) => r?.correct && r.attempts === n).length;

  // Apply the finished session to the saved profile exactly once.
  const [summary] = useState<SessionSummary>(() =>
    applyQuizSession({ mode, categoryId, points, bestStreak, results, total }),
  );

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackEvent("quiz_completed", {
      category: categoryId,
      score: percent,
      stars: summary.stars,
      totalPoints: summary.totalPoints,
      streak: summary.streakDays,
    });
    summary.newAchievements.forEach((a) => trackEvent("achievement_unlocked", { achievementName: a.title }));
    if (summary.unlockedCategory) trackEvent("category_unlocked", { categoryName: summary.unlockedCategory.name });

    saveSession({
      mode,
      categoryId,
      correct,
      total,
      points: points + summary.dailyBonus,
      stars: summary.stars,
      bestStreak,
      at: Date.now(),
    }).then((r) => setSaveState(r.synced || navigator.onLine ? "saved" : "offline"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const celebration = percent > 80 ? "🎉" : percent >= 60 ? "🌟" : "💪";
  const motivation = useMemo(() => {
    if (percent > 90) return { head: "🎯 Amazing! You're a WORD WIZARD! 🧙", sub: "Perfect effort! Keep learning!", bg: "#63C439" };
    if (percent >= 70) return { head: "💪 Great job! You're getting better!", sub: "You're on the right track!", bg: "#378ADD" };
    return { head: "🌱 Good effort! Let's try again tomorrow.", sub: "Practice makes perfect!", bg: "#F5A623" };
  }, [percent]);

  const achievement = summary.newAchievements[0] ?? null;
  const catPercent = Math.min(100, Math.round((summary.learnedInCategory / summary.categoryGoal) * 100));
  const upcoming = nextCategory(categoryId);

  const breakdown = [
    { key: "a1", label: "Correct on 1st try", n: byAttempt(1), icon: "✓", bg: "#E8F7E1", fg: "#3E7D24", ring: "#63C439" },
    { key: "a2", label: "Correct on 2nd try", n: byAttempt(2), icon: "✓", bg: "#FFF6DC", fg: "#8A6400", ring: "#F5C542" },
    { key: "a3", label: "Correct on 3rd try", n: byAttempt(3), icon: "✓", bg: "#FFEEDC", fg: "#9A4F12", ring: "#F5A623" },
    ...(missed > 0
      ? [{ key: "rev", label: "Needs review", n: missed, icon: "⚠️", bg: "#FDE6E1", fg: "#A6301F", ring: "#E2564A" }]
      : []),
  ];

  return (
    <div className="min-h-dvh bg-[#F7F9F4] pb-16" style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}>
      {confettiOn && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {CONFETTI.map((i) => (
            <span
              key={i}
              className="ww-confetti absolute top-0 block size-2.5 rounded-sm"
              style={{
                left: `${(i * 97) % 100}%`,
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animationDelay: `${(i % 8) * 90}ms`,
                animationDuration: "1.6s",
                ["--ww-drift" as string]: `${((i % 5) - 2) * 30}px`,
              }}
            />
          ))}
        </div>
      )}

      <header className="flex items-center gap-3 bg-[#63C439] px-3 text-white" style={{ minHeight: 60 }}>
        <button
          onClick={onClose}
          aria-label="Back to home"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white"
        >
          <span aria-hidden="true">←</span>
        </button>
        <h1 ref={headingRef} tabIndex={-1} className="text-[22px] font-bold outline-none">
          {mode === "daily" ? "Daily Challenge Results" : "Quiz Results"}
        </h1>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-4">
        <p aria-live="polite" className="sr-only">
          Quiz complete. {correct} of {total} correct, {percent} percent. {summary.pointsEarned} points earned.
        </p>

        {/* 1. Summary card */}
        <section
          aria-labelledby="ww-score-heading"
          className="mt-4 rounded-[20px] p-5 text-center text-white shadow-lg"
          style={{ minHeight: 120, backgroundImage: "linear-gradient(135deg, #63C439 0%, #A8E063 100%)" }}
        >
          <span className="ww-bounce block leading-none" aria-hidden="true" style={{ fontSize: 80 }}>
            {celebration}
          </span>
          <h2 id="ww-score-heading" className="mt-1 font-bold" style={{ fontSize: 32 }}>
            Quiz Complete!
          </h2>
          <p className="mt-1 font-bold text-[#1F5E0C]" style={{ fontSize: 48, lineHeight: 1.1 }}>
            {correct}/{total} Correct! {percent}%
          </p>
          <p className="mt-1" style={{ fontSize: 26, letterSpacing: 2 }}>
            <span aria-hidden="true">
              {"★".repeat(summary.stars)}
              <span className="opacity-40">{"★".repeat(MAX_STARS - summary.stars)}</span>
            </span>
            <span className="sr-only">{summary.stars} of {MAX_STARS} stars earned</span>
          </p>
          <p className="mt-1 font-semibold" style={{ fontSize: 24 }}>
            +{summary.pointsEarned} Points! (Total: {summary.totalPoints})
          </p>
          {summary.dailyBonus > 0 && (
            <p className="mt-1 text-[16px] font-semibold">
              <span aria-hidden="true">✅</span> Today's Daily Challenge complete! +{summary.dailyBonus} bonus points
            </p>
          )}
          <p className="mt-1 text-[16px]">
            <span aria-hidden="true">🔥</span> Best streak this quiz: {bestStreak} · {categoryName}
          </p>
        </section>

        {/* 2. Performance breakdown */}
        <section aria-labelledby="ww-breakdown-heading" className="mt-4">
          <h2 id="ww-breakdown-heading" className="mb-2 text-[18px] font-bold text-[#333]">
            How you did
          </h2>
          <ul className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-4 sm:overflow-visible">
            {breakdown.map((b, i) => (
              <li
                key={b.key}
                className="ww-slide-up min-w-[150px] flex-1 snap-start rounded-[15px] p-4 text-center shadow-sm"
                style={{ background: b.bg, border: `2px solid ${b.ring}`, animationDelay: `${i * 200}ms` }}
              >
                <span aria-hidden="true" style={{ fontSize: 22 }}>{b.icon}</span>
                <p className="font-bold" style={{ fontSize: 48, lineHeight: 1.1, color: b.fg }}>{b.n}</p>
                <p style={{ fontSize: 16, color: b.fg }}>words</p>
                <p className="mt-1 text-[13px] font-semibold" style={{ color: b.fg }}>{b.label}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* 3. Motivational message */}
        <section
          className="mt-4 rounded-[18px] px-5 py-4 text-center text-white shadow-md"
          style={{ background: motivation.bg }}
        >
          <p className="font-bold" style={{ fontSize: 22 }}>{motivation.head}</p>
          <p className="mt-1" style={{ fontSize: 16 }}>{motivation.sub}</p>
        </section>

        {/* 4. Achievement unlock */}
        {achievement && (
          <section
            aria-labelledby="ww-achievement-heading"
            className="ww-drop mt-4 rounded-[18px] border-4 border-[#F5A623] p-5 text-center shadow-lg"
            style={{ backgroundImage: "linear-gradient(135deg, #FFF6DC 0%, #FFE3B0 100%)" }}
          >
            <span className="ww-bounce block leading-none" aria-hidden="true" style={{ fontSize: 60 }}>🏆</span>
            <h2 id="ww-achievement-heading" className="mt-1 text-[18px] font-bold text-[#8A6400]">
              Achievement Unlocked!
            </h2>
            <p className="font-bold text-[#333]" style={{ fontSize: 26 }}>{achievement.title}</p>
            <p className="mt-1 text-[15px] text-[#555]">{achievement.detail}</p>
            <p className="mt-2 text-[15px] font-semibold text-[#8A6400]">
              {summary.wordsToUnlock > 0
                ? `Learn ${summary.wordsToUnlock} more ${summary.wordsToUnlock === 1 ? "word" : "words"} to reach Level 2!`
                : `Next star at ${(summary.stars + 1) * 100} points — keep going!`}
            </p>
          </section>
        )}

        {/* 5. Category progression */}
        <section aria-labelledby="ww-category-heading" className="mt-4 rounded-[18px] bg-white p-4 shadow-sm">
          <h2 id="ww-category-heading" className="text-[18px] font-bold text-[#333]">
            <span aria-hidden="true">{meta.emoji}</span> {meta.name}
          </h2>
          <p className="mt-1 text-[15px] text-[#666]">
            {summary.learnedInCategory}/{summary.categoryGoal} words learned ({catPercent}%)
          </p>
          <div
            className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[#EEE]"
            role="progressbar"
            aria-valuenow={catPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${meta.name} progress: ${catPercent} percent`}
          >
            <div className="ww-fill h-full rounded-full bg-[#63C439]" style={{ ["--ww-fill" as string]: `${catPercent}%` }} />
          </div>
          {upcoming && (
            <p className="mt-2 text-[15px] font-semibold text-[#378ADD]">
              {summary.unlockedCategory
                ? `🎉 ${summary.unlockedCategory.name} is now unlocked!`
                : `Learn ${summary.wordsToUnlock} more ${summary.wordsToUnlock === 1 ? "word" : "words"} to unlock ${upcoming.name}`}
            </p>
          )}
          <p className="mt-2 text-[15px] font-semibold text-[#D85A30]">
            <span aria-hidden="true">🔥</span> Come back tomorrow to keep your {summary.streakDays}-day streak!
          </p>
          <p className="mt-1 text-[13px] text-[#888]">
            {saveState === "saved"
              ? "Results saved."
              : saveState === "offline"
                ? "You're offline — results are saved on this device and will sync later."
                : "Saving your results…"}
          </p>
        </section>

        <section aria-labelledby="ww-review-heading" className="mt-6">
          <h2 id="ww-review-heading" className="mb-2 text-[18px] font-bold text-[#333]">
            Review your answers
          </h2>
          <p className="mb-3 text-[14px] text-[#666]">Tap any question to see the correct answer and why.</p>
          <ul className="flex flex-col gap-3">
            {questions.map((q, i) => {
              const r = results[i];
              const ok = !!r?.correct;
              const isOpen = open === i;
              return (
                <li key={q.word.id} className="overflow-hidden rounded-[15px] bg-white shadow-sm">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`ww-review-panel-${i}`}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#378ADD]"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center text-[18px] font-bold text-white"
                      style={{ background: ok ? "#63C439" : "#D85A30", borderRadius: ok ? 999 : 8 }}
                    >
                      {ok ? "✓" : "✗"}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[16px] font-bold text-[#333]">
                        Question {i + 1} — {q.word.translations.english}
                      </span>
                      <span className="block text-[14px] text-[#666]">
                        {ok ? `Correct on attempt ${r?.attempts ?? 1} · +${r?.points ?? 0} points` : "Missed"}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-[#999]">{isOpen ? "▲" : "▼"}</span>
                  </button>
                  {isOpen && (
                    <div id={`ww-review-panel-${i}`} className="border-t border-[#EEE] bg-[#F0F7FF] px-4 py-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={q.word.imageUrl}
                          alt={q.word.alt}
                          loading="lazy"
                          className="size-20 rounded-[12px] border-4 border-[#63C439] object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                        <p dir={rtl ? "rtl" : "ltr"} className="text-[20px] font-bold text-[#333]">
                          {q.word.translations[lang]}
                        </p>
                      </div>
                      <p className="mt-3 text-[15px] leading-relaxed text-[#444]">
                        {explain(q.word, lang, categoryName)}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* 7. Action buttons */}
        <div className="mx-auto mt-6 flex w-full max-w-[500px] flex-col gap-3 lg:max-w-[600px] lg:flex-row">
          <button
            onClick={() => onLearnMore?.(summary.unlockedCategory?.id ?? categoryId)}
            className="w-full rounded-2xl bg-[#63C439] px-6 text-[18px] font-bold text-white shadow-md transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#378ADD]"
            style={{ minHeight: 80 }}
          >
            <span aria-hidden="true">📚</span> Learn More Words
          </button>
          <button
            onClick={() => missedWordIds.length && onReviewMistakes?.(categoryId, missedWordIds)}
            disabled={missedWordIds.length === 0}
            className="w-full rounded-2xl bg-[#378ADD] px-6 text-[18px] font-bold text-white shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:bg-[#CFE0F2] disabled:text-[#7C93A8] disabled:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#63C439]"
            style={{ minHeight: 80 }}
          >
            <span aria-hidden="true">🔄</span> Review Mistakes
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-[#F5F5F5] px-6 text-[18px] font-bold text-[#333] shadow-md transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#378ADD]"
            style={{ minHeight: 80 }}
          >
            <span aria-hidden="true">🏠</span> Go Home
          </button>
        </div>

        {mode === "practice" && (
          <div className="mx-auto mt-3 w-full max-w-[500px] lg:max-w-[600px]">
            <button
              onClick={onRetry}
              className="w-full rounded-2xl bg-white px-6 py-3 text-[16px] font-bold text-[#63C439] shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#378ADD]"
            >
              Play this quiz again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
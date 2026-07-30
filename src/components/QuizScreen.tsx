import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WORD_CATEGORIES, type Word, type WordCategory } from "@/lib/words";
import { QuizResults, type ResultsData } from "@/components/QuizResults";
import {
  DIFFICULTY,
  buildQuestions,
  clearProgress,
  loadProgress,
  loadSettings,
  loadWords,
  questionsFromProgress,
  readCachedWords,
  saveProgress,
  todayKey,
  type LangKey,
  type Question,
  type QuestionResult,
  type QuizMode,
  type QuizProgress,
  type QuizSettings,
} from "@/lib/quiz-store";

const LANG_BY_CODE: Record<string, LangKey> = { ur: "urdu", hi: "hindi", bn: "bengali", en: "english" };

const QUESTION_TEXT: Record<LangKey, (name: string) => string> = {
  urdu: (n) => (n === "Animals" ? "اس جانور کو کیا کہتے ہیں؟" : "اس کو کیا کہتے ہیں؟"),
  hindi: (n) => (n === "Animals" ? "इस जानवर को क्या कहते हैं?" : "इसे क्या कहते हैं?"),
  bengali: (n) => (n === "Animals" ? "এই প্রাণীটিকে কী বলে?" : "এটিকে কী বলে?"),
  english: (n) => (n === "Animals" ? "What is this animal called?" : "What is this called?"),
};

const LETTERS = ["A", "B", "C", "D"];
const POINTS_BY_ATTEMPT = [10, 7, 3];

/** Tiny WebAudio beep. Fails silently — visual feedback never depends on it. */
function playTone(freq: number, ms: number, type: OscillatorType = "sine") {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000 + 0.05);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {}
}

function playWhoosh() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(240, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {}
}

const CONFETTI = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: 5 + Math.random() * 90,
  delay: Math.random() * 200,
  color: ["#63C439", "#378ADD", "#F5A623", "#D85A30", "#9B59B6"][i % 5],
  drift: (Math.random() - 0.5) * 160,
}));

export function QuizScreen({
  categoryId,
  languageCode = "en",
  mode = "practice",
  onClose,
  onFinish,
  onLearnMore,
  onReviewMistakes,
}: {
  categoryId: string;
  languageCode?: string;
  mode?: QuizMode;
  onClose: () => void;
  onFinish?: (result: { points: number; correctFirstTry: number; total: number }) => void;
  onLearnMore?: (categoryId: string) => void;
  onReviewMistakes?: (categoryId: string, wordIds: string[]) => void;
}) {
  const category: WordCategory = WORD_CATEGORIES[categoryId] ?? WORD_CATEGORIES.animals;
  const lang: LangKey = LANG_BY_CODE[languageCode] ?? "english";
  const rtl = lang === "urdu";
  const isDaily = mode === "daily";

  const [settings] = useState<QuizSettings>(() => loadSettings());
  const difficulty = DIFFICULTY[settings.ageRange];
  const maxAttempts = isDaily ? 1 : difficulty.attempts;
  const allowJump = settings.allowJump && !isDaily;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [resumed, setResumed] = useState(false);

  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0); // 0-based attempts used
  const [picked, setPicked] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong" | "revealed">("idle");
  const [visited, setVisited] = useState<number[]>([0]);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [results, setResults] = useState<(QuestionResult | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [pointsBadge, setPointsBadge] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const [imgError, setImgError] = useState(false);
  const [firstTryCount, setFirstTryCount] = useState(0);

  const advanceTimer = useRef<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  /* ---------- offline-first load / resume ---------- */
  const startFresh = useCallback(
    (words: Word[]) => {
      const qs = buildQuestions(words, {
        count: difficulty.questions,
        optionCount: difficulty.options,
        seed: isDaily ? `daily-${categoryId}-${todayKey()}` : undefined,
      });
      setQuestions(qs);
      setResults(new Array(qs.length).fill(null));
      setIndex(0);
      setAttempt(0);
      setPicked(null);
      setStatus("idle");
      setVisited([0]);
      setPoints(0);
      setStreak(0);
      setBestStreak(0);
      setFirstTryCount(0);
      setShowResults(false);
      clearProgress(mode, categoryId);
    },
    [categoryId, difficulty.options, difficulty.questions, isDaily, mode],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { words, source } = await loadWords(categoryId);
      if (cancelled) return;
      setOffline(source !== "remote" && !navigator.onLine);

      const saved = loadProgress(mode, categoryId);
      if (saved && saved.languageCode === languageCode && saved.ageRange === settings.ageRange) {
        const restored = questionsFromProgress(saved, words.length ? words : readCachedWords(categoryId) ?? []);
        if (restored) {
          setQuestions(restored);
          setResults(saved.results ?? new Array(restored.length).fill(null));
          setIndex(Math.min(saved.index, restored.length - 1));
          setPoints(saved.points);
          setStreak(saved.streak);
          setBestStreak(saved.bestStreak ?? saved.streak);
          setVisited(Array.from({ length: Math.min(saved.index, restored.length - 1) + 1 }, (_, i) => i));
          setShowResults(!!saved.finished);
          setResumed(saved.index > 0 || !!saved.finished);
          setReady(true);
          return;
        }
      }
      startFresh(words);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, mode, languageCode]);

  const q = questions[index];
  const total = questions.length;
  const locked = status === "correct" || status === "revealed";

  const clearTimer = () => {
    if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
    advanceTimer.current = null;
  };

  const goTo = useCallback(
    (i: number) => {
      clearTimer();
      if (i >= total) {
        onFinish?.({ points, correctFirstTry: firstTryCount, total });
        setShowResults(true);
        return;
      }
      setIndex(i);
      setAttempt(0);
      setPicked(null);
      setStatus("idle");
      setPointsBadge(null);
      setImgError(false);
      setVisited((v) => (v.includes(i) ? v : [...v, i]));
      setAnnounce(`Question ${i + 1} of ${total}`);
      headingRef.current?.focus();
    },
    [total, onClose, onFinish, points, firstTryCount],
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);

  useEffect(() => () => clearTimer(), []);
  useEffect(() => setImgError(false), [index]);

  const scheduleAdvance = () => {
    clearTimer();
    advanceTimer.current = window.setTimeout(() => next(), 2000);
  };

  const recordResult = (r: QuestionResult) =>
    setResults((rs) => {
      const next = [...rs];
      next[index] = r;
      return next;
    });

  const handleAnswer = (opt: Word) => {
    if (locked) return;
    setPicked(opt.id);

    if (opt.id === q.word.id) {
      const gained = POINTS_BY_ATTEMPT[Math.min(attempt, 2)];
      setStatus("correct");
      setPoints((p) => p + gained);
      setPointsBadge(gained);
      if (attempt === 0) setFirstTryCount((c) => c + 1);
      recordResult({ wordId: q.word.id, attempts: attempt + 1, correct: true, points: gained });
      if (settings.sound) playTone(500, 200);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
      setAnnounce(`You are correct! ${q.word.translations[lang]} means ${q.word.translations.english}.`);
      if (newStreak > 0 && newStreak % 5 === 0) {
        setPoints((p) => p + 50);
        setBanner(`🔥 ${newStreak} Streak! +50 Bonus Points!`);
      }
      if (index === total - 1 && firstTryCount + (attempt === 0 ? 1 : 0) === total) {
        setBanner(`🏆 Perfect! All ${total} correct!`);
      }
      scheduleAdvance();
      return;
    }

    const used = attempt + 1;
    setAttempt(used);
    if (used >= maxAttempts) {
      setStatus("revealed");
      setStreak(0);
      recordResult({ wordId: q.word.id, attempts: used, correct: false, points: 0 });
      if (settings.sound) playWhoosh();
      setAnnounce(`The correct answer is ${q.word.translations[lang]}.`);
      scheduleAdvance();
    } else {
      setStatus("wrong");
      if (settings.sound) playTone(200, 150, "square");
      setAnnounce(`Try again. Attempt ${used + 1} of ${maxAttempts}.`);
      window.setTimeout(() => {
        setStatus("idle");
        setPicked(null);
      }, 900);
    }
  };

  /* ---------- persist progress on every change ---------- */
  useEffect(() => {
    if (!ready || !questions.length) return;
    const payload: QuizProgress = {
      version: 1,
      mode,
      categoryId,
      day: todayKey(),
      languageCode,
      ageRange: settings.ageRange,
      questionIds: questions.map((x) => x.word.id),
      optionIds: questions.map((x) => x.options.map((o) => o.id)),
      index,
      points,
      streak,
      bestStreak,
      results,
      finished: showResults,
      updatedAt: Date.now(),
    };
    saveProgress(payload);
  }, [ready, questions, index, points, streak, bestStreak, results, showResults, mode, categoryId, languageCode, settings.ageRange]);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Banner auto-dismiss
  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 3000);
    return () => window.clearTimeout(t);
  }, [banner]);

  // Points badge cleanup
  useEffect(() => {
    if (pointsBadge == null) return;
    const t = window.setTimeout(() => setPointsBadge(null), 1000);
    return () => window.clearTimeout(t);
  }, [pointsBadge]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const questionText = useMemo(() => QUESTION_TEXT[lang](category.name), [lang, category.name]);

  if (showResults && questions.length) {
    const data: ResultsData = {
      questions,
      results,
      points,
      bestStreak,
      finalStreak: streak,
      mode,
      categoryId,
      categoryName: category.name,
    };
    return (
      <QuizResults
        data={data}
        lang={lang}
        rtl={rtl}
        onLearnMore={onLearnMore}
        onReviewMistakes={onReviewMistakes}
        onRetry={() => {
          clearProgress(mode, categoryId);
          startFresh(readCachedWords(categoryId) ?? category.words);
        }}
        onClose={onClose}
      />
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#F7F9F4] text-[18px] font-bold text-[#666]">
        Loading quiz…
      </div>
    );
  }

  if (!q) return null;

  const overlay =
    status === "correct"
      ? { text: `✓ Correct! ${q.word.translations[lang]} means ${q.word.translations.english}! 🐯`, bg: "#63C439", size: 32 }
      : status === "wrong"
        ? { text: "Try again! 🤔", bg: "#D85A30", size: 28 }
        : status === "revealed"
          ? { text: `The correct answer is ${q.word.translations[lang]} 🎓`, bg: "#63C439", size: 28 }
          : null;

  return (
    <div
      className="relative min-h-dvh overflow-hidden bg-[#F7F9F4] pb-10"
      style={{ fontFamily: "'Fredoka', system-ui, sans-serif" }}
      onClick={() => {
        if (locked) next();
      }}
    >
      <p aria-live="assertive" className="sr-only">{announce}</p>

      {/* Achievement banner */}
      {banner && (
        <div
          role="status"
          className="ww-banner fixed inset-x-0 top-0 z-50 bg-[#F5A623] px-4 py-3 text-center text-[20px] font-bold text-white shadow-lg"
        >
          {banner}
        </div>
      )}

      {/* Question section */}
      <header
        className="flex items-center justify-between gap-3 bg-[#F0F7FF] px-[15px]"
        style={{ minHeight: 80 }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Exit practice quiz"
            className="flex size-11 min-w-11 shrink-0 items-center justify-center rounded-full text-2xl text-[#333] hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#63C439]"
          >
            <span aria-hidden="true">←</span>
          </button>
          <span aria-hidden="true" style={{ fontSize: 50, lineHeight: 1 }}>{category.emoji}</span>
          <h1
            ref={headingRef}
            tabIndex={-1}
            dir={rtl ? "rtl" : "ltr"}
            className="font-bold text-[#333] outline-none"
            style={{ fontSize: 20 }}
          >
            {questionText}
          </h1>
        </div>

        {/* Progress dots */}
        <nav aria-label="Question progress" className="shrink-0 text-right">
          <p className="text-[16px] text-[#666]">Question {index + 1}/{total}</p>
          <ul className="mt-1 flex flex-wrap justify-end">
            {questions.map((_, i) => (
              <li key={i}>
                <button
                  onClick={(e) => { e.stopPropagation(); if (allowJump) goTo(i); }}
                  disabled={!allowJump}
                  aria-label={
                    allowJump
                      ? `Go to question ${i + 1} of ${total}`
                      : `Question ${i + 1} of ${total}${i === index ? ", current" : ""}`
                  }
                  aria-current={i === index ? "step" : undefined}
                  className="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#378ADD]"
                >
                  <span
                    aria-hidden="true"
                    className={`block rounded-full border-2 transition ${allowJump ? "hover:scale-110" : ""}`}
                    style={{
                      width: 20,
                      height: 20,
                      background: i === index ? "#63C439" : results[i]?.correct ? "#9BDB7C" : results[i] ? "#E9A48D" : visited.includes(i) ? "#CCC" : "#EEE",
                      borderColor: i === index ? "#63C439" : "#DDD",
                    }}
                  />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto mt-5 w-full max-w-[900px] px-[10px]">
        {(isDaily || offline || resumed) && (
          <p className="mb-3 text-center text-[14px] font-semibold text-[#666]">
            {isDaily && <span className="mr-2 rounded-full bg-[#D85A30] px-3 py-1 text-white">🎯 Daily Challenge · one try per question</span>}
            {offline && <span className="mr-2 rounded-full bg-[#F5A623] px-3 py-1 text-white">📴 Offline — using saved questions</span>}
            {resumed && <span className="rounded-full bg-[#378ADD] px-3 py-1 text-white">↩️ Resumed where you left off</span>}
          </p>
        )}
        {/* Image */}
        <div className="flex justify-center">
          {imgError ? (
            <div
              className="flex items-center justify-center rounded-[15px] border-4 border-[#63C439] bg-white"
              style={{ width: 300, height: 300, boxShadow: "0 4px 8px rgba(0,0,0,0.2)" }}
              role="img"
              aria-label={`${q.word.translations.english} picture unavailable`}
            >
              <span aria-hidden="true" style={{ fontSize: 90 }}>{category.emoji}</span>
            </div>
          ) : (
            <img
              src={q.word.imageUrl}
              alt={q.word.alt}
              onError={() => setImgError(true)}
              className="ww-quiz-img rounded-[15px] border-4 border-[#63C439] object-cover"
              style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.2)" }}
            />
          )}
        </div>

        {/* Options */}
        <ul className="mx-auto mt-6 flex flex-col gap-5 px-[10px] sm:w-4/5 lg:w-3/5">
          {q.options.map((opt, i) => {
            const isPicked = picked === opt.id;
            const isAnswer = opt.id === q.word.id;
            const showCorrect = (status === "correct" && isPicked) || (status === "revealed" && isAnswer);
            const showWrong = status === "wrong" && isPicked;
            const dimmed = status === "correct" && !isPicked;
            return (
              <li key={opt.id}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleAnswer(opt); }}
                  disabled={locked && !showCorrect}
                  className={`ww-opt flex w-full items-center gap-4 rounded-[15px] border-2 px-[15px] text-left transition disabled:cursor-default ${
                    showWrong ? "ww-shake" : ""
                  } ${!locked ? "hover:bg-[#EEE] hover:scale-[1.02] active:scale-105" : ""}`}
                  style={{
                    height: 80,
                    fontSize: 24,
                    fontWeight: 700,
                    background: showCorrect ? "#63C439" : showWrong ? "#D85A30" : dimmed ? "#EDEDED" : "#F5F5F5",
                    borderColor: showCorrect ? "#4EA52C" : showWrong ? "#B3441F" : "#DDD",
                    color: showCorrect || showWrong ? "#fff" : dimmed ? "#999" : "#333",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="flex shrink-0 items-center justify-center bg-[#63C439] text-[20px] font-bold text-white"
                    style={{
                      width: 40,
                      height: 40,
                      // Shape doubles as a colour-blind-safe cue: circle = correct, square = incorrect
                      borderRadius: showWrong ? 6 : 999,
                      background: showCorrect ? "#fff" : showWrong ? "#fff" : "#63C439",
                      color: showCorrect ? "#63C439" : showWrong ? "#D85A30" : "#fff",
                    }}
                  >
                    {showCorrect ? (
                      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path className="ww-check-path" d="M4 12.5 9.5 18 20 6.5" />
                      </svg>
                    ) : showWrong ? (
                      "✗"
                    ) : (
                      LETTERS[i]
                    )}
                  </span>
                  <span dir={rtl ? "rtl" : "ltr"} className={`flex-1 ${rtl ? "text-right" : "text-left"}`}>
                    {opt.translations[lang]}
                  </span>
                  {showCorrect && <span className="text-[20px]" aria-hidden="true">✓</span>}
                  {showWrong && <span className="text-[20px]" aria-hidden="true">✗</span>}
                </button>
              </li>
            );
          })}
        </ul>

        {status === "wrong" && attempt < maxAttempts && (
          <p className="mt-4 text-center text-[16px] font-semibold text-[#666]">
            Attempt {Math.min(attempt + 1, maxAttempts)} of {maxAttempts}
          </p>
        )}
      </main>

      {/* Feedback overlay */}
      {overlay && (
        <div
          className="ww-overlay pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 py-5 text-center font-bold text-white"
          style={{ background: overlay.bg, fontSize: overlay.size }}
        >
          {overlay.text}
        </div>
      )}

      {/* Points badge */}
      {pointsBadge != null && (
        <div className="ww-float pointer-events-none fixed left-1/2 top-1/2 z-50 -translate-x-1/2 rounded-full bg-[#63C439] px-6 py-3 text-[28px] font-bold text-white shadow-xl">
          +{pointsBadge} Points
        </div>
      )}

      {/* Confetti */}
      {status === "correct" && settings.confetti && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
          {CONFETTI.map((c) => (
            <span
              key={c.id}
              className="ww-confetti absolute top-0 block size-2.5 rounded-sm"
              style={{
                left: `${c.left}%`,
                background: c.color,
                animationDelay: `${c.delay}ms`,
                ["--ww-drift" as string]: `${c.drift}px`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

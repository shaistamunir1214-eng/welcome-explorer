import { WORD_CATEGORIES, type Word, type WordCategory } from "@/lib/words";

export type LangKey = "urdu" | "hindi" | "bengali" | "english";
export type QuizMode = "practice" | "daily";
export type AgeRange = "3-5" | "6-8" | "9-12";

export type QuizSettings = {
  ageRange: AgeRange;
  sound: boolean;
  confetti: boolean;
  allowJump: boolean;
};

export const DEFAULT_SETTINGS: QuizSettings = {
  ageRange: "6-8",
  sound: true,
  confetti: true,
  allowJump: true,
};

export const AGE_OPTIONS: { value: AgeRange; label: string; hint: string }[] = [
  { value: "3-5", label: "Ages 3-5", hint: "Easy — 2 choices, 8 questions" },
  { value: "6-8", label: "Ages 6-8", hint: "Medium — 3 choices, 10 questions" },
  { value: "9-12", label: "Ages 9-12", hint: "Hard — 4 choices, 10 questions" },
];

export const DIFFICULTY: Record<AgeRange, { options: number; questions: number; attempts: number }> = {
  "3-5": { options: 2, questions: 8, attempts: 3 },
  "6-8": { options: 3, questions: 10, attempts: 3 },
  "9-12": { options: 4, questions: 10, attempts: 3 },
};

const SETTINGS_KEY = "ww_quiz_settings";
const WORDS_CACHE_KEY = (c: string) => `ww_words_cache_${c}`;

export const todayKey = () => new Date().toISOString().slice(0, 10);

/* ---------- settings ---------- */

export function loadSettings(): QuizSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<QuizSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: QuizSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

/* ---------- offline-first word source ---------- */

/**
 * Offline-first read: try the remote source (Firestore when wired up), fall back
 * to the last cached copy in localStorage, and finally to the bundled seed data.
 * Whatever we successfully read is written back to the cache for the next reload.
 */
export type WordSourceResult = { words: Word[]; source: "remote" | "cache" | "bundled" };

export async function loadWords(
  categoryId: string,
  remote?: (id: string) => Promise<Word[]>,
): Promise<WordSourceResult> {
  const category: WordCategory = WORD_CATEGORIES[categoryId] ?? WORD_CATEGORIES.animals;

  if (remote) {
    try {
      const words = await remote(categoryId);
      if (words?.length) {
        cacheWords(categoryId, words);
        return { words, source: "remote" };
      }
    } catch {
      /* offline / Firestore unavailable — fall through to the cache */
    }
  }

  const cached = readCachedWords(categoryId);
  if (cached?.length) return { words: cached, source: "cache" };

  cacheWords(categoryId, category.words);
  return { words: category.words, source: "bundled" };
}

export function cacheWords(categoryId: string, words: Word[]) {
  try {
    localStorage.setItem(WORDS_CACHE_KEY(categoryId), JSON.stringify({ at: Date.now(), words }));
  } catch {}
}

export function readCachedWords(categoryId: string): Word[] | null {
  try {
    const raw = localStorage.getItem(WORDS_CACHE_KEY(categoryId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { words?: Word[] };
    return parsed?.words?.length ? parsed.words : null;
  } catch {
    return null;
  }
}

/* ---------- question building ---------- */

export type Question = { word: Word; options: Word[] };

/** Deterministic PRNG so the Daily Challenge is identical for everyone today. */
export function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWith<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildQuestions(
  words: Word[],
  opts: { count: number; optionCount: number; seed?: string },
): Question[] {
  const rnd = opts.seed ? seededRandom(opts.seed) : Math.random;
  return shuffleWith(words, rnd)
    .slice(0, opts.count)
    .map((word) => {
      const distractors = shuffleWith(
        words.filter((w) => w.id !== word.id),
        rnd,
      ).slice(0, Math.max(1, opts.optionCount - 1));
      return { word, options: shuffleWith([word, ...distractors], rnd) };
    });
}

/* ---------- explanations ---------- */

export function explain(word: Word, lang: LangKey, categoryName: string): string {
  const native = word.translations[lang];
  const english = word.translations.english;
  if (lang === "english") {
    return `${english} ${word.phonetic} — ${word.alt}. It belongs to ${categoryName}.`;
  }
  return `${native} means ${english} ${word.phonetic}. ${word.alt}. Category: ${categoryName}.`;
}

/* ---------- persisted quiz progress ---------- */

export type QuestionResult = {
  wordId: string;
  attempts: number;
  correct: boolean;
  points: number;
};

export type QuizProgress = {
  version: 1;
  mode: QuizMode;
  categoryId: string;
  day: string;
  languageCode: string;
  ageRange: AgeRange;
  questionIds: string[];
  optionIds: string[][];
  index: number;
  points: number;
  streak: number;
  bestStreak: number;
  results: (QuestionResult | null)[];
  finished: boolean;
  updatedAt: number;
};

export const progressKey = (mode: QuizMode, categoryId: string) =>
  mode === "daily" ? `ww_progress_daily_${categoryId}_${todayKey()}` : `ww_progress_practice_${categoryId}`;

export function saveProgress(p: QuizProgress) {
  try {
    localStorage.setItem(progressKey(p.mode, p.categoryId), JSON.stringify({ ...p, updatedAt: Date.now() }));
  } catch {}
}

export function loadProgress(mode: QuizMode, categoryId: string): QuizProgress | null {
  try {
    const raw = localStorage.getItem(progressKey(mode, categoryId));
    if (!raw) return null;
    const p = JSON.parse(raw) as QuizProgress;
    if (p?.version !== 1 || !p.questionIds?.length) return null;
    return p;
  } catch {
    return null;
  }
}

export function clearProgress(mode: QuizMode, categoryId: string) {
  try {
    localStorage.removeItem(progressKey(mode, categoryId));
  } catch {}
}

/** Rehydrate saved question ids into full questions using the cached word list. */
export function questionsFromProgress(p: QuizProgress, words: Word[]): Question[] | null {
  const byId = new Map(words.map((w) => [w.id, w]));
  const out: Question[] = [];
  for (let i = 0; i < p.questionIds.length; i++) {
    const word = byId.get(p.questionIds[i]);
    const options = (p.optionIds[i] ?? []).map((id) => byId.get(id)).filter(Boolean) as Word[];
    if (!word || options.length < 2) return null;
    out.push({ word, options });
  }
  return out;
}

export const starsFor = (points: number) => Math.floor(points / 100);
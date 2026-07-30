import { WORD_CATEGORIES } from "@/lib/words";
import { todayKey, type QuestionResult, type QuizMode } from "@/lib/quiz-store";

/* ------------------------------------------------------------------ */
/* Category progression                                                */
/* ------------------------------------------------------------------ */

export type CategoryMeta = { id: string; emoji: string; name: string; goal: number };

/** Ordered progression. `goal` = words to learn before the next one unlocks. */
export const CATEGORY_ORDER: CategoryMeta[] = [
  { id: "animals", emoji: "🐾", name: "Animals", goal: 10 },
  { id: "fruits", emoji: "🍎", name: "Fruits", goal: 10 },
  { id: "colors", emoji: "🌈", name: "Colors", goal: 10 },
  { id: "numbers", emoji: "1️⃣", name: "Numbers", goal: 10 },
  { id: "alphabet", emoji: "🔤", name: "Alphabet", goal: 26 },
  { id: "vehicles", emoji: "🚗", name: "Vehicles", goal: 10 },
  { id: "objects", emoji: "🏠", name: "Everyday Objects", goal: 12 },
];

export const categoryMeta = (id: string): CategoryMeta =>
  CATEGORY_ORDER.find((c) => c.id === id) ?? {
    id,
    emoji: WORD_CATEGORIES[id]?.emoji ?? "📚",
    name: WORD_CATEGORIES[id]?.name ?? id,
    goal: 10,
  };

export const nextCategory = (id: string): CategoryMeta | null => {
  const i = CATEGORY_ORDER.findIndex((c) => c.id === id);
  return i >= 0 && i < CATEGORY_ORDER.length - 1 ? CATEGORY_ORDER[i + 1] : null;
};

/* ------------------------------------------------------------------ */
/* Persisted player profile (offline-first)                            */
/* ------------------------------------------------------------------ */

export type Achievement = { id: string; title: string; detail: string; at: number };

export type Profile = {
  version: 1;
  totalPoints: number;
  stars: number;
  streakDays: number;
  lastPlayDay: string | null;
  learned: Record<string, string[]>; // categoryId -> word ids mastered
  unlocked: string[];
  achievements: Achievement[];
  dailyBonusDay: string | null;
};

const PROFILE_KEY = "ww_profile";
const SESSIONS_KEY = "ww_pending_sessions";
const EVENTS_KEY = "ww_pending_events";

export const MAX_STARS = 5;
export const DAILY_BONUS = 50;

export const emptyProfile = (): Profile => ({
  version: 1,
  totalPoints: 0,
  stars: 0,
  streakDays: 0,
  lastPlayDay: null,
  learned: {},
  unlocked: ["animals"],
  achievements: [],
  dailyBonusDay: null,
});

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return emptyProfile();
    const p = JSON.parse(raw) as Profile;
    return p?.version === 1 ? { ...emptyProfile(), ...p } : emptyProfile();
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {}
}

const yesterdayKey = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Offline-safe queues (Firestore writes retry on the next sync)       */
/* ------------------------------------------------------------------ */

function pushQueue(key: string, item: unknown) {
  try {
    const list = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown[];
    list.push(item);
    localStorage.setItem(key, JSON.stringify(list.slice(-50)));
  } catch {}
}

export function readQueue<T>(key: "sessions" | "events"): T[] {
  try {
    return JSON.parse(localStorage.getItem(key === "sessions" ? SESSIONS_KEY : EVENTS_KEY) ?? "[]") as T[];
  } catch {
    return [];
  }
}

const DEDUPE_KEY = "ww_recent_events";

function isDuplicate(sig: string): boolean {
  const now = Date.now();
  try {
    const map = JSON.parse(localStorage.getItem(DEDUPE_KEY) ?? "{}") as Record<string, number>;
    if ((map[sig] ?? 0) > now - 5000) return true;
    const fresh: Record<string, number> = { [sig]: now };
    for (const [k, v] of Object.entries(map)) if (v > now - 60_000) fresh[k] = v;
    localStorage.setItem(DEDUPE_KEY, JSON.stringify(fresh));
  } catch {}
  return false;
}

/** Analytics event. Fires to the remote sink when available, always queued locally. */
export function trackEvent(name: string, params: Record<string, unknown>) {
  // Guard against duplicate fires (React strict-mode remounts, re-entering results).
  const sig = `${name}:${JSON.stringify(params)}`;
  if (isDuplicate(sig)) return;
  const evt = { name, params, at: Date.now(), synced: false };
  const g = globalThis as unknown as { gtag?: (...a: unknown[]) => void };
  try {
    g.gtag?.("event", name, params);
    evt.synced = true;
  } catch {}
  pushQueue(EVENTS_KEY, evt);
}

export type SessionRecord = {
  mode: QuizMode;
  categoryId: string;
  correct: number;
  total: number;
  points: number;
  stars: number;
  bestStreak: number;
  at: number;
};

/**
 * "Save to Firestore" hook. Cloud is not wired up yet, so every session is
 * written to the local queue and marked unsynced; the next sync drains it.
 */
export async function saveSession(
  record: SessionRecord,
  remote?: (r: SessionRecord) => Promise<void>,
): Promise<{ synced: boolean }> {
  if (remote && navigator.onLine) {
    try {
      await remote(record);
      return { synced: true };
    } catch {
      /* fall through to the offline queue */
    }
  }
  pushQueue(SESSIONS_KEY, record);
  return { synced: false };
}

/* ------------------------------------------------------------------ */
/* Applying a finished quiz to the profile                             */
/* ------------------------------------------------------------------ */

export type SessionSummary = {
  pointsEarned: number;
  dailyBonus: number;
  totalPoints: number;
  starsBefore: number;
  stars: number;
  starGained: boolean;
  streakDays: number;
  streakContinued: boolean;
  learnedInCategory: number;
  categoryGoal: number;
  newAchievements: Achievement[];
  unlockedCategory: CategoryMeta | null;
  wordsToUnlock: number;
};

export type ApplyInput = {
  mode: QuizMode;
  categoryId: string;
  points: number;
  bestStreak: number;
  results: (QuestionResult | null)[];
  total: number;
};

const applyKey = (i: ApplyInput) => `ww_applied_${i.mode}_${i.categoryId}_${todayKey()}_${i.total}`;

/**
 * Idempotent: re-opening a finished results screen must not double-count points.
 */
export function applyQuizSession(input: ApplyInput): SessionSummary {
  const meta = categoryMeta(input.categoryId);
  const correctIds = input.results.filter((r) => r?.correct).map((r) => r!.wordId);
  const already = (() => {
    try {
      return localStorage.getItem(applyKey(input)) === "1";
    } catch {
      return false;
    }
  })();

  const before = loadProfile();
  const p: Profile = { ...before, learned: { ...before.learned }, achievements: [...before.achievements] };
  const day = todayKey();
  const dailyBonus = input.mode === "daily" && p.dailyBonusDay !== day ? DAILY_BONUS : 0;

  if (!already) {
    p.totalPoints += input.points + dailyBonus;
    if (dailyBonus) p.dailyBonusDay = day;

    const set = new Set([...(p.learned[meta.id] ?? []), ...correctIds]);
    p.learned[meta.id] = [...set];

    if (p.lastPlayDay !== day) {
      p.streakDays = p.lastPlayDay === yesterdayKey() ? p.streakDays + 1 : 1;
      p.lastPlayDay = day;
    }
  }

  const starsBefore = before.stars;
  p.stars = Math.min(MAX_STARS, Math.floor(p.totalPoints / 100));

  const learnedInCategory = (p.learned[meta.id] ?? []).length;
  const newAchievements: Achievement[] = [];
  const award = (id: string, title: string, detail: string) => {
    if (p.achievements.some((a) => a.id === id)) return;
    const a = { id, title, detail, at: Date.now() };
    p.achievements.push(a);
    newAchievements.push(a);
  };

  if (learnedInCategory >= meta.goal) award(`${meta.id}-expert`, `${meta.name} Expert!`, `Learned ${meta.goal} words in the ${meta.name} category`);
  if (input.results.length > 0 && correctIds.length === input.total && input.total > 0)
    award(`perfect-${meta.id}`, "Perfect Score!", `Answered all ${input.total} ${meta.name} questions correctly`);
  if (input.bestStreak >= 5) award("streak-5", "Streak Star!", "Answered 5 questions correctly in a row");
  if (p.stars >= MAX_STARS) award("five-stars", "Five Star Wizard!", "Collected all 5 stars");

  let unlockedCategory: CategoryMeta | null = null;
  const nxt = nextCategory(meta.id);
  if (nxt && learnedInCategory >= meta.goal && !p.unlocked.includes(nxt.id)) {
    p.unlocked = [...p.unlocked, nxt.id];
    unlockedCategory = nxt;
  }

  saveProfile(p);
  if (!already) {
    try {
      localStorage.setItem(applyKey(input), "1");
    } catch {}
  }

  return {
    pointsEarned: input.points,
    dailyBonus,
    totalPoints: p.totalPoints,
    starsBefore,
    stars: p.stars,
    starGained: p.stars > starsBefore,
    streakDays: p.streakDays,
    streakContinued: before.lastPlayDay !== day,
    learnedInCategory,
    categoryGoal: meta.goal,
    newAchievements,
    unlockedCategory,
    wordsToUnlock: Math.max(0, meta.goal - learnedInCategory),
  };
}
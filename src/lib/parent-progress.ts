/**
 * Parent dashboard data (read-only, MVP).
 *
 * Privacy: only day-level aggregates are exposed — never timestamps or
 * granular session logs. Days are resolved in the parent's own timezone.
 */

export type DayProgress = {
  /** ISO date (YYYY-MM-DD) in the parent's timezone */
  date: string;
  words: number;
  minutes: number;
  quizzes: number;
  /** average quiz accuracy for the day, 0-100 */
  accuracy: number;
};

export type CategoryPerformance = {
  name: string;
  emoji: string;
  words: number;
  accuracy: number;
};

export const TIMEZONE_STORAGE_KEY = "ww_parent_timezone";

/** A short, parent-friendly list plus whatever the browser detects. */
export const COMMON_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

/** The timezone the browser reports, used as the default. */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** Load the parent's saved timezone, falling back to the detected one. */
export function loadTimezone(): string {
  try {
    const saved = localStorage.getItem(TIMEZONE_STORAGE_KEY);
    if (saved && isValidTimezone(saved)) return saved;
  } catch {}
  return detectTimezone();
}

export function saveTimezone(tz: string) {
  try {
    localStorage.setItem(TIMEZONE_STORAGE_KEY, tz);
  } catch {}
}

/** ISO date key (YYYY-MM-DD) for an instant, resolved in a given timezone. */
export function dateKeyInTz(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }
}

/** Human label for an ISO date key, e.g. "Thursday, July 30". */
export function formatDateKey(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Clock time of an instant in the parent's timezone (used for "last updated"). */
export function formatTimeInTz(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export function formatMinutes(total: number): string {
  if (total <= 0) return "0 minutes";
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hours = h ? `${h} hour${h > 1 ? "s" : ""}` : "";
  const mins = m ? `${m} minute${m > 1 ? "s" : ""}` : "";
  return [hours, mins].filter(Boolean).join(" ");
}

/**
 * Deterministic sample history so the dashboard renders the same numbers on
 * the server and after hydration. Index 0 = 29 days ago, last = today.
 */
const PATTERN: Array<[words: number, minutes: number, quizzes: number, accuracy: number]> = [
  [2, 10, 1, 60], [3, 14, 2, 65], [0, 0, 0, 0], [1, 8, 1, 55], [4, 18, 2, 70],
  [2, 12, 1, 62], [0, 0, 0, 0], [3, 15, 2, 68], [5, 22, 3, 72], [2, 11, 1, 66],
  [4, 19, 2, 74], [0, 0, 0, 0], [3, 16, 2, 70], [6, 25, 3, 76], [2, 13, 1, 69],
  [4, 20, 2, 78], [3, 15, 2, 73], [0, 0, 0, 0], [5, 21, 3, 80], [4, 18, 2, 75],
  [2, 12, 1, 71], [6, 24, 3, 82], [3, 16, 2, 77], [4, 17, 2, 79], [3, 15, 2, 74],
  [5, 20, 3, 83], [0, 0, 0, 0], [4, 18, 2, 80], [6, 22, 3, 85], [5, 15, 2, 80],
];

/**
 * Last 30 days of day-level progress, ending on "today" as seen from the
 * parent's timezone. `todayKey` comes from `dateKeyInTz`, so the last row
 * shifts as soon as the parent changes their timezone.
 */
export function buildHistory(todayKey: string): DayProgress[] {
  const [y, m, d] = todayKey.split("-").map(Number);
  return PATTERN.map((p, i) => {
    const day = new Date(y, m - 1, d - (PATTERN.length - 1 - i));
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
      day.getDate(),
    ).padStart(2, "0")}`;
    return { date: key, words: p[0], minutes: p[1], quizzes: p[2], accuracy: p[3] };
  });
}

export function weekSlice(history: DayProgress[]): DayProgress[] {
  return history.slice(-7);
}

export function weekTotals(week: DayProgress[]) {
  const words = week.reduce((s, d) => s + d.words, 0);
  const minutes = week.reduce((s, d) => s + d.minutes, 0);
  const quizzes = week.reduce((s, d) => s + d.quizzes, 0);
  const scored = week.filter((d) => d.quizzes > 0);
  const avg = scored.length
    ? Math.round(scored.reduce((s, d) => s + d.accuracy, 0) / scored.length)
    : 0;
  return { words, minutes, quizzes, avg };
}

/** Consecutive active days ending today. */
export function currentStreak(history: DayProgress[]): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].words > 0) streak++;
    else break;
  }
  return streak;
}

export const CATEGORY_PERFORMANCE: CategoryPerformance[] = [
  { name: "Animals", emoji: "🐘", words: 10, accuracy: 85 },
  { name: "Fruits", emoji: "🍎", words: 5, accuracy: 70 },
  { name: "Colours", emoji: "🎨", words: 5, accuracy: 78 },
  { name: "Numbers", emoji: "🔢", words: 3, accuracy: 66 },
];

/** Week-over-week quiz accuracy change, rounded to whole percent. */
export function accuracyTrend(history: DayProgress[]): number {
  const avgOf = (days: DayProgress[]) => {
    const scored = days.filter((d) => d.quizzes > 0);
    return scored.length ? scored.reduce((s, d) => s + d.accuracy, 0) / scored.length : 0;
  };
  const thisWeek = avgOf(history.slice(-7));
  const lastWeek = avgOf(history.slice(-14, -7));
  if (!lastWeek) return 0;
  return Math.round(thisWeek - lastWeek);
}

/**
 * Progress report CSV. Section 1 mirrors every day-level figure shown on the
 * dashboard (Today + This Week + Analytics daily series); section 2 mirrors the
 * category performance cards. The report header states the exact date range and
 * the timezone those days were resolved in.
 */
export function toCsv(
  history: DayProgress[],
  opts: { timezone: string; generatedAt: Date; categories?: CategoryPerformance[] },
): string {
  const categories = opts.categories ?? CATEGORY_PERFORMANCE;
  const first = history[0]?.date ?? "";
  const last = history[history.length - 1]?.date ?? "";
  const week = weekSlice(history);
  const totals = weekTotals(week);

  const lines: string[] = [
    "Word Wizard — progress report",
    `Date range,${first} to ${last}`,
    `Days included,${history.length}`,
    `Timezone,${opts.timezone}`,
    `Generated,${dateKeyInTz(opts.generatedAt, opts.timezone)}`,
    "",
    "This week totals",
    "Total words learned,Total minutes spent,Total quizzes,Average score (%)",
    `${totals.words},${totals.minutes},${totals.quizzes},${totals.avg}`,
    "",
    "Daily breakdown",
    "Date,Day,Active,Words learned,Minutes spent,Quizzes taken,Average score (%)",
    ...history.map((d) =>
      [
        d.date,
        weekdayOf(d.date),
        d.words > 0 ? "Yes" : "No",
        d.words,
        d.minutes,
        d.quizzes,
        d.accuracy,
      ].join(","),
    ),
    "",
    "Category performance",
    "Category,Words learned,Accuracy (%)",
    ...categories.map((c) => `${c.name},${c.words},${c.accuracy}`),
  ];

  return lines.join("\n");
}

export function csvFileName(history: DayProgress[]): string {
  const first = history[0]?.date ?? "start";
  const last = history[history.length - 1]?.date ?? "end";
  return `word-wizard-progress_${first}_to_${last}.csv`;
}

export const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayOf(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAY_LABELS[new Date(y, m - 1, d).getDay()];
}

export function shortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${m}/${d}`;
}
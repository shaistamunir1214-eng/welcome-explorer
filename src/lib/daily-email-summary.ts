/**
 * Shape of the daily progress email.
 *
 * Built here (not in the template) so the in-app preview and the real sent
 * email always show identical numbers, date ranges and wording.
 */
import {
  CATEGORY_PERFORMANCE,
  buildHistory,
  currentStreak,
  dateKeyInTz,
  formatDateKey,
  formatMinutes,
  shortDate,
  weekSlice,
  weekTotals,
  weekdayOf,
} from "./parent-progress";

export type DailySummary = {
  subject: string;
  preview: string;
  /** The day the email reports on, in the parent's timezone. */
  todayKey: string;
  todayLabel: string;
  timezone: string;
  today: { words: number; minutes: string; quizzes: number; accuracy: number };
  streak: number;
  /** Two or three short, positive highlights. Never punitive. */
  highlights: string[];
  week: {
    rangeLabel: string;
    words: number;
    minutes: string;
    quizzes: number;
    avgAccuracy: number;
    days: { label: string; date: string; words: number; minutes: string; done: boolean }[];
  };
  categories: { name: string; emoji: string; words: number; accuracy: number }[];
};

export function buildDailySummary(timezone: string, now: Date = new Date()): DailySummary {
  const todayKey = dateKeyInTz(now, timezone);
  const history = buildHistory(todayKey);
  const week = weekSlice(history);
  const totals = weekTotals(week);
  const today = history[history.length - 1];
  const streak = currentStreak(history);
  const best = [...week].sort((a, b) => b.words - a.words)[0];

  const highlights: string[] = [];
  if (today.words > 0) {
    highlights.push(`Learned ${today.words} new word${today.words === 1 ? "" : "s"} today.`);
  } else {
    highlights.push("No words yet today — there's still time for a short session.");
  }
  if (today.quizzes > 0) {
    highlights.push(`Scored ${today.accuracy}% across ${today.quizzes} quiz${today.quizzes === 1 ? "" : "zes"}.`);
  }
  if (streak > 1) highlights.push(`${streak}-day learning streak going strong.`);
  if (best && best.date !== todayKey && best.words > 0) {
    highlights.push(`Best day this week: ${weekdayOf(best.date)} with ${best.words} words.`);
  }

  return {
    subject: `Word Wizard: ${shortDate(todayKey)} progress for your child`,
    preview: `${today.words} words · ${formatMinutes(today.minutes)} · ${streak}-day streak`,
    todayKey,
    todayLabel: formatDateKey(todayKey),
    timezone,
    today: {
      words: today.words,
      minutes: formatMinutes(today.minutes),
      quizzes: today.quizzes,
      accuracy: today.accuracy,
    },
    streak,
    highlights: highlights.slice(0, 3),
    week: {
      rangeLabel: `${shortDate(week[0].date)} – ${shortDate(week[week.length - 1].date)}`,
      words: totals.words,
      minutes: formatMinutes(totals.minutes),
      quizzes: totals.quizzes,
      avgAccuracy: totals.avg,
      days: week.map((d) => ({
        label: weekdayOf(d.date).slice(0, 3),
        date: shortDate(d.date),
        words: d.words,
        minutes: formatMinutes(d.minutes),
        done: d.words > 0,
      })),
    },
    categories: CATEGORY_PERFORMANCE.map((c) => ({ ...c })),
  };
}

import { describe, expect, it, beforeEach } from "vitest";
import { applyQuizSession, loadProfile } from "@/lib/profile";
import { WORD_CATEGORIES } from "@/lib/words";

const results = (n: number) =>
  WORD_CATEGORIES.animals.words.slice(0, n).map((w) => ({ wordId: w.id, attempts: 1, correct: true, points: 10 }));

describe("applyQuizSession", () => {
  beforeEach(() => localStorage.clear());

  it("unlocks the category achievement and next category at 10 words", () => {
    const s = applyQuizSession({ mode: "practice", categoryId: "animals", points: 100, bestStreak: 10, results: results(10), total: 10 });
    expect(s.learnedInCategory).toBe(10);
    expect(s.newAchievements.map((a) => a.id)).toContain("animals-expert");
    expect(s.unlockedCategory?.id).toBe("fruits");
    expect(s.stars).toBe(1);
    expect(s.totalPoints).toBe(100);
  });

  it("does not double-count points when results are re-opened", () => {
    const input = { mode: "practice" as const, categoryId: "animals", points: 70, bestStreak: 3, results: results(7), total: 10 };
    applyQuizSession(input);
    const again = applyQuizSession(input);
    expect(again.totalPoints).toBe(70);
    expect(loadProfile().totalPoints).toBe(70);
  });

  it("adds the daily bonus once per day", () => {
    const input = { mode: "daily" as const, categoryId: "animals", points: 50, bestStreak: 2, results: results(5), total: 10 };
    const first = applyQuizSession(input);
    expect(first.dailyBonus).toBe(50);
    expect(first.totalPoints).toBe(100);
    expect(applyQuizSession(input).dailyBonus).toBe(0);
  });
});

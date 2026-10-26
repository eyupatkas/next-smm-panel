import { describe, expect, it } from "vitest";

import { applyQuestProgress } from "./quest-progress";

describe("applyQuestProgress", () => {
  it("keeps XP below the current level threshold", () => {
    expect(applyQuestProgress(20, 2, 30)).toEqual({ xp: 50, level: 2, leveledUp: false });
  });

  it("carries large rewards across every earned level", () => {
    expect(applyQuestProgress(90, 1, 520)).toEqual({ xp: 10, level: 4, leveledUp: true });
  });
});

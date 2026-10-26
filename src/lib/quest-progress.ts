export function applyQuestProgress(currentXp: number, currentLevel: number, gainedXp: number) {
  let xp = currentXp + gainedXp;
  let level = Math.max(1, currentLevel);
  let leveledUp = false;

  while (xp >= level * 100) {
    xp -= level * 100;
    level += 1;
    leveledUp = true;
  }

  return { xp, level, leveledUp };
}

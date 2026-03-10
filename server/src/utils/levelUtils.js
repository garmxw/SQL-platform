export function calculateLevel(xp) {
  let level = 1;
  let xpNeeded = 100;

  while (xp >= xpNeeded) {
    xp -= xpNeeded;
    level++;
    xpNeeded = 100 * level;
  }
  return level;
}

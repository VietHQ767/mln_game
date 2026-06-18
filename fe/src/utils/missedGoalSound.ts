const MISSED_GOAL_SRC = "/missed_goal.mp3";

export function playMissedGoalSound(volume = 0.15) {
  if (volume <= 0) return;
  const audio = new Audio(MISSED_GOAL_SRC);
  audio.volume = Math.min(1, Math.max(0, volume));
  audio.play().catch(() => {});
}

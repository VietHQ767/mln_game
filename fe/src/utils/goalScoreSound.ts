const GOAL_SOUNDS = ["/goal1.mp3", "/goal2.mp3"] as const;

let nextGoalSoundIndex = 0;

export function playGoalScoreSound(volume = 0.15) {
  if (volume <= 0) return;
  const src = GOAL_SOUNDS[nextGoalSoundIndex];
  nextGoalSoundIndex = (nextGoalSoundIndex + 1) % GOAL_SOUNDS.length;
  const audio = new Audio(src);
  audio.volume = Math.min(1, Math.max(0, volume));
  audio.play().catch(() => {});
}

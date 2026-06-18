const BALL_KICK_SRC = "/soccer_kick.mp3";

export function playBallKickSound(volume = 0.15) {
  if (volume <= 0) return;
  const audio = new Audio(BALL_KICK_SRC);
  audio.volume = Math.min(1, Math.max(0, volume));
  audio.play().catch(() => {});
}

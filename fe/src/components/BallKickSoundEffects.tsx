import { useEffect, useRef } from "react";
import { useAudioSettings } from "../contexts/AudioSettingsContext";
import type { Ball } from "../types";
import { playBallKickSound } from "../utils/ballKickSound";

const KICK_SPEED_THRESHOLD = 5;
const STATIONARY_SPEED = 2.5;
const PLAY_COOLDOWN_MS = 140;

function ballSpeed(ball: Ball) {
  const vx = ball.vx ?? 0;
  const vy = ball.vy ?? 0;
  return Math.hypot(vx, vy);
}

interface BallKickSoundEffectsProps {
  active: boolean;
  ball: Ball;
  ballHolderId: string | null;
}

export default function BallKickSoundEffects({
  active,
  ball,
  ballHolderId
}: BallKickSoundEffectsProps) {
  const { sfxVolume } = useAudioSettings();
  const prevSpeedRef = useRef(0);
  const prevHolderRef = useRef<string | null>(null);
  const lastPlayAtRef = useRef(0);

  useEffect(() => {
    if (!active || sfxVolume <= 0) {
      prevSpeedRef.current = ballSpeed(ball);
      prevHolderRef.current = ballHolderId;
      return;
    }

    const speed = ballSpeed(ball);
    const prevSpeed = prevSpeedRef.current;
    const prevHolder = prevHolderRef.current;
    const now = Date.now();

    const kicked =
      !ballHolderId && speed >= KICK_SPEED_THRESHOLD && prevSpeed < STATIONARY_SPEED;
    const touched = Boolean(ballHolderId) && !prevHolder;

    if ((kicked || touched) && now - lastPlayAtRef.current >= PLAY_COOLDOWN_MS) {
      playBallKickSound(sfxVolume);
      lastPlayAtRef.current = now;
    }

    prevSpeedRef.current = speed;
    prevHolderRef.current = ballHolderId;
  }, [active, ball, ballHolderId, sfxVolume]);

  return null;
}

import { useEffect, useRef } from "react";
import { playButtonSound } from "../utils/buttonSound";

interface ButtonSoundEffectsProps {
  active: boolean;
}

export default function ButtonSoundEffects({ active }: ButtonSoundEffectsProps) {
  const lastButtonRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) {
      lastButtonRef.current = null;
      return;
    }

    const onPointerOver = (event: PointerEvent) => {
      const button = (event.target as Element).closest("button:not(:disabled)");
      if (button && button !== lastButtonRef.current) {
        lastButtonRef.current = button;
        playButtonSound();
      }
    };

    const onPointerOut = (event: PointerEvent) => {
      const related = event.relatedTarget as Element | null;
      const leftButton = (event.target as Element).closest("button");
      if (leftButton && (!related || !leftButton.contains(related))) {
        lastButtonRef.current = null;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const button = (event.target as Element).closest("button:not(:disabled)");
      if (button) playButtonSound();
    };

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("pointerdown", onPointerDown);
      lastButtonRef.current = null;
    };
  }, [active]);

  return null;
}

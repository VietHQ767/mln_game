import { loadSfxVolume } from "./audioSettings";

const BUTTON_CLICK_SRC = "/button_click.mp3";

export function playButtonSound() {
  const audio = new Audio(BUTTON_CLICK_SRC);
  audio.volume = loadSfxVolume();
  audio.play().catch(() => {});
}

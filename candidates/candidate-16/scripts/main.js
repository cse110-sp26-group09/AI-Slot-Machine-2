import { createAccessibilityController } from "./accessibility.js";
import { createAudioController } from "./audio.js";
import { createGameController } from "./game.js";
import { createStorage } from "./storage.js";
import { createUI } from "./ui.js";

function bootstrap() {
  const storage = createStorage();
  const ui = createUI();
  const audio = createAudioController();
  const accessibility = createAccessibilityController();

  const game = createGameController({
    ui,
    audio,
    storage,
    accessibility,
  });

  game.init();
}

window.addEventListener("DOMContentLoaded", bootstrap);

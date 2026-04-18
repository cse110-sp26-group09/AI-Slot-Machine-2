import { createGame } from "./game.js";

function bootstrap() {
  const game = createGame();
  game.init();
}

try {
  bootstrap();
} catch (error) {
  console.error("Failed to start Prompt Palace", error);

  const statusNode = document.getElementById("status-text");
  if (statusNode) {
    statusNode.textContent = "Startup error: check console for details.";
  }
}

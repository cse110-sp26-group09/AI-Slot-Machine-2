(function bootstrapApp(global) {
  "use strict";

  const root = (global.SlotMachine = global.SlotMachine || {});

  global.document.addEventListener("DOMContentLoaded", () => {
    const ui = root.UI.createUI();
    const game = new root.Game.GameController(ui);
    game.init();
  });
})(window);

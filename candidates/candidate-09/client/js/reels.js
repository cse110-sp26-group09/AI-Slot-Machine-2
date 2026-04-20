const cellId = (row, reel) => `${row}-${reel}`;

const createReelCell = ({ symbol, row, reel }) => {
  const cell = document.createElement("div");
  cell.className = "reel-cell";
  cell.dataset.cell = cellId(row, reel);

  const emoji = document.createElement("div");
  emoji.className = "reel-emoji";
  emoji.textContent = symbol.emoji;

  const label = document.createElement("div");
  label.className = "reel-label";
  label.textContent = symbol.label;

  cell.append(emoji, label);
  return cell;
};

const renderGrid = ({ container, grid, symbolsById, winningPositions }) => {
  container.replaceChildren();
  const winningSet = new Set(winningPositions);
  grid.forEach((rowValues, row) => {
    rowValues.forEach((symbolId, reel) => {
      const symbol = symbolsById.get(symbolId);
      const cell = createReelCell({ symbol, row, reel });
      if (winningSet.has(cellId(row, reel))) {
        cell.classList.add("winning");
      }
      container.appendChild(cell);
    });
  });
};

const collectWinningPositions = (spinResult, paylines) => {
  const winning = new Set();
  spinResult.winLines.forEach((lineWin) => {
    const payline = paylines[lineWin.lineIndex];
    for (let reel = 0; reel < lineWin.matches; reel += 1) {
      const row = payline[reel];
      winning.add(cellId(row, reel));
    }
  });
  return [...winning];
};

const animateSpin = async ({ container, durationMs }) => {
  container.classList.add("spinning");
  await new Promise((resolve) => window.setTimeout(resolve, durationMs));
  container.classList.remove("spinning");
};

const playCascades = async ({ container, cascades, symbolsById, paylines, durationMs }) => {
  if (!Array.isArray(cascades) || cascades.length === 0) {
    return;
  }
  const cascadeDuration = Math.max(Math.round(durationMs / cascades.length), 1);
  for (const cascade of cascades) {
    const winningPositions = collectWinningPositions({ winLines: cascade.lineWins }, paylines);
    renderGrid({
      container,
      grid: cascade.grid,
      symbolsById,
      winningPositions,
    });
    await new Promise((resolve) => window.setTimeout(resolve, cascadeDuration));
  }
};

export { renderGrid, animateSpin, collectWinningPositions, playCascades };

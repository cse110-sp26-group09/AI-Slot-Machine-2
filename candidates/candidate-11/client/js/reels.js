const wait = (durationMs) => new Promise((resolve) => window.setTimeout(resolve, durationMs));

const readDuration = (element, variableName) => {
  const rawValue = getComputedStyle(element).getPropertyValue(variableName).trim();
  if (!rawValue) {
    return 0;
  }

  if (rawValue.endsWith("ms")) {
    return Number.parseFloat(rawValue.replace("ms", ""));
  }

  if (rawValue.endsWith("s")) {
    return Number.parseFloat(rawValue.replace("s", "")) * 1000;
  }

  return Number.parseFloat(rawValue);
};

const positionKey = (row, reel) => `${row}:${reel}`;

export const buildSymbolLookup = (symbols) => {
  return new Map(symbols.map((symbol) => [symbol.id, symbol]));
};

export const renderGrid = ({ container, grid, symbolLookup, winningPositions = [] }) => {
  const winningSet = new Set(winningPositions.map((position) => positionKey(position.row, position.reel)));
  container.replaceChildren();

  for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
    for (let reelIndex = 0; reelIndex < grid[rowIndex].length; reelIndex += 1) {
      const symbolId = grid[rowIndex][reelIndex];
      const symbol = symbolLookup.get(symbolId) ?? { emoji: "?", label: symbolId };
      const cell = document.createElement("article");
      const isWinning = winningSet.has(positionKey(rowIndex, reelIndex));

      cell.className = `reel-cell${isWinning ? " is-winning" : ""}`;
      cell.innerHTML = `<span class="symbol-emoji">${symbol.emoji}</span><span class="symbol-label">${symbol.label}</span>`;
      container.append(cell);
    }
  }
};

export const animateSpinOutcome = async ({ container, symbolLookup, outcome }) => {
  const spinDuration = readDuration(document.documentElement, "--spin-duration");
  const cascadeDuration = readDuration(document.documentElement, "--cascade-duration");
  const flashDuration = readDuration(document.documentElement, "--flash-duration");

  container.classList.add("is-spinning");
  await wait(spinDuration);
  container.classList.remove("is-spinning");

  if (!Array.isArray(outcome.cascades) || outcome.cascades.length === 0) {
    renderGrid({ container, grid: outcome.finalGrid, symbolLookup });
    return;
  }

  for (const cascade of outcome.cascades) {
    renderGrid({
      container,
      grid: cascade.grid,
      symbolLookup,
      winningPositions: outcome.isNetLoss ? [] : cascade.winPositions
    });

    if (!outcome.isNetLoss && Array.isArray(cascade.winPositions) && cascade.winPositions.length > 0) {
      await wait(flashDuration);
    }

    if (Array.isArray(cascade.nextGrid)) {
      container.classList.add("is-cascading");
      renderGrid({ container, grid: cascade.nextGrid, symbolLookup });
      await wait(cascadeDuration);
      container.classList.remove("is-cascading");
    }
  }

  renderGrid({ container, grid: outcome.finalGrid, symbolLookup });
};

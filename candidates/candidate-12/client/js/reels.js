/**
 * @fileoverview Client-side slot machine module.
 * @typedef {Record<string, unknown>} JsonRecord
 * @typedef {(event: Event) => void} EventHandler
 */

function delay(durationMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function positionKey(rowIndex, reelIndex) {
  return `${rowIndex}:${reelIndex}`;
}

function collectWinningPositionSet(lineWins) {
  const positions = new Set();
  for (const lineWin of lineWins) {
    for (const [rowIndex, reelIndex] of lineWin.positions) {
      positions.add(positionKey(rowIndex, reelIndex));
    }
  }
  return positions;
}

export function createReelRenderer({ container, symbols, cascadeStepMs }) {
  const symbolMap = new Map(symbols.map((symbol) => [symbol.id, symbol]));
  const cellElements = [];

  function mountGrid(rows, reels) {
    container.innerHTML = '';
    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const rowCells = [];
      for (let reelIndex = 0; reelIndex < reels; reelIndex += 1) {
        const cell = document.createElement('article');
        cell.className = 'reel-cell';

        const emoji = document.createElement('span');
        emoji.className = 'reel-cell__emoji';

        const label = document.createElement('span');
        label.className = 'reel-cell__label';

        cell.append(emoji, label);
        container.appendChild(cell);
        rowCells.push({ cell, emoji, label });
      }
      cellElements.push(rowCells);
    }
  }

  function renderGrid(grid, winningPositions = new Set(), jackpotActive = false) {
    for (let rowIndex = 0; rowIndex < grid.length; rowIndex += 1) {
      for (let reelIndex = 0; reelIndex < grid[rowIndex].length; reelIndex += 1) {
        const symbolId = grid[rowIndex][reelIndex];
        const symbol = symbolMap.get(symbolId);
        const parts = cellElements[rowIndex][reelIndex];
        parts.emoji.textContent = symbol?.emoji || '❓';
        parts.label.textContent = symbol?.label || 'Unknown';

        parts.cell.classList.remove('reel-cell--win');
        parts.cell.classList.remove('reel-cell--jackpot');
        if (winningPositions.has(positionKey(rowIndex, reelIndex))) {
          parts.cell.classList.add('reel-cell--win');
          if (jackpotActive) {
            parts.cell.classList.add('reel-cell--jackpot');
          }
        }
      }
    }
  }

  async function playSpinAnimation(spinDurationMs) {
    for (const rowCells of cellElements) {
      for (const parts of rowCells) {
        parts.cell.classList.add('reel-cell--spinning');
      }
    }

    await delay(spinDurationMs);

    for (const rowCells of cellElements) {
      for (const parts of rowCells) {
        parts.cell.classList.remove('reel-cell--spinning');
      }
    }
  }

  async function playResult(result, spinDurationMs, celebrateWin) {
    await playSpinAnimation(spinDurationMs);

    if (!result || !result.finalGrid) {
      return;
    }

    renderGrid(result.initialGrid);
    await delay(cascadeStepMs);

    for (const cascade of result.cascades) {
      const positionSet = celebrateWin ? collectWinningPositionSet(cascade.lineWins) : new Set();
      renderGrid(cascade.grid, positionSet, result.jackpotWin > 0);
      await delay(cascadeStepMs);
    }

    renderGrid(result.finalGrid);
  }

  return {
    mountGrid,
    renderGrid,
    playResult
  };
}

const wait = (durationMs) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });

const keyForCoordinate = (row, col) => `${row}:${col}`;

export const createReelRenderer = ({ gridElement, rows, cols, symbols }) => {
  const symbolById = new Map(symbols.map((symbol) => [symbol.id, symbol]));
  const cells = [];

  const buildGrid = () => {
    gridElement.innerHTML = "";
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = document.createElement("article");
        cell.className = "reel-cell";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        cell.innerHTML = [
          '<div class="symbol-emoji"></div>',
          '<div class="symbol-text"></div>'
        ].join("");
        gridElement.append(cell);
        cells.push(cell);
      }
    }
  };

  const getCell = (row, col) => cells[row * cols + col];

  const renderGrid = (grid, highlighted = []) => {
    const highlightSet = new Set(highlighted.map((item) => keyForCoordinate(item.row, item.col)));
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = getCell(row, col);
        const symbolId = grid[row][col];
        const symbol = symbolById.get(symbolId);
        const emojiElement = cell.querySelector(".symbol-emoji");
        const textElement = cell.querySelector(".symbol-text");

        emojiElement.textContent = symbol?.emoji ?? "❓";
        textElement.textContent = symbol?.label ?? symbolId;
        cell.classList.toggle("win-cell", highlightSet.has(keyForCoordinate(row, col)));
      }
    }
  };

  const animateSignedRounds = async ({ rounds, spinDurationMs, cascadeStepMs }) => {
    const firstRound = rounds[0];
    if (!firstRound) {
      return;
    }

    gridElement.classList.add("spinning");
    await wait(spinDurationMs);
    gridElement.classList.remove("spinning");
    renderGrid(firstRound.grid, firstRound.winningCoordinates);
    await wait(cascadeStepMs);

    for (let index = 1; index < rounds.length; index += 1) {
      const round = rounds[index];
      renderGrid(round.grid, round.winningCoordinates);
      await wait(cascadeStepMs);
    }
  };

  buildGrid();

  return {
    renderGrid,
    animateSignedRounds
  };
};

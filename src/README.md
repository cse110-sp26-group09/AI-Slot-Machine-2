# Source Code Directory

This directory contains the final slot machine implementation for the AI Slot Machine project.

## Contents

- `index.html` — application entry point and main UI scaffold
- `package.json` — package metadata and local scripts for the `src/` app
- `scripts/` — JavaScript modules that implement game behavior and UI logic
  - `main.js` — application startup, initialization, and wiring
  - `game.js` — core game flow, state transitions, and spin control
  - `reels.js` — reel generation, symbol selection, and outcome handling
  - `payouts.js` — payout rules, score calculations, and win logic
  - `ui.js` — DOM updates, event handling, and display rendering
  - `audio.js` — sound effect playback and audio controls
  - `accessibility.js` — accessibility enhancements and keyboard support
- `styles/` — CSS for layout, visuals, and responsive styling
- `assets/` — shared media and theme resources
  - `audio/` — sound files used by the game
  - `icons/` — icon assets
  - `images/` — image resources
  - `palette.md` — design palette notes
  - `theme-notes.md` — visual and theme guidance

## Purpose

The `src/` directory contains the working game implementation for the selected winner, `candidate-06`.

## Development Expectations

- Keep modules small, focused, and reusable
- Use clear naming for scripts, styles, and assets
- Document non-obvious behavior with comments
- Keep UI updates separated from game logic
- Verify behavior with tests in `tests/`

## How to use

Open `src/index.html` in a browser to run the game locally, or use the repository root scripts if configured to serve the app.

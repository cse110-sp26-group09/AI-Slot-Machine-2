# Token Tycoon Slots

A polished vanilla web slot machine MVP with an AI satire theme.

## Run locally
1. Open `index.html` directly in a browser, or
2. Serve this folder as a static site (`python3 -m http.server`) and open the local URL.

## Structure
- `index.html`: page structure and controls
- `styles/main.css`: visual theme, responsive layout, and animation states
- `scripts/reels.js`: reel symbols and random outcome generation
- `scripts/payouts.js`: payout rules and win/loss result messaging
- `scripts/game.js`: stateful game loop (balance, spins, wins, reset)
- `scripts/ui.js`: DOM rendering, status text, and reel animation
- `scripts/audio.js`: Web Audio API feedback wrapper
- `scripts/main.js`: app bootstrap and event wiring
- `docs/architecture-plan.md`: concise architecture and assumptions

## MVP feature set
- 3 reel spins with animated reveal
- token balance and spin cost
- win/loss resolution with payout logic
- status messaging and visual win/loss pulse
- sound on/off and volume control
- session stats (spins, wins, best win)

## Notes
- No external dependencies, frameworks, backend, or build steps.
- Session state is in-memory only for this first pass.

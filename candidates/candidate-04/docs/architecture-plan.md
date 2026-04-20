# Token Tycoon Slots: MVP Architecture Plan

## Product framing
- Fast play loop for casual users: one-click spin, immediate result, clear status text.
- Visible progression for repeat users: persistent session stats (spins, best win) and consistent feedback.
- AI satire tone: tokens, prompts, model humor in symbols and outcome messaging.

## Core gameplay loop
1. Player clicks Spin.
2. App validates balance and spin state.
3. Spin cost is deducted.
4. Reel symbols are generated.
5. Reel animation plays, then final symbols are revealed.
6. Payout is calculated and balance/stats are updated.
7. UI and audio feedback communicate win/loss.

## Module boundaries
- `scripts/reels.js`: symbol definitions and random reel outcomes.
- `scripts/payouts.js`: pure payout evaluation.
- `scripts/game.js`: game state, spin/reset logic, lifecycle rules.
- `scripts/ui.js`: DOM rendering and animation utilities.
- `scripts/audio.js`: Web Audio API wrapper for sound feedback.
- `scripts/main.js`: app composition and event wiring.

## MVP assumptions
- In-memory session state only (no persistence).
- Web Audio is optional based on browser support.
- No backend, frameworks, or build steps.

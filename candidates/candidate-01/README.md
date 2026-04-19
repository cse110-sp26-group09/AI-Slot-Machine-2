# Token Terminal Slots

A vanilla HTML/CSS/JS slot machine with an AI-token satire theme.

## Phase 1: Product + Engineering Plan

- Deliver a polished MVP with clear controls, readable game state, and satisfying feedback.
- Keep gameplay logic independent from DOM manipulation for maintainability.
- Separate responsibilities into modules:
  - `game` for state + loop
  - `reels` for animation + symbol rendering
  - `payouts` for outcome rules
  - `ui` for event binding + rendering
  - `audio` for Web Audio feedback
- Build so the app runs as a static site (no build tools, no backend).

## Phase 2: File Structure

- `index.html`
- `styles/main.css`
- `scripts/main.js`
- `scripts/game.js`
- `scripts/reels.js`
- `scripts/payouts.js`
- `scripts/ui.js`
- `scripts/audio.js`
- `assets/` (reserved for future audio/visual assets)

## Phase 3: Core Gameplay Loop

1. User selects wager and clicks spin.
2. `SlotGame` validates state and deducts wager.
3. `ReelAnimator` animates 3 reels and resolves final symbols.
4. `evaluateSpin` computes payout and message.
5. `SlotGame` updates balance, stats, and status.
6. UI rerenders and audio feedback is played.

## Phase 4: MVP Implemented

Implemented features:

- 3-reel animated slot behavior
- token balance and wager controls
- spin button with disabled states
- win/loss payout logic with wildcard handling
- visible status messaging with tone styling
- responsive polished visual styling
- basic procedural audio hooks (spin/win/loss), audio toggle, and volume control

## Run Locally

Open `index.html` directly in a browser, or serve this directory with a static file server.

## Assumptions

- Single active payline (middle row / one result set).
- Session state is in-memory only (no persistence yet).
- Audio is optional and depends on browser autoplay/user gesture policies.

## Phase 5: Next Improvements

- Add balance persistence via `localStorage`.
- Add configurable spin speed and animation intensity.
- Add payout-table modal and odds transparency.
- Add unit tests for `evaluateSpin` and game state transitions.
- Add keyboard accessibility refinements and focus ring polish.

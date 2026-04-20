# AI Satire Slot Machine

Server-authoritative satirical slot machine inspired by the vertical-first slot layout style at Hacksaw Gaming.

## Stack
- Frontend: Vanilla JS ES modules + CSS custom properties
- Backend: Node.js + Express + WebSocket (`ws`)
- Build: esbuild minified bundle output in `/build`

## Project Structure
- `server/index.js`: Express routes, security headers, CORS, WebSocket auth/rate-limit
- `server/game.js`: crypto RNG, paylines, cascades, scatter/wild, jackpot, signed spin payloads
- `server/config.js`: single source of truth for RTP, weights, limits, timings, symbols
- `server/session.js`: JWT + fingerprint binding, request HMAC guards, session state helpers
- `client/index.html`: app shell
- `client/js/main.js`: game loop and API integration
- `client/js/reels.js`: grid rendering and animations
- `client/js/ui.js`: controls, modals, audio, status updates
- `client/js/verify.js`: client-side HMAC payload verification
- `client/css/*.css`: variables/layout/animations/components
- `scripts/build.mjs`: production bundling/minification

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run in development:
   ```bash
   npm run dev
   ```
3. Open:
   ```
   http://localhost:3000
   ```

## Production Build
1. Build client assets:
   ```bash
   npm run build
   ```
2. Start server:
   ```bash
   npm start
   ```

When `/build/index.html` exists, the server serves `/build`; otherwise it serves `/client`.

## Environment Variables
- `PORT` (default: `3000`)
- `JWT_SECRET` (required in real deployment)
- `FINGERPRINT_SALT` (required in real deployment)
- `SERVER_HMAC_SECRET` (required in real deployment)
- `CORS_WHITELIST` (comma separated origins)
- `RTP` (default: `0.96`)
- `BET_MIN` / `BET_MAX` / `BET_STEP`
- `AUTOPLAY_CAP` (default: `50`)
- `SPIN_FLOOR_MS` (default: `2500`)
- `NORMAL_SPIN_MS` (default: `2500`)
- `TURBO_SPIN_MS` (default: `1000`)
- `REALITY_CHECK_MINUTES` (default: `60`)
- `SESSION_DEPOSIT_LIMIT`
- `NEAR_MISS_FREQUENCY`
- `WS_RATE_PER_MINUTE` (default: `30`)

All gameplay/security/compliance constants live in `server/config.js`.

## Compliance Notes
- Autoplay hard cap enforced server-config side (`AUTOPLAY_CAP`)
- Spin floor enforced server-side (`SPIN_FLOOR_MS`)
- Age gate modal required before session start
- Reality-check modal shown at 60 minutes and blocks controls until acknowledged
- Session spend tracker always visible
- Session deposit limit enforced server-side before each paid spin
- Self-exclusion flag checked before every spin
- Net-loss spins do not trigger win sound; near-miss uses a separate tone
- Spin outcomes generated only on server via `crypto.randomInt()`
- Every protected POST requires a valid HMAC request guard
- Every signed server payload is HMAC-verified by client before animation
- JWT sessions expire in 15 minutes and are bound to IP + user-agent fingerprint
- WebSocket requires session auth and is rate-limited to 30 requests/minute

## Notes
- This is satire software, not real-money gambling.
- For deployment, replace all default security secrets and tighten CORS to trusted origins only.

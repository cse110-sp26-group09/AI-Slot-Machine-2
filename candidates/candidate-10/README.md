# AI Satire Slot Machine

Satirical full-stack slot machine where AI logos, buzzwords, and hype cycles are the symbols.
All game outcomes are server-side, signed, and verified client-side before animation.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Optional: create `.env` values (or export env vars directly). See **Environment Variables**.
3. Run development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`.

## Production Build

```bash
npm run build
```

Build artifacts are output to `/build`:
- `build/index.html`
- `build/js/main.js` (bundled, minified, identifier-mangled)
- `build/css/*`

## Environment Variables

Server/security:
- `PORT` (default `3000`)
- `CORS_ORIGINS` (comma-separated whitelist)
- `JWT_SECRET`
- `JWT_EXPIRY_MINUTES` (default `15`)
- `FINGERPRINT_PEPPER`
- `STATE_HMAC_SECRET`
- `RESULT_HMAC_SECRET`

Game/compliance:
- `RTP` (default `0.96`)
- `MIN_BET`, `MAX_BET`, `BET_STEP`
- `SPIN_FLOOR_MS` (default `2500`)
- `TURBO_SPIN_MS` (default `1000`)
- `AUTOPLAY_MAX_SPINS` (default `50`)
- `NEAR_MISS_FREQUENCY`
- `JACKPOT_RATE` (default `0.01`)
- `JACKPOT_SEED`
- `FREE_SPINS_AWARDED` (default `10`)
- `FREE_SPINS_MULTIPLIER` (default `2`)
- `REALITY_CHECK_MINUTES` (default `60`)
- `SESSION_DEPOSIT_LIMIT`
- `MINIMUM_AGE`
- `WS_RATE_LIMIT_PER_MINUTE` (default `30`)
- `DEFAULT_DEPOSIT`

All gameplay constants live in [server/config.js](/C:/Users/alexi/OneDrive/Desktop/CSE%20110/AI-Slot-Machine-2/candidates/candidate-10/server/config.js).

## Compliance Notes

- Session token is JWT with 15-minute expiry and fingerprint binding (`IP + user-agent` hash).
- Every authenticated POST validates an `X-State-Signature` HMAC of current session state.
- Spin outcomes are generated server-side via `crypto.randomInt()` and signed (`HMAC-SHA256`).
- Client verifies signed spin payload before rendering animation.
- WebSocket is authenticated per session and rate-limited to `30 req/min`.
- Autoplay has hard cap (`50`) and requires explicit user-entered count.
- Spin floor is enforced server-side (`SPIN_FLOOR_MS`).
- Reality check modal appears at 60 minutes and requires acknowledgement.
- Session spend tracker is always visible.
- Self-exclusion is checked before every spin.
- Session deposit limit is enforced server-side.
- CSP and strict CORS whitelist are enabled; no inline scripts are used.

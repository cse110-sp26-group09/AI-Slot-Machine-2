# AI Satire Slot Machine

Full-stack satire slot machine with server-authoritative outcomes, HMAC-signed spins, JWT sessions, and a mobile-first UI.

## Stack

- Frontend: Vanilla JS (ES modules), CSS custom properties
- Backend: Node.js + Express + `ws`
- Build: esbuild (bundled, minified identifier-mangled output)

## Project Structure

- `server/index.js` Express app, REST routes, WebSocket auth + rate limiting
- `server/game.js` RNG, paylines, cascades, free spins, jackpot, spin/result signing
- `server/config.js` all gameplay/security/compliance constants
- `server/session.js` JWT + fingerprint session management
- `client/index.html` shell + modals
- `client/js/main.js` game loop + API + autoplay + compliance flow
- `client/js/reels.js` reel rendering/animation
- `client/js/ui.js` controls, modals, Web Audio
- `client/js/verify.js` request/result HMAC helpers
- `client/css/variables.css` all style tokens and timings
- `client/css/layout.css`, `animations.css`, `components.css` UI implementation
- `scripts/build.mjs` production build pipeline
- `build/` generated production assets

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run development server:

```bash
npm run dev
```

3. Open:

```text
http://localhost:3000
```

4. Build production assets:

```bash
npm run build
```

5. Run production mode (serves `/build`):

```bash
npm run start
```

## Environment Variables

- `PORT` default `3000`
- `NODE_ENV` `development` or `production`
- `JWT_SECRET` secret for session tokens
- `JWT_EXPIRY_SECONDS` default `900` (15 minutes)
- `FINGERPRINT_SALT` salt for IP+UA fingerprint hash
- `CORS_WHITELIST` comma-separated allowed origins
- `REQUEST_SIGNATURE_WINDOW_MS` default `300000`
- `NONCE_TTL_MS` default `600000`
- `WS_RATE_LIMIT_PER_MINUTE` default `30`

Gameplay/compliance tunables (all default in `server/config.js`):

- RTP target, symbol weights, payouts, paylines
- Near-miss frequency
- Spin floor, animation durations, turbo duration
- Free spin trigger/award/multiplier
- Jackpot seed/reset/contribution
- Bet min/max/step
- Deposit limit, top-up amount
- Reality-check interval
- Autoplay cap

## Security Notes

- Server-side RNG only via `crypto.randomInt`
- Spin outcomes signed by HMAC-SHA256 before response
- Client verifies spin signature before any reel animation
- Protected POST routes require request HMAC headers; invalid signatures are rejected
- JWT sessions expire every 15 minutes and are bound to fingerprint (`IP + User-Agent + salt`)
- CORS is whitelist-only
- CSP forbids inline scripts (`script-src 'self'`)
- WebSocket `/ws` requires authenticated session token and is limited to 30 messages/minute

## Responsible Gambling Compliance Notes

- Age gate blocks first render until user confirmation
- Autoplay requires explicit limit input and caps at 50
- Server enforces spin floor (`SPIN_FLOOR_MS` default `2500`)
- Reality check modal appears every 60 minutes and blocks play until acknowledged
- Self-exclusion flag enforced server-side before every spin
- Session deposit limit enforced server-side
- Net-loss spins suppress celebratory win effects/sounds
- Near-miss audio only plays on configured near-miss events

## Satire Theme

Symbols include GPT-5, Claude, Gemini, Grok, Disruption, 10x Engineer, Pivot, AGI Soon, Hallucination (wild), and Prompt (scatter), with dry hype-cycle win messaging.

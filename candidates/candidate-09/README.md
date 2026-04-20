# Candidate 09: AI Satire Slots

Full-stack satirical slot machine with a strict client/server split.  
Design direction is mobile-first with dark palette, minimal chrome, pill controls, and punchy win states.

## Stack

- Frontend: Vanilla JS (ES modules), CSS custom properties
- Backend: Node.js + Express + WebSocket (`ws`)
- Build: esbuild (minified, identifier-minified bundle output to `build/`)

## Project Structure

```text
/server
  index.js
  game.js
  config.js
  session.js
/client
  index.html
  /js
    main.js
    reels.js
    ui.js
    verify.js
  /css
    variables.css
    layout.css
    animations.css
    components.css
/build
```

## Setup

1. Install dependencies:
```bash
npm install
```
2. Set environment variables (example values):
```bash
JWT_SECRET=replace_with_secure_secret
PORT=8787
ALLOWED_ORIGINS=http://localhost:8787
```
3. Run development server:
```bash
npm run dev
```
4. Open:
```text
http://localhost:8787
```

## Build (Minified/Obfuscated Output)

```bash
npm run build
```

Build artifacts are generated in `/build`:
- `build/js/main.js` (bundled + minified + identifier-minified)
- `build/css/*.css` (minified)
- `build/index.html`

## Security and Fairness Notes

- RNG uses `crypto.randomInt()` server-side only.
- Spin outcome logic is server-only; client renders result only.
- Every spin payload is signed with HMAC-SHA256 and verified client-side before reel animation.
- Protected POST routes require client HMAC headers; invalid signatures are rejected.
- JWT sessions expire in 15 minutes and are bound to IP + user-agent fingerprint.
- Bet, balance, deposit limit, and self-exclusion are checked server-side on every spin.
- WebSocket is session-authenticated and message-rate-limited to 30 requests/minute.
- CORS is allowlist-only and CSP is set with no inline script allowance.

## Compliance Notes

- Autoplay hard cap: 50 spins (explicit user input required).
- Spin floor enforced server-side at 2500ms.
- Net-loss spins suppress win animation/sound.
- Reality check modal triggered after 60 minutes; acknowledgement required.
- Session deposit/spend limit enforced server-side.
- Age gate blocks play until confirmed.


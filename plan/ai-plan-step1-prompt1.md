# Prompt 1:

## MCP
I wanted to try using MCPs in order to have a better prompting process

We will use for this prompt:
- Context7 (live documentation of libraries)
```
codex mcp add context7 -- npx -y @upstash/context7-mcp@latest
```
- Chrome DevTools （frontend debugging）
```
codex mcp add chrome-devtools -- npx -y @modelcontextprotocol/server-chrome-devtools
```

## ACTUAL PROMPT:

use context7

## DESIGN REFERENCE

Use https://www.hacksawgaming.com/games/slots as the primary design and layout
inspiration. Match its vertical-first mobile layout, minimal chrome, bold symbol
styling, dark colour palette, pill-shaped controls, and punchy win animations.

---

Build a full-stack AI-satire slot machine web app.

## THEME
Satirical slot machine — all symbols are AI company logos, buzzwords, and tropes.
Symbol set: GPT-5, Claude, Gemini, Grok, "Disruption", "10x Engineer", "Pivot",
"AGI Soon", Hallucination (wild), Prompt (scatter).
Tone: dry self-aware humour. Win messages reference AI hype
("You've achieved AGI... of profits").

## STACK
- Frontend: Vanilla JS (ES modules), CSS custom properties only
- Backend: Node.js + Express (or Cloudflare Workers)
- No frameworks, no jQuery, no magic numbers, no hardcoded CSS values
- All animations via CSS keyframes using :root variables

## ARCHITECTURE
Mandatory client/server split — client renders only, all logic server-side.

### Server
- PRNG: Node crypto.randomInt() — seed never leaves server
- Sign every spin result with HMAC-SHA256 before sending
- Validate session token, balance, and bet on every request
- JWT session tokens: 15-min expiry, tied to IP + user-agent fingerprint
- Reject any request with invalid HMAC signature
- WebSocket for real-time state: authenticated per session, rate-limited (30 req/min)
- Input sanitisation on all POST bodies
- CORS whitelist only, CSP headers, no inline scripts

### Client
- Render reel animation only after HMAC signature verified
- Never compute or infer outcome — display server result only
- Build output: minified + obfuscated via esbuild

## GAME MECHANICS
Grid: 3 rows × 5 reels
Paylines: 20 fixed lines
RTP: 96% — configurable constant in config.js, never hardcoded inline
Symbols: defined as [{ id, label, emoji, weight, payout }] in config.js only

Features:
- Wild (Hallucination): substitutes all symbols
- Scatter (Prompt): 3+ anywhere → Free Spins (10 spins, 2x multiplier)
- Cascading reels: winning symbols removed, new ones fall from above
- Progressive jackpot: 1% of each bet feeds pool; 5-of-a-kind GPT-5 triggers it
- Near-miss: tunable frequency param in config.js only

## INTERFACE
All colours, spacing, timings defined as CSS custom properties in :root.

Components:
- 5×3 reel grid with CSS spin animation
- Bet slider ($0.10–$10.00, step $0.10)
- Balance display in "tokens" (satirical credit label)
- Spin button — disabled during animation
- Autoplay: max 50 spins, requires explicit limit input (UK-compliant)
- Turbo toggle: 2500ms normal / 1000ms turbo — stored as CSS var
- Paytable modal via info button
- XP bar + tier badge (Bronze → VIP) in header
- Reality check modal at 60-min mark — requires button press to dismiss
- Session spend tracker — always visible, cannot be hidden

Sound (Web Audio API only, no external files):
- Win fanfare scaled to win size
- Near-miss ascending tone
- Silence on net loss (no LDW violation)
- Ambient lo-fi hum (toggleable)

## RESPONSIBLE GAMBLING COMPLIANCE
- Autoplay hard cap: 50 spins
- Spin floor: 2500ms (constant in config.js)
- Net-loss spins: no win animation, no win sound
- Reality check: modal at 60 min, button acknowledgement required
- Session deposit limit: enforced server-side
- Self-exclusion flag: checked server-side before every spin
- Age gate: modal on first load, must confirm before game renders

## FILE STRUCTURE
/server
  index.js      — Express app, routes, WebSocket
  game.js       — RNG, HMAC signing, payout logic
  config.js     — ALL constants (RTP, weights, limits, timings)
  session.js    — JWT creation, validation, fingerprinting
/client
  index.html
  /js
    main.js     — Entry point, game loop
    reels.js    — Animation, DOM
    ui.js       — Controls, modals, sound
    verify.js   — Client-side HMAC verification
  /css
    variables.css   — All :root custom properties
    layout.css
    animations.css
    components.css
/build            — esbuild output

## DELIVERABLES
1. Playable game in browser
2. Zero magic numbers — all constants in config.js
3. esbuild config for production build
4. README: setup steps, env vars, compliance notes

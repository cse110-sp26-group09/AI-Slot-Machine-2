Prompt 1: 
```
You are helping a software engineering team build a significantly improved web-based slot machine game for an important client.

Your task is to act like a disciplined senior software engineer and generate production-style project artifacts and implementation code incrementally, not like a one-shot demo generator.

PROJECT GOAL
Build a polished, self-contained slot machine web app using only vanilla HTML, CSS, JavaScript, and standard browser/platform APIs. The app must preserve the satire theme that the player is winning and spending AI-related tokens, but it should feel significantly more polished, usable, and maintainable than a quick prototype.

HIGH-LEVEL PRODUCT REQUIREMENTS
The slot machine should:
- be fun, visually polished, and easy to understand
- include strong feedback for wins and losses through animation, sound, and UI state changes
- use an AI satire theme based on tokens, prompts, credits, model-related humor, or similar ideas
- support a token balance and clear game loop
- feel like a real interactive product, not a barebones classroom demo

USER EXPERIENCE GOALS
Design for at least two types of users:
1. a casual player who wants fast, clear, satisfying gameplay
2. a more engaged repeat player who wants clarity, polish, and visible progress/state

The interface should prioritize:
- clarity of controls
- readable token balance and game state
- polished but not cluttered visual design
- smooth interactions
- satisfying win feedback
- settings or controls where appropriate, especially for audio

SOFTWARE ENGINEERING REQUIREMENTS
The codebase must be organized and readable. Follow these standards:
- meaningful names
- small focused functions
- modular JavaScript files with clear responsibilities
- minimal duplication
- clear separation of UI, game logic, payouts, and audio
- error handling where appropriate
- comments and JSDoc where useful
- code that reads as if one person wrote it

Use a structure like:
- index.html
- styles/main.css
- scripts/main.js
- scripts/game.js
- scripts/reels.js
- scripts/payouts.js
- scripts/ui.js
- scripts/audio.js
- assets/ as needed

QUALITY REQUIREMENTS
As you generate code:
- keep the implementation lint-friendly
- make it easy to test
- prefer simple, maintainable code over clever code
- avoid adding frameworks or extra technologies
- do not introduce build tools unless explicitly asked
- keep the app runnable locally as a static site

DEVELOPMENT APPROACH
Do not dump a giant unstructured solution immediately.
Work in disciplined phases:
1. summarize the product and engineering plan
2. propose a clean file structure
3. define the core gameplay loop and major components
4. implement the first clean version
5. identify risks, missing pieces, and next improvements

OUTPUT FORMAT
For each phase:
- briefly state what you are doing
- generate only the files relevant to that phase
- keep code complete and runnable
- explain major design decisions briefly
- call out any assumptions clearly

IMPORTANT CONSTRAINTS
- Same core technology only: HTML, CSS, JavaScript, browser APIs
- No frameworks
- No TypeScript
- No external backend
- No unnecessary dependencies
- No fake claims about testing or validation if not actually implemented
- If a requirement is ambiguous, make the most reasonable SWE-oriented choice and state it

INITIAL IMPLEMENTATION TARGET
For the first pass, produce:
1. a concise architecture/implementation plan
2. the initial file structure
3. a clean, playable MVP with:
   - 3-reel slot machine behavior
   - token balance
   - spin button
   - win/loss outcome logic
   - visible game status text
   - basic polished styling
   - at least basic sound hooks or audio handling structure
4. a short list of next recommended improvements aligned with polish, usability, testing, and maintainability

Build this like a team project that may later be extended, tested, linted, and presented.
```

Notes: Aligns with the assignment’s emphasis on research, user-centered thinking, documented AI process, and clean-code standards.

Result: 

___

Prompt 2: 
```
You are working in a student software engineering repository. Build a significantly improved slot machine web app as a maintainable team project, not as a one-off demo.

MODEL / TASK MODE
Use a disciplined software-engineering approach suitable for GPT-5.3-Codex at high reasoning effort:
- plan before editing
- keep changes structured
- prefer maintainability over unnecessary feature bloat
- make the result runnable locally as a static site

TECH CONSTRAINTS
- Use only vanilla HTML, CSS, JavaScript, and standard browser APIs
- No frameworks
- No TypeScript
- No backend
- No build tooling unless explicitly required
- Keep the app self-contained

PRODUCT DIRECTION
This variant should optimize for accessibility, trust, transparency, ease of use, and polished clarity.

TARGET USERS
1. Carrie White: older experienced gambler who values classic slot aesthetics, large text, obvious controls, high contrast, simple navigation, and trustworthy UI.
2. Sarah Kim: casual player who values simple rules, fun visuals, satisfying sound, fairness, and low-pressure play.

USER NEEDS TO SATISFY
- Show a real-time session summary with current balance, total spend, and net result.
- Provide a high-contrast / large-print mode with larger buttons and improved readability.
- Present fairness or RTP-related information in a simple, trustworthy way.
- Include responsible-play prompts at meaningful decision points without sounding patronizing.
- Allow a session budget or loss limit that pauses gameplay when reached.
- If loyalty systems exist, show XP / tier / progress clearly.

APP REQUIREMENTS
Build a polished 3-reel slot machine with:
- clear token balance
- clear bet controls
- spin button
- visible win/loss outcome
- session summary panel
- paytable or payout explanation that is easy to understand
- accessibility settings
- sound settings
- AI satire theme based on prompts, tokens, credits, models, inference, or similar concepts

UX REQUIREMENTS
- readable layout with strong spacing and obvious hierarchy
- large labels and obvious button states
- accessible interaction on laptop and mobile
- satisfying but not overwhelming sound and animation
- no misleading “win” feedback for net-loss outcomes
- avoid clutter, manipulative UI, and aggressive popups

ENGINEERING REQUIREMENTS
Organize the code like a real team project:
- index.html
- styles/main.css
- scripts/main.js
- scripts/game.js
- scripts/reels.js
- scripts/payouts.js
- scripts/ui.js
- scripts/audio.js
- scripts/accessibility.js
- assets/ as needed

Code quality requirements:
- meaningful names
- small focused functions
- minimal duplication
- clear separation of concerns
- comments and JSDoc where useful
- lint-friendly structure
- easy to test later
- readable enough that it looks like one cohesive codebase

WORKFLOW
Do this in order:
1. Briefly summarize the implementation plan.
2. Propose the file structure.
3. Implement a complete runnable MVP.
4. Briefly list next improvements.

OUTPUT CONTRACT
- Be concise.
- Create complete files, not fragments.
- Do not leave placeholders like “TODO: implement later” for core functionality.
- Make reasonable assumptions when needed and state them briefly.
- Optimize for a strong first working version.

```
Notes: Expected to produce a slot machine that feels clearer, safer, and more trustworthy, with stronger readability, session transparency, accessibility settings, and simple controls. This variation should likely prioritize usability and structure over raw excitement or flashy immersion.

Result:

___

Prompt 3:
```
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

___

Prompt 4: 
```
You are working in a student software engineering repository. Build a significantly improved slot machine web app as a maintainable team project, not as a one-off demo.

MODEL / TASK MODE
Use a disciplined software-engineering workflow suitable for GPT-5.3-Codex at high reasoning effort:
- plan before editing
- keep the implementation coherent
- optimize for completeness, readability, and maintainability
- produce a strong runnable local static app

TECH CONSTRAINTS
- Use only vanilla HTML, CSS, JavaScript, and standard browser APIs
- No frameworks
- No TypeScript
- No backend
- No unnecessary dependencies
- Keep the app self-contained

PRODUCT DIRECTION
This variant should be the most balanced and product-ready direction. Combine accessibility, transparency, trust, clarity, casino atmosphere, replay value, and polished feedback into one cohesive experience.

TARGET USERS
1. Carrie White: values large text, classic trust-building slot aesthetics, simple controls, and high contrast.
2. Sarah Kim: values easy rules, fun visuals, satisfying sound, fairness, and low-pressure play.
3. Adi Zelersteins: values loyalty progression, anticipation, polished mobile entertainment, and spend visibility.
4. Jake Miller: values casino-like thrill, fast clear gameplay, and strong excitement.

USER NEEDS TO SATISFY
- Show a real-time session summary with balance, spend, and net result.
- Include a high-contrast / large-print accessibility mode.
- Make the paytable understandable at a glance.
- Make spin and bet controls easy to understand immediately.
- Include responsible-play prompts at meaningful decision points without sounding patronizing.
- Allow a session budget or loss limit that pauses gameplay when reached.
- Save session progress automatically with browser storage.
- Include a daily reward, loyalty, or replay hook.
- If fairness / RTP information is shown, present it simply and clearly.

APP REQUIREMENTS
Build a polished 3-reel slot machine with:
- token balance
- adjustable bet
- spin button
- visible outcome feedback
- paytable
- session summary
- accessibility settings
- sound settings
- session persistence
- replay / return mechanic
- AI satire theme based on prompts, tokens, credits, models, inference, compute, or similar concepts

UX REQUIREMENTS
- balance clarity with excitement
- maintain strong readability, spacing, contrast, and obvious controls
- use polished but not overwhelming animation and sound
- use realistic slot-style pacing and anticipation
- avoid misleading feedback for net-loss outcomes
- avoid clutter, aggressive popups, and confusing state changes
- make the experience feel complete and believable as a product

ENGINEERING REQUIREMENTS
Organize the code like a real team project:
- index.html
- styles/main.css
- scripts/main.js
- scripts/game.js
- scripts/reels.js
- scripts/payouts.js
- scripts/ui.js
- scripts/audio.js
- scripts/storage.js
- scripts/accessibility.js
- assets/ as needed

Code quality requirements:
- meaningful names
- small focused functions
- minimal duplication
- clear separation of concerns
- readable module boundaries
- comments and JSDoc where useful
- lint-friendly structure
- easy to test later
- code should feel cohesive, not AI-fragmented

WORKFLOW
Do this in order:
1. Briefly summarize the implementation plan.
2. Propose the file structure.
3. Implement a complete runnable MVP.
4. Briefly list next improvements.

OUTPUT CONTRACT
- Be concise.
- Produce complete files, not fragments.
- Do not invent unnecessary complexity.
- Do not leave core features unfinished.
- Optimize for the strongest balanced first version.

```

Notes: Expected to produce the most well-rounded version by combining accessibility, transparency, excitement, clarity, persistence, and replay value into one cohesive product. This variation should likely aim for the strongest overall balance between user trust, usability, and polished casino-like engagement.

Result:

___

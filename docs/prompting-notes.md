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

Result: Good baseline prompt with the base features

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

Result: Produced an accessibility-focused variant with high-contrast mode, large text options, session tracking, paytable clarity, responsible-play prompts, and trustworthy UI patterns. Prioritized transparency and ease of use for both casual and experienced players.

___

Prompt 3:
```

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
```
Notes: Was inspired by some online gambling slot machines
Results: Didn't run great and were a lot of problems
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

Result: Overall best prompt that encapsulates all the research and the personas with ll the user stories great overall prompt with all the features.

___

Refinement prompt for candidates 13 - 16
Theme Akatsuki

```
You are refining an existing slot machine candidate inside a student software engineering repository.

This is a refinement pass, not a rebuild.

Your job is to preserve all existing working logic, assignment-aligned features, and maintainable code structure, while integrating the provided Akatsuki theme assets and improving the product experience so the app feels more immersive, realistic, cohesive, and polished.

CRITICAL PRESERVATION RULES
- Do not rebuild from scratch.
- Do not remove or regress working assignment-relevant features.
- Do not break existing slot logic, session logic, persistence, accessibility, transparency, loyalty/progress, settings, or guardrail features if they already work.
- Do not change the tech stack.
- Do not replace provided assets with invented placeholders unless absolutely necessary.
- Do not sacrifice maintainability or readability for flashy effects.
- Do not clutter the slot machine screen or let supporting HUD elements interfere with the reels/lever area.
- Keep the existing customizable betting system, but preserve the maximum bet limit of 100.

TECH CONSTRAINTS
- Vanilla HTML, CSS, JavaScript, and browser APIs only
- No frameworks
- No TypeScript
- No backend
- No unnecessary dependencies

PRIMARY GOAL
Transform this candidate into a cohesive Akatsuki-themed slot machine experience while preserving its strongest existing implementation quality and assignment compliance.

EXPERIENCE HIERARCHY
The app should be structured as a clear 3-layer product experience:

1. ENTRY FLOW
- A dedicated intro/loading screen using the provided loading background
- A prominent Play button
- A visible but secondary Info button in the top-right or similarly unobtrusive location
- The Info button should open a clean modal/panel showing the payout summary and game rules for the theme
- Background music should begin here and continue across the experience, with clear on/off and volume controls
- After Play, the user should go through an age gate before entering gameplay

2. AGE GATE
- Require age verification before entering the game
- Use MM/DD/YYYY format
- The user must be 21+
- Maximum valid birth date should be 04/22/2005
- If the user is under 21, deny entry clearly and professionally
- This should feel like a themed but readable compliance gate, not a joke or throwaway screen

3. CORE GAMEPLAY
- Enter a separate gameplay screen with a different background from the loading screen
- Use the provided banner image as the title banner near the top
- Place one Akatsuki quote below the banner
- Keep the slot machine as the focal point of the page
- Preserve the 3x1 slot format
- Use the provided circular face icons as reel symbols
- If feasible without breaking the candidate, use a lever-style spin interaction instead of or in addition to the spin button
- Show real spin animation and themed audio feedback
- Use stronger but controlled win feedback
- For normal wins, show satisfying sound and polished animation
- For major wins, trigger a clearly elevated reward sequence with a prominent winner banner or overlay, the provided win sound, and cool themed celebratory animations/effects that make the moment feel rare, exciting, and visually distinct from a normal win
- Big-win feedback should feel dramatic and rewarding, but should not break the UI, obscure core state permanently, or overwhelm readability
- Maintain a clear, polished, product-like feel

AKATSUKI ASSET INTEGRATION
Use the provided assets intentionally and consistently:

Images
- `assets/images/akatsuki-loading-bg.jpg` → intro/loading screen background
- `assets/images/akatsuki-gameplay-bg.jpg` → main gameplay screen background
- `assets/images/akatsuki-banner.jpg` → title banner
- `assets/images/akatsuki-slot-bg.jpg` → slot machine / reel area background
- `assets/images/akatsuki-pattern-bg.jpg` → texture/pattern for panels, modals, overlays, settings, or supporting UI surfaces

Audio
- `assets/audio/akatsuki-bgm.mp3` → background music
- `assets/audio/akatsuki-welcome.mp3` → welcome/entry sound after passing age gate
- `assets/audio/akatsuki-spin.mp3` → spin / lever interaction sound
- `assets/audio/akatsuki-win.mp3` → win sound

Icons
- Use the provided circular face icons from `assets/icons/` as the reel symbols

QUOTE
Use one quote only. Prefer:
“Feel pain, accept pain and know pain, for those who doesn't know pain shall never understand true peace!”

UI HIERARCHY AND LAYOUT RULES
The slot machine must remain the main focal point.
Balance, current bet, and session net must remain visible, but they should be placed in a clean supporting HUD/panel that does not visually interfere with the slot machine UI.

Preserve or improve these features if already present and working:
- balance display
- current bet display
- session net / session summary
- payout summary / rules
- loyalty progress
- customizable loss limit
- settings / guardrails
- sound on/off
- volume control
- restart session
- paytable clarity
- persistence if already implemented
- accessibility or high-contrast mode if already implemented

Do not overload the main gameplay surface with extra informational clutter like house edge or excessive statistics if they are not necessary there. Important information should either live in clean supporting panels or modals.

BETTING AND GAMEPLAY RULES
- Preserve existing slot logic if working
- Preserve current payout and session systems if working
- Keep customizable betting
- Keep maximum bet at 100
- Do not introduce unlimited betting
- Do not break balance logic, session summary logic, or loss-limit logic

VISUAL AND SOUND DESIGN DIRECTION
The Akatsuki theme should feel:
- dark
- dramatic
- high-contrast
- immersive
- polished
- cohesive

But the interface must still remain readable and usable.

Use:
- black / near-black foundations
- crimson red accents
- restrained glow/highlight effects
- clear panel contrast
- consistent spacing and hierarchy

Avoid:
- excessive red glow everywhere
- unreadable text over detailed imagery
- chaotic overlays
- effects that distract from gameplay state

Sound should feel intentional:
- music supports atmosphere
- spin sound reinforces interaction
- welcome sound marks transition into the game
- win sound and win animation reinforce reward
- major wins should have a noticeably bigger audiovisual payoff than normal wins
- losses should not be over-celebrated or confused with wins

SOFTWARE ENGINEERING REQUIREMENTS
Preserve or improve code quality:
- meaningful names
- small focused functions
- modular structure
- minimal duplication
- separation of concerns across UI, game logic, payouts, audio, storage, accessibility, and screen flow
- readable, maintainable code
- comments and JSDoc where helpful
- lint-friendly structure
- easy to test later

If the current candidate already has a good structure, refine within it rather than restructuring aggressively.

REFINEMENT STRATEGY
Approach this as a conservative enhancement pass:
1. identify what already works and preserve it
2. layer in the Akatsuki theme assets
3. implement the screen-flow hierarchy cleanly
4. improve visual hierarchy and immersion
5. strengthen feedback and realism without destabilizing the candidate

OUTPUT EXPECTATIONS
- Work with the existing candidate, not against it
- Produce a complete refined version, not pseudo-code
- Keep the app runnable
- Make reasonable implementation choices if something is ambiguous
- Prioritize cohesion, preservation, realism, and polish over feature sprawl

Before making major changes, briefly summarize:
1. what you are preserving
2. what you are enhancing
3. how you will integrate the Akatsuki assets without breaking the current candidate

```
Notes: Adds theme and more functionality

Result: 
candidate-13: looks good but we want to add stuff instead of just white backgrounds on the slots of our pictures. Image not being centered (no heads). Only see 5 different people instead of 11. 

candidate-16: looks good and spin is really nice but reduce motion is buggy and top banner placement is weird. 
___


Refinement prompt for candidates 5 - 8
Theme Spongebob

```
You are refining an existing slot machine candidate inside a student software engineering repository.

This is a refinement pass, not a rebuild.

Your job is to preserve all existing working logic, assignment-aligned features, and maintainable code structure, while integrating the provided Spongebob theme assets and improving the product experience so the app feels more immersive, realistic, cohesive, and polished.

CRITICAL PRESERVATION RULES
- Do not rebuild from scratch.
- Do not remove or regress working assignment-relevant features.
- Do not break existing slot logic, session logic, persistence, accessibility, transparency, loyalty/progress, settings, or guardrail features if they already work.
- Do not change the tech stack.
- Do not replace provided assets with invented placeholders unless absolutely necessary.
- Do not sacrifice maintainability or readability for flashy effects.
- Do not clutter the slot machine screen or let supporting HUD elements interfere with the reels/lever area.
- Keep the existing customizable betting system, but preserve the maximum bet limit of 100.

TECH CONSTRAINTS
- Vanilla HTML, CSS, JavaScript, and browser APIs only
- No frameworks
- No TypeScript
- No backend
- No unnecessary dependencies

PRIMARY GOAL
Transform this candidate into a cohesive Spongebob-themed slot machine experience while preserving its strongest existing implementation quality and assignment compliance.

EXPERIENCE HIERARCHY
The app should be structured as a clear 3-layer product experience:

1. ENTRY FLOW
- A dedicated intro/loading screen using the provided loading background
- A prominent Play button
- A visible but secondary Info button in the top-right or similarly unobtrusive location
- The Info button should open a clean modal/panel showing the payout summary and game rules for the theme
- Background music should begin here and continue across the experience, with clear on/off and volume controls
- After Play, the user should go through an age gate before entering gameplay

2. AGE GATE
- Require age verification before entering the game
- Use MM/DD/YYYY format
- The user must be 21+
- Maximum valid birth date should be 04/22/2005
- If the user is under 21, deny entry clearly and professionally
- This should feel like a themed but readable compliance gate, not a joke or throwaway screen

3. CORE GAMEPLAY
- Enter a separate gameplay screen with a different background from the loading screen
- Use the provided banner image as the title banner near the top
- Keep the slot machine as the focal point of the page
- Preserve the 3x1 slot format
- Use all 9 provided Spongebob character icons as reel symbols, meaning that there are 9 different symbols
- If feasible without breaking the candidate, use a lever-style spin interaction instead of or in addition to the spin button. There's an example lever.png image in the assets folder for design reference, and it should point down then up when spun
- Show real spin animation and themed audio feedback
- Use stronger but controlled win feedback
- For normal wins, show satisfying sound and polished animation, as well as the minor win sound
- For major wins, trigger a clearly elevated reward sequence with a prominent winner banner or overlay, the provided big win sound, and cool themed celebratory animations/effects that make the moment feel rare, exciting, and visually distinct from a normal win
- Big-win feedback should feel dramatic and rewarding, but should not break the UI, obscure core state permanently, or overwhelm readability
- For spin losses, play the loss sound
- Maintain a clear, polished, product-like feel

SPONGEBOB ASSET INTEGRATION
Use the provided assets intentionally and consistently:

Images
- `assets/images/spongebob-loading-bg.jpg` → intro/loading screen background
- `assets/images/spongebob-gameplay-bg.jpg` → main gameplay screen background
- `assets/images/spongebob-banner.png` → title banner
- `assets/images/spongebob-slot-bg.jpg` → slot machine / reel area background
- `assets/images/spongebob-pattern-bg.jpg` → texture/pattern for panels, modals, overlays, settings, or supporting UI surfaces

Audio
- `assets/audio/spongebob-bgm.mp3` → background music
- `assets/audio/spongebob-welcome.mp3` → welcome/entry sound after passing age gate
- `assets/audio/spongebob-spin.mp3` → spin / lever interaction sound
- `assets/audio/spongebob-bigwin.mp3` → major win sound (all 3 matching symbols)
- `assets/audio/spongebob-win.mp3` → minor win sound (anything other win)
- `assets/audio/spongebob-loss.mp3` → loss sound (nothing won on spin)

Icons
- Use the provided character icons from `assets/icons/` as the reel symbols
- Make sure that each icon is clearly labeled with each spin so that they map back to payout tables

UI HIERARCHY AND LAYOUT RULES
The slot machine must remain the main focal point.
Balance, current bet, and session net must remain visible, but they should be placed in a clean supporting HUD/panel that does not visually interfere with the slot machine UI.

Preserve or improve these features if already present and working:
- balance display
- current bet display
- session net / session summary
- payout summary / rules
- loyalty progress
- customizable loss limit
- settings / guardrails
- sound on/off
- volume control
- restart session
- paytable clarity
- persistence if already implemented
- accessibility or high-contrast mode if already implemented

Do not overload the main gameplay surface with extra informational clutter like house edge or excessive statistics if they are not necessary there. Important information should either live in clean supporting panels or modals.

BETTING AND GAMEPLAY RULES
- Preserve existing slot logic if working
- Preserve current payout and session systems if working
- Keep customizable betting
- Keep maximum bet at 100
- Do not introduce unlimited betting
- Do not break balance logic, session summary logic, or loss-limit logic

VISUAL AND SOUND DESIGN DIRECTION
The Spongebob theme should feel:
- bright
- colorful as opposed to black/white
- high-contrast
- immersive
- polished
- cohesive

But the interface must still remain readable and usable.

Use:
- blue / light-blue foundations
- yellow accents
- restrained glow/highlight effects
- clear panel contrast
- consistent spacing and hierarchy
- follow the styles in palette.md
- use images as directed
- crop image if absolutely necessary

Avoid:
- excessive blue glow everywhere
- unreadable text over detailed imagery
- chaotic overlays
- effects that distract from gameplay state
- stretching images in one dimension to fit
- obscured images
- boxes that extend without content to fill empty areas

Sound should feel intentional:
- music supports atmosphere
- spin sound reinforces interaction
- welcome sound marks transition into the game
- win sound and win animation reinforce reward
- major wins should have a noticeably bigger audiovisual payoff than normal wins
- losses should not be over-celebrated or confused with wins

SOFTWARE ENGINEERING REQUIREMENTS
Preserve or improve code quality:
- meaningful names
- small focused functions
- modular structure
- minimal duplication
- separation of concerns across UI, game logic, payouts, audio, storage, accessibility, and screen flow
- readable, maintainable code
- comments and JSDoc where helpful
- lint-friendly structure
- easy to test later

If the current candidate already has a good structure, refine within it rather than restructuring aggressively.

REFINEMENT STRATEGY
Approach this as a conservative enhancement pass:
1. identify what already works and preserve it
2. layer in the Spongebob theme assets
3. implement the screen-flow hierarchy cleanly
4. improve visual hierarchy and immersion
5. strengthen feedback and realism without destabilizing the candidate

OUTPUT EXPECTATIONS
- Work with the existing candidate, not against it
- Produce a complete refined version, not pseudo-code
- Keep the app runnable
- Make reasonable implementation choices if something is ambiguous
- Prioritize cohesion, preservation, realism, and polish over feature sprawl

Before making major changes, briefly summarize:
1. what you are preserving
2. what you are enhancing
3. how you will integrate the Spongebob assets without breaking the current candidate

```
Notes: Adds theme and more functionality

Result: Enhanced Spongebob-themed candidate by integrating assets and visual improvements. Focused on adding themed imagery, fixing layout issues, and improving reel presentation.

___

Refinement prompt for final akatsuki candidate from 13, 14, 15, 16.

```
You are refining the **final Akatsuki-themed slot machine candidate** inside a student software engineering repository using **vanilla HTML, CSS, JavaScript, and browser APIs only**.

This is a **final synthesis refinement pass**, not a rebuild.

Your job is to combine the strongest proven features from the shortlisted Akatsuki candidates into **one best final product** while preserving working logic, assignment-relevant functionality, and maintainable code structure.

Do **not** rebuild from scratch unless absolutely necessary. Prefer preserving and improving working systems over replacing them.

## Primary Goal
Create the **best final Akatsuki slot machine implementation** by synthesizing the strongest aspects of:

- **Candidate 13** for working guardrails/settings completeness, good sound behavior, and overall full product flow
- **Candidate 14** for cleaner gameplay UI, better spacing discipline, stronger machine-page layout, and engaging loyalty presentation
- **Candidate 15** for the **full 12-icon symbol set**, stronger payout/rules completeness, and better feature breadth
- **Candidate 16** for the **best spin animation**, best banner placement, and best quote presentation

The final result should feel like the **single best product-quality candidate**, not a patchwork of features.

## Critical Preservation Rules
- Do **not** remove working assignment-relevant features.
- Do **not** break the current slot logic if it already works.
- Do **not** change the tech stack.
- Do **not** remove session tracking, payout transparency, sound controls, or guardrails if already functional.
- Do **not** remove bet customization.
- Do **not** remove the **100 max bet cap**.
- Do **not** reduce the reel symbol set below **12 intended icons**.
- Do **not** introduce unnecessary complexity or unrelated features.
- Do **not** leave large blank or dead space in the gameplay layout.
- Do **not** sacrifice layout clarity for flashy effects.

## Final Product Requirements

### 1. Loading Screen
Build the best loading screen by combining:
- the cleaner **card/presentation quality of Candidates 14 and 16**
- the **complete flow thinking of Candidate 13**
- the **sound control clarity seen in the stronger candidates**

Requirements:
- Use the provided Akatsuki loading background image
- Fit the background image properly so the important characters are visible
- Avoid overly aggressive cropping where faces/characters are cut off
- Include a prominent **Play** button
- Include an **Info** button
- Include working sound/music toggle and volume control
- Make the loading screen feel polished and centered

### 2. Info / Rules Modal
Use the strongest discoverability pattern from candidates that already surfaced rules well, especially:
- **Candidate 15** for in-flow rules/payout visibility
- **Candidate 13** for complete product-minded flow support

Requirements:
- Info button should open a modal/panel
- It must show the payout summary for **all 12 symbols/icons**
- It must explain:
  - 3-reel gameplay
  - payout structure
  - customizable bet behavior
  - maximum bet of **100**
  - loss-limit / session control behavior
- Must be clean, readable, and scroll-safe if needed

### 3. Age Verification
Preserve the age-gate behavior seen in the stronger candidates:
- **Candidate 13**
- **Candidate 14**
- **Candidate 15**
- **Candidate 16**

Requirements:
- MM/DD/YYYY input
- Must enforce **21+**
- Maximum valid birth date must reflect **04/22/2005**
- Must include a **Back** button
- Must clearly deny entry if underage
- Should feel polished and intentional, not like a placeholder screen

### 4. Gameplay Screen
Use the **best overall gameplay synthesis**:
- **Candidate 14** for cleaner gameplay layout and better space usage
- **Candidate 16** for banner placement, quote UI, and spin animation quality
- **Candidate 15** for symbol completeness and payout/rules completeness
- **Candidate 13** for settings/guardrails completeness and stable product flow

Requirements:
- Gameplay background should load correctly
- Banner and quote should be presented like **Candidate 16**
- The slot machine should remain the visual focal point
- Layout should be compact and intentional like the best parts of **Candidate 14**
- There must be **no large blank space under the slot machine**
- Balance, bet, and session information must remain visible without interfering with the reel area
- Include a **Home** button in gameplay
- Include an in-game **Info/Rules** button if feasible without clutter

## Required Feature Synthesis

### A. Reel Symbol Set
Take from **Candidate 15**:
- Use the **full 12 intended icons**
- Ensure all 12 are wired correctly in the reel logic and payout/rules system

Do not ship the final version with only the partial symbol coverage seen in **Candidates 13, 14, or 16**.

### B. Spin Animation
Take from **Candidate 16**:
- Use Candidate 16 as the benchmark for **spin animation quality**
- Preserve the best reel movement, visual energy, and spin feel
- The spin should feel satisfying, polished, and lively
- Keep lever interaction if feasible
- Reduced motion mode should still remain usable

### C. Title Banner and Quote
Take from **Candidate 16**:
- Use its stronger centered banner placement
- Use its stronger quote treatment/presentation
- Keep the Akatsuki quote readable and visually polished

### D. Gameplay Layout and Space Usage
Take from **Candidate 14**:
- Use Candidate 14 as the reference for a cleaner gameplay UI
- Avoid dead space
- Keep panels and machine aligned better
- Improve overall information density without clutter

### E. Guardrails / Settings
Take from **Candidate 13** and strongest pieces from **Candidate 15**:
- sound toggle
- volume control
- reduced motion / accessibility settings if already working
- loss-limit controls
- session reset / restart behavior
- guardrail completeness

### F. Rules / Payout Completeness
Take from **Candidate 15**:
- better payout/rules completeness
- stronger discoverability of rules
- proper presentation of all symbol payouts

## Betting and Session Constraints

### Betting
- Bet must remain **customizable**
- Maximum bet must remain **100**
- Do not remove the cap
- Controls must be easy to understand
- Bet UI should not clutter or visually compete with the slot machine

### Session Transparency
Maintain visible and working:
- balance
- current bet
- session net
- total spent
- total won
- spins
- win rate or related useful metrics if already working

### Loss Limit
Preserve a working session loss-limit system:
- user can configure it
- it pauses or blocks further play when reached
- it should remain understandable and visible
- it should not dominate the UI

## Audio Requirements
Preserve the strongest working sound behavior from the better candidates, especially:
- **Candidate 13**
- **Candidate 14**
- **Candidate 15**

Requirements:
- background music works correctly
- welcome sound works correctly
- spin sound works correctly
- win sound works correctly
- sound toggle works
- volume control works
- audio should feel reliable and intentional

## Win Feedback Requirements
Use the strongest reward feel from the better candidates while keeping polish and clarity.

Requirements:
- wins must show clear win messaging
- wins must feel satisfying
- major wins must trigger a stronger celebration sequence
- big wins should feel special but not chaotic
- the final experience should feel rewarding and polished

Take inspiration from:
- **Candidate 13** for visible win messaging / reward flow
- **Candidate 15** for major-win support
- **Candidate 16** for strong visual energy around spins and polish

## Navigation Requirements
The final version must include:
- **Info** button
- **Back** button where appropriate
- **Home** button or equivalent clear navigation back to the main menu

Use the strongest navigation patterns from:
- **Candidate 13** for back/home flow support
- **Candidate 15** for in-game rules discoverability

## Visual / Theme Requirements
The final candidate must clearly feel like the best Akatsuki-themed version.

Use the provided assets intentionally:
- loading background
- gameplay background
- banner image
- slot background
- pattern background
- 12 reel icons
- music and sound effects

The final product should feel:
- dark
- dramatic
- red/black themed
- anime-inspired
- polished
- cohesive
- readable

Avoid:
- awkward image cropping
- blank layout zones
- white visual artifacts behind reel icons
- overly cluttered panels
- weak alignment

## Implementation Priorities
When making tradeoffs, prioritize in this order:

1. **working logic and assignment compliance**
2. **full feature completeness**
3. **layout quality and usability**
4. **spin feel and polish**
5. **theme fidelity**

## Acceptance Criteria
The final implementation is successful only if it satisfies all of the following:

1. **Loading screen looks polished**
   - background fitted well
   - characters visible
   - Play and Info visible
   - sound controls work

2. **Info modal works**
   - shows payouts for all **12 icons**
   - rules are readable and complete

3. **Age verification works**
   - MM/DD/YYYY
   - enforces 21+
   - uses 04/22/2005 cutoff
   - includes Back button

4. **Gameplay page is the best combined version**
   - title and quote UI like **Candidate 16**
   - cleaner gameplay layout like **Candidate 14**
   - full 12-symbol set like **Candidate 15**
   - strong guardrails/settings like **Candidate 13**
   - no blank space under the slot machine

5. **Spin animation is excellent**
   - use **Candidate 16** as the reference
   - lever/spin interaction feels satisfying

6. **Betting is correct**
   - customizable
   - capped at **100**

7. **Audio works**
   - music and sounds behave correctly

8. **Navigation is complete**
   - Info / Back / Home flows are available where needed

9. **Overall product feels like the best final Akatsuki candidate**
   - cohesive
   - stable
   - polished
   - feature-complete

## Final Instruction
Refine the implementation into the **single best final Akatsuki candidate** by **selectively combining** the strongest features from Candidates **13, 14, 15, and 16**.

Do not simply copy features blindly. Make them work together as one cohesive product.

Before making major changes, briefly summarize:
1. which candidate features you are preserving
2. which candidate features you are borrowing
3. how you will combine them without breaking working logic

```
Notes: Implements features from other candidates that are lacking some features to become a complete product.

Result: Synthesized best features from candidate-05, 06, 07, 08 into a cohesive final Spongebob implementation with improved gameplay, visual polish, and feature completeness.

___

Refinement prompt for final spongebob candidate from 5, 6, 7, 8.

```
You are building an improved slot machine web application. In the folder there are 4 candidates that you will be working off of to refine.

What to keep from candidates:


Bubble animation after each spin from candidate 6
General slot UI from candidate 6
Title UI from candidate 6
Loading screen candidate 7 which doesn’t make the users type slash
Transparent UI from candidate 5, unlike candidate 6 which is just white background
Center-aligned text in each box
Implement the Candidate-05 single-reel-at-a-time blur spin animation — reels should resolve sequentially left to right, each decelerating with a dramatic slow-down before locking
Make sure each slot spins for the same amount of time such as 2 seconds each
Add a physical lever on the right side of the screen as an alternative spin trigger (tap or swipe-down gesture to pull) — this satisfies the "illusion of control" interaction paradigm
The spin should feel weighty: fast initial blur → gradual deceleration → satisfying thud/lock per reel
Support "Slam Stop" tap to resolve reels early for fast-paced players
Add a persistent spin history panel (collapsible) showing the last 10–20 spin outcomes: bet, result symbols, payout, net
Include a running session summary: total spun, total won, net result — always accessible without navigating away
Apply tiered win celebrations(make it flashy every time you spin) based on payout-to-bet ratio (per Waleed's audio-visual research):
Loss: brief red payline glow
Small win (1–5x): brief payline glow, short chime
Big win (10–49x): outcome message glows and pulses, coin burst, upbeat fanfare
Mega/Jackpot (50x+): full bubble instantiation, screen brightness pulse, prolonged celebration requiring tap-to-dismiss
Ascending anticipation tone when 2 of 3 bonus symbols have landed
Add the ability to speed up the roll when tapping/clicking

What to change:
Remove the banner image and replace it with a glowing title similar to in candidate 6

Use Candidate-06 as the base because it has strong architecture, modular code, and advanced features such as session tracking, guardrails, accessibility, and audio systems.

Incorporate improvements from Candidate-05, specifically
- Cleaner and more structured UI layout
- Better user experience and screen flow
- Improved outcome messaging (win, loss, partial win feedback) with glow on win
- More polished visual organization of game elements

Requirements:
- Keep Candidate-06’s modular structure (separate game logic, UI, audio, etc.)
- Maintain all advanced features (XP system, guardrails, accessibility)
- Improve UI clarity and layout using Candidate-05 design ideas
- Ensure the game feels intuitive for casual users
- Keep animations smooth and engaging
- Maintain clean and readable code
- Bright background (do not darken)

Goal:
Combine the strong backend architecture of Candidate-06 with the cleaner UI and UX of Candidate-05 to create a polished and user-friendly slot machine.

Return a complete working version of the project.

```

Notes: Implements features from other candidates that are lacking some features to become a complete product and addresses user story concerns.

Result: Has many elements of a professional slot-machine app, with fun visuals and gameplay. Though, the overall experience does become tiring after several spins.

___

Refinement prompt for final spongebob candidate 6.

```
Make the spinning slot machine UI the most prominent thing on the application, spanning the entire width of the screen. Consolidate the settings and ancillary components, like payouts and related stats drop downs, to a section below the slots. The user's main focus should be on the slot machine itself, not the supplementary things. These are also important but not as much as the main machine game action. Keep logic the exact same, only change the existing code to reflect these changes. Don't change other logics.

Additionally, identify any unfilled areas at the bottom of the webpage to insert advertisement assets ad1.png, ad2.png, and ad3.png. Reassign the new audio assets to their respective functions, and alternate between using spongebob-win1.mp3 and spongebob-win2.mp3 for minor wins.

Refactor the event listener for the spin function to ensure it only triggers when the spin button element is specifically clicked rather than any area outside of it. For speedup and slam stop, allow this to occur only when clicked anywhere in the slot area or the button.

When you pass the age verification step, please also include a 2 second bubble animation that goes from the bottom to the top of the screen, and play the spongebob-spin.mp3 sound effect in addition to spongebob-welcome.mp3.

On the home screen, change the text color to match the dark text used throughout the rest of the app so that it is readable.

On the age verification screen, remove the second sentence that tells the use to enter in MM/DD/YYYY format, and remove the empty blue box below the input box.
```

Notes: Final refinement prompt for the winning candidate to add some features and do checks while running tests to see if everything works as intended

Results: Phenomenal final product works as expected

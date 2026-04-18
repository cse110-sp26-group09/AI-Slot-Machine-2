Prompt 1: 
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

Notes: Aligns with the assignment’s emphasis on research, user-centered thinking, documented AI process, and clean-code standards.

Result: 
# Domain Research — Slot Machines
**Researcher:** Woosik Kim  
**Date:** April 18, 2026

---

## Key Takeaways

- Slot outcomes should be determined **server-side** using a CSPRNG, not client-side
- The browser should only handle **animation and presentation**
- Keep math simple: fixed RTP, fixed paytable to start
- Store all game state (balance, history, free spins) on the server

---

## Core Mechanics

### How It Works
1. RNG generates a random number server-side
2. Number maps to virtual reel stops
3. Reel stops map to visible symbols
4. Paytable evaluates win/loss
5. Result sent to browser → browser animates

### Key Math Concepts
- **RTP (Return to Player)**: long-run expected return % (e.g. 95% RTP = player gets back $95 per $100 wagered)
- **Hit Frequency**: how often any payout occurs
- **Volatility**: how uneven payouts are (high volatility = rare but big wins)

### Paylines
- Classic: 1 center payline
- Modern: 5, 9, 25+ paylines or "ways to win"

---

## Recommended Features for Our Build

| Feature | Description | Include? |
|---|---|---|
| Wild | Substitutes for other symbols | ✅ Yes |
| Scatter | Triggers bonus anywhere on reels | ✅ Yes |
| Free Spins | Bonus spins at no cost | ✅ Yes |
| Multiplier | Multiplies win amount (2x, 3x) | ✅ Yes |
| Bonus Round | Simple pick/reveal mini-game | ⚠️ Later |
| Cascading Reels | Winners removed, new symbols fall | ❌ Too complex for v1 |
| Progressive Jackpot | Growing jackpot pool | ❌ Too complex for v1 |
| Buy Feature | Pay to enter bonus | ❌ Avoid |

---

## Recommended Theme

**Classic Fruit or Treasure/Adventure** — easiest to execute cleanly on web, easy to animate, no licensed IP needed.

---

## Audio Guidelines

| Event | Sound Cue |
|---|---|
| Spin start | Short mechanical swoosh |
| Reel stop | Light tick per reel |
| Small win | Brief chime (under 700ms) |
| Big win | Layered chord + particles |
| Bonus trigger | Distinct musical sting |
| Background | 20–45 sec loop, low volume |

- Use **Web Audio API** for mixing and volume control
- Never play celebratory sounds for net-loss outcomes (ethical + regulatory standard)

---

## User Segments

| Segment | What They Want |
|---|---|
| Casual players | Quick fun, easy to understand, low friction |
| Social players | Leaderboards, gifting, club features |
| Collectors | Unlockables, themes, progression |
| High-intensity | Long sessions, big win fantasy |

---

## Competitor Benchmarks

| App | Key Lesson for Our Build |
|---|---|
| Slotomania | Large machine library, meta progression |
| Jackpot Party | Event cadence, reward messaging |
| Huuuge Casino | Social/club structure |
| DoubleDown Casino | Classic slot UX, retention loops |
| Coin Master | Slot loop tied to meta-game economy |

---

## Key Terminology

- **RNG**: Random Number Generator
- **CSPRNG**: Cryptographically Secure RNG (recommended)
- **Virtual Reel**: Software reel model larger than visible art
- **Payline**: Pattern of positions that defines a win
- **Scatter**: Symbol that pays regardless of position
- **Wild**: Substitute symbol
- **Near Miss**: Losing outcome that looks almost like a win
- **LDW (Loss Disguised as Win)**: Net-loss outcome celebrated like a win — avoid this
- **Game Recall**: Ability to replay/reconstruct previous outcomes

---

## Resources

| Resource | Link |
|---|---|
| MDN Web Docs — Web Audio API | [Link](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) |
| MDN Web Docs — IndexedDB | [Link](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) |
| MDN Web Docs — requestAnimationFrame | [Link](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) |
| MDN Web Docs — Vibration API | [Link](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) |
| MDN Web Docs — Image Formats (WebP/AVIF) | [Link](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types) |
| NIST — Random Bit Generators | [Link](https://csrc.nist.gov/publications/detail/sp/800-90a/rev-1/final) |
| Clean Code Principles | [Link](https://www.freecodecamp.org/news/clean-coding-for-beginners/) |
| Playwright E2E Testing | [Link](https://playwright.dev/) |
| JSDoc Documentation | [Link](https://jsdoc.app/) |


## User Research — Slot Machine Players
**Researcher:** Woosik Kim  
**Date:** April 18, 2026

---

## Key Takeaways

- Target audience: **adults 18–54**, slight male skew, mixed income levels
- Primary motivations: **fun, reward-seeking, social play, escapism**
- Build for **short sessions, low cognitive load, clear feedback**
- Avoid: false-win celebrations, unclear odds, aggressive monetization

---

## Who Plays These Games

| Characteristic | Finding |
|---|---|
| Age range | 18–54 most common |
| Gender | Slight male skew (62% male in one study) |
| Motivation | Enhancement (fun/challenge) > Rewards > Social |
| Play style | Short sessions, quick entertainment |

**Two main segments to design for:**
1. **Casual user** — wants quick fun, simple rules, low friction
2. **Progression/social user** — wants clubs, collections, events, leaderboards

---

## What Users Enjoy

1. **Rapid feedback** — outcomes resolve quickly, unpredictable reward schedule creates excitement
2. **Audiovisual reinforcement** — music + animation tied to wins increases positive experience
3. **Simplicity** — easy to pick up, suitable for short breaks
4. **Meta-progression** — albums, collectibles, passes, level rewards beyond base spinning
5. **Social features** — clubs, gifting, team goals, tournaments

---

## What Frustrates Users

| Frustration | Solution for Our Build |
|---|---|
| Confusing odds/paytable | Use plain language + worked examples, not just RTP % |
| Monetization pressure | Keep purchases optional, no forced spending to continue |
| Technical instability | Persist game state so interrupted sessions can resume |
| Misleading win celebrations | Never celebrate net-loss outcomes |

---

## What Drives Retention

| Feature | Priority | Notes |
|---|---|---|
| Daily rewards | ✅ High | Low-friction reason to return daily |
| Time-limited events | ✅ High | Adds urgency and novelty |
| Meta-progression | ✅ High | Goals beyond just spinning |
| Social clubs/leaderboards | ⚠️ Medium | Optional, not forced |
| Content refresh | ⚠️ Medium | New themes/slots periodically |

**Recommended for our build:** daily reward + one progression layer + optional leaderboard

---

## Ethical Design Considerations

- ❌ No **LDW (Loss Disguised as Win)** — never celebrate net-loss outcomes with sounds/animations
- ❌ No autoplay or turbo-spin features
- ✅ Clear **paytable/help screen** in plain language
- ✅ Visible **session timer**
- ✅ Clear **"virtual currency only"** labeling
- ✅ Easy **resume-or-exit** flow after interruption

---

## User Personas

### Persona 1: Maya, 24
- **Background:** Graduate student, plays on phone/laptop during short breaks
- **Goals:** Quick fun, low learning curve, daily check-in reason, light social play
- **Frustrations:** Cluttered UI, unclear paytables, spammy popups, long loading times
- **Design implication:** Clean UI, fast load, simple onboarding, optional social features

### Persona 2: Daniel, 43
- **Background:** Office manager, plays in the evening to unwind
- **Goals:** Relaxing sessions, fair feedback, recoverable progress, steady progression
- **Frustrations:** Lost progress after disconnects, repeated loud effects, pressure to buy chips
- **Design implication:** State persistence, volume controls, no aggressive monetization

---

## User Stories

1. As a **casual player**, I want to **understand the paytable quickly** so that **I know what symbols and features matter**.
2. As a **returning player**, I want to **claim a daily reward** so that **I have a reason to open the game without feeling pressured**.
3. As a **social player**, I want to **join an optional leaderboard** so that **I can compete lightly with friends**.
4. As a **browser player**, I want my **interrupted session to resume correctly** so that **I don't lose a bonus or spin result if the tab closes**.
5. As a **risk-aware player**, I want to **see my session time** so that **I can stay in control of how long I play**.

---

## Resources

| Resource | Link |
|---|---|
| MDN — Web Audio API | [Link](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) |
| MDN — IndexedDB (state persistence) | [Link](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) |
| UK Gambling Commission — Safer Design | [Link](https://www.gamblingcommission.gov.uk/licensees-and-businesses/guide/page/remote-gambling-and-software-technical-standards) |
| WHO — Gambling Harm Fact Sheet | [Link](https://www.who.int/news-room/fact-sheets/detail/gambling) |
| Playwright — E2E Testing | [Link](https://playwright.dev/) |

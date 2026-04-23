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


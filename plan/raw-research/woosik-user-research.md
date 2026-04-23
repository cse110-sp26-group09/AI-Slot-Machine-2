# User Research — Slot Machine Players
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

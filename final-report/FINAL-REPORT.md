**Team:** Akatsuki (Team 09)  
**Project:** AI-Driven Slot Machine Spongebob + Akatsuki  
**Date:** April 21, 2026  
**Harness:** Codex 5.3 High Reasoning

---

## 1. Executive Summary
Can Generative AI be used as a high-quality engineering tool? 
We evolved a basic slot machine through 16 iterations using Codex 5.3 High Reasoning. 
By doing our domain research with PRNG mechanics, user psychology, and mobile-first UI, 
the AI developed "Bikini Bottom Reels," a modular and tested application.

---

## 2. AI Strategy & Log Analysis
### 2a Prompt Evolution
* **Baseline Phase (Candidates 01–16):** We did 16 non-themed runs 
  to produce a "baseline" slot machine with functional core logic 
* **SpongeBob Track (Candidates 05–08):** We did the SpongeBob theme 
  to this subset, focusing on a bubbly UI and themed sound effects.
* **Akatsuki Track (Candidates 13–16):** We did the Akatsuki theme 
  to this subset, emphasizing high-contrast graphics and character-specific assets.
* **Final Selection:** After evaluating the best candidates from each 
  track, we determined **SpongeBob Candidate 06** was the best 
  thing we had. It had polished animations and UI layout, and evidently
  combined the strongest functional logic with the best visual assets.

### 2b Manual Hand-Editing
We definitely adopted an AI-first mentality.
* **Manual Intervention:** Manual edits were only made after the AI failed 
  thematic tasks, such as correctly mapping Akatsuki character names in 
  Candidate 13 or removing confusing acronyms as subtitles in Candidate 08.
---

## 3. Engineering Standards & Quality

### Candidate Evolution Table
| Candidate | Track | Major Achievement | Result/Observation |
| :--- | :--- | :--- | :--- |
| **01-16** | Baseline | Core PRNG Logic | Functional but limited features. |
| **05-08** | SpongeBob | Themed | Success; Candidate 06 selected. |
| **13-16** | Akatsuki | Themed | Success; character name bugs. |
| **06** | Final | "Bikini Bottom Reels" | Best thing we saw. |

---

## 4. Domain-Research-Driven Design
We focused on three key research areas, especially for "Bikini Bottom Reels"

### 4a Systems & Psychology (Daniel Wu)
* **Engine Realism:** Results are decided by PRNG systems.
  We do reel animations for this process.
* **Responsible Play:** We did age verification, session spend tracking, 
  and loss-limit guardrails.

### 4b Aesthetics & Math (Josh Victoria)
* **Volatility & RTP:** Research on **Return to Player** (RTP) influenced 
  payout transparency and paytable visibility.
* **Near-Miss Effect:** "Anticipation loops" for near-miss outcomes. The idea of "almost winning" is so important to increase engagement without deception.

### 4c UI/UX & Mobile (Waleed Alghaithi)
* **Interaction Zones:** Clustered controls for one-handed commute play 
  based on mobile traffic data.
* **Celebration Tiers:** Tiered celebrations, like coin fountains. They need to escalate in intensity based on payout size.

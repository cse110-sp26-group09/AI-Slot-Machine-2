# Research Overview

This document summarizes the team’s research findings for Warm-Up 2 and explains how that research informed our prompting, refinement, evaluation, and final candidate selection process.

Our research was used to improve:
- slot machine realism
- UI/UX decisions
- reward and retention mechanics
- accessibility and session transparency
- responsible play features
- theme integration
- final prompt refinement quality

---

## Research Summary

### 1. Daniel Wu — Slot Machine Systems, Psychology, Retention, and Regulation Research
Daniel’s research focused on how real slot machines work, why they are engaging, and what design constraints matter from both behavioral and regulatory perspectives.

#### Key findings
- Online slot players are commonly between **25–44**, with a large share of players between **18–39**
- Mobile dominates online gambling traffic, which supports designing for clear controls, readable UI, and compact interaction flows
- Slot outcomes are determined by **PRNG / RNG systems**, meaning the result is decided instantly when the player spins and the reel animation is a presentation layer
- Important mathematical concepts include:
  - **RTP (Return to Player)**
  - **house edge**
  - **paylines**
  - **symbol types** such as wilds and scatters
- Core psychological mechanisms include:
  - **near-miss effect**
  - **variable-ratio reinforcement**
  - **dopamine from anticipation**
  - **losses disguised as wins**
  - **illusion of control**
  - **time distortion**
  - **audio reinforcement**
- Retention systems frequently used in modern slot products include:
  - daily rewards
  - cashback systems
  - loyalty tiers
  - XP / progression
  - progress bars
  - daily missions
  - personalized re-engagement systems
- Regulation-inspired constraints include:
  - autoplay restrictions
  - spin speed minimums
  - age verification
  - session/deposit limits
  - loss-limit protections
  - reality checks

#### How this influenced the project
Daniel’s research strongly informed our decision to include:
- age verification
- session transparency
- loss-limit guardrails
- loyalty/reward systems
- visible payout/rules information
- more realistic reel behavior and spin anticipation
- better understanding of how slot machines balance excitement with control

---

### 2. Josh Victoria — Aesthetics, Math, Psychology, and Slot Terminology Research
Josh’s research focused on how slot themes, audiovisual design, and mathematical concepts shape the overall player experience.

#### Key findings
- Strong visual themes increase immersion and make games more memorable
- Thematic sound design is critical to aesthetic engagement
- Symbols, bonus mechanics, and audiovisual presentation all contribute to product appeal
- Important mathematical concepts for slot design include:
  - **RTP**
  - **volatility**
  - **hit frequency**
  - **RNG independence**
- Important psychological hooks include:
  - **variable-ratio reinforcement**
  - **near-miss effect**
  - **illusion of control**
- Common slot terminology includes:
  - paytable
  - payline
  - wild
  - scatter
  - cascading reels
  - megaways
  - expanding reels
  - multipliers
  - bonus round
  - bet level

#### How this influenced the project
Josh’s research influenced:
- our emphasis on **theme consistency**
- the role of **music and sound effects**
- the need for clear **paytable visibility**
- how we framed payout clarity and terminology for users
- the balance between exciting presentation and understandable mechanics

---

### 3. Waleed — UI, UX, Visual Themes, and Interaction Research
Waleed’s research focused on modern slot machine presentation patterns, especially UI layout, mobile-first interaction zones, and audiovisual reinforcement.

#### Key findings
- Popular slot themes often include:
  - ancient civilizations
  - mythology
  - classic nostalgia
  - gold/wealth motifs
- Modern slot products are often **mobile-first** and designed around clear action zones
- Information hierarchy usually emphasizes:
  - current balance
  - total bet
  - win amount
  - hidden or secondary paytable access
- Strong audiovisual loops include:
  - anticipation slowdowns when near bonus triggers
  - tiered win celebrations based on payout size
  - escalating visual intensity for large wins
  - idle prompts and motion cues to encourage continued engagement
- Interaction paradigms often include:
  - **slam stop**
  - **swipe to spin**
  - coin collection interactions
- High-quality mobile products increasingly include:
  - haptics
  - floating controls
  - progression overlays
  - responsive interaction feedback

#### How this influenced the project
Waleed’s research influenced:
- gameplay layout hierarchy
- reel-area emphasis
- the design of our control placement
- pacing and anticipation mechanics
- bigger celebratory feedback for higher-value wins
- stronger attention to UI clarity and modern presentation patterns

---

## Combined Research Takeaways

Across the team’s research, several themes consistently appeared:

### Product realism
We learned that slot machines are not just random reels on a screen. Real products rely on:
- strong audiovisual feedback
- anticipation mechanics
- careful payout presentation
- progression systems
- retention loops
- clearly structured controls

### User engagement
The research showed that users are strongly influenced by:
- near-misses
- sound design
- reward pacing
- progression systems
- strong visual themes
- simple interaction flows

### Transparency and guardrails
Research also showed the importance of:
- payout visibility
- age verification
- session limits
- loss control
- responsible-play reminders
- keeping the experience understandable rather than purely flashy

### Theme and polish
The team’s research supported the idea that theme is not just decoration. Theme affects:
- symbol design
- sound design
- reward feedback
- interface cohesion
- perceived quality of the product

These combined findings shaped how we refined prompts and evaluated candidate quality.

---

## How Research Informed Prompting

The research was used throughout the prompt-engineering process to improve candidate quality.

We used it to:
- move from generic slot prompts to more targeted product prompts
- ask for stronger sound design and better reward feedback
- request realistic spin pacing and anticipation
- emphasize session tracking and payout transparency
- include loyalty and replay hooks
- preserve accessibility and guardrail features
- strengthen theme cohesion in final candidates

As prompting evolved, research gave us a better basis for:
- what to ask for
- what to preserve
- what to refine
- what to compare during evaluation

---

## Team Contributions

### Aditya Jadhav — Lead Prompt Engineer
Aditya led the prompting strategy across the assignment. Responsibilities included:
- defining the iterative prompting workflow
- creating and refining master prompts
- connecting research insights to prompt design
- guiding feature-level evaluation
- synthesizing strengths across multiple candidates
- structuring refinement prompts for stronger final outputs
- leading the final refinement and selection logic

### Jason Nguyen — Prompt Engineer
Jason contributed to the **SpongeBob prompt track**, helping generate and refine prompt directions related to theme execution, candidate quality, and final product shaping.

### Fahad Majidi — Prompt Engineer
Fahad contributed to the **SpongeBob prompt track**, helping with prompt iteration, feature direction, and theme-specific refinement toward the final winning candidate.

### Daniel Wu — Research
Daniel contributed the research on:
- slot machine demographics
- RNG / RTP / engine realism
- behavioral psychology
- retention systems
- regulatory and responsible-play constraints

### Josh Victoria — Research
Josh contributed the research on:
- visual design and theme engagement
- sound and aesthetics
- slot machine math concepts
- psychological hooks
- slot terminology

### Waleed Alghaithi — Research
Waleed contributed the research on:
- slot machine UI/UX patterns
- layout hierarchy
- mobile-first interaction zones
- audiovisual reinforcement
- celebration tiers
- common theme structures

### Woosik — Research
Woosik contributed to the research through:
- user persona development
- design and interaction insights


### James Villanueva — Dev Lead
James served as the development lead, overseeing implementation work. Responsibilities included:
- executing prompts in Codex to generate code and features
- fixing bugs and issues that arose from generated code
- running refinement prompts to improve candidate implementations
- coordinating dev team prompting efforts
- helping shape prompting direction and candidate quality

### Hieu Le — Developer
Hieu contributed to development by:
- executing prompts in Codex to build features
- fixing bugs and debugging generated code
- running iterative refinement prompts

### Alexis — Developer
Alexis contributed to development and presentation by:
- executing prompts in Codex to implement features
- helping with bug fixes and code refinement
- contributing to slides and presentation materials

### Hemendra — Developer
Hemendra contributed to development by:
- executing prompts in Codex to build features
- helping with prompting and code debugging

---

## Final Note
The team’s research directly improved both the prompting process and the final product quality. It helped the project move beyond a simple generated slot machine into a more intentional, user-aware, and product-like design process.

These findings shaped how we evaluated candidates and helped inform the path toward our final selected winner: **SpongeBob Candidate 6**.

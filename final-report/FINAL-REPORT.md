# Holistic Final Report

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
We focused on three key research areas, especially for "Bikini Bottom Reels."

### 4a Systems & Psychology
* **Engine Realism:** Results are decided by PRNG systems.
  We do reel animations for this process.
* **Responsible Play:** We did age verification, session spend tracking, 
  and loss-limit guardrails.

### 4b Aesthetics & Math
* **Volatility & RTP:** Research on **Return to Player** (RTP) influenced 
  payout transparency and paytable visibility.
* **Near-Miss Effect:** "Anticipation loops" for near-miss outcomes. The idea of "almost winning" is so important to increase engagement without deception.

### 4c UI/UX & Mobile
* **Interaction Zones:** Clustered controls for one-handed commute play 
  based on mobile traffic data.
* **Celebration Tiers:** Tiered celebrations, like coin fountains. They need to escalate in intensity based on payout size.

---

## 5. Persona-Driven Design Strategies
We also focused on seven unique user archetypes to make sure my final product addressed lots of behavioral needs.

### 5a Transparency & Analytical Trust
* **Spend Transparency:** People like Adi Zelersteins and Sarah Kim 
  want a real-time summary of net profit/loss to make 
  informed, logical decisions.
* **Budget Tracking:** So, we implemented the "spend transparency"
  features where users see session spend alongside 
  their balance.
* **Verified Fairness:** For analytically driven players like 
  Jason Hermandre, we focused on transparency with verified RTP percentages.

### 5b Sensory Feedback & Engagement
* **Escalating Celebrations:** Players like Jake Smith and Jake 
  Miller CRAVE the "casino rush," so we did tiered celebrations.
* **Multi-Sensory Interface:** We added screen shakes and 
  coin fountains to make digital wins feel viscerally 
  rewarding.
* **Expressive Aesthetics:** Entertainment seekers like Sarah Kim and Adi want visually stunning themes.
  
### 5c Accessibility & Responsible Play
* **High-Contrast Needs:** Older folks like Carrie White 
  need high-contrast visuals and large text to play.
* **Interface Guardrails:** We added the "large-print." 
  interface and accessible controls.
* **Automatic Limits:** We added a feature that
  immediately pauses the session when there's a loss limit.

### 5d Progression & Community
* **Loyalty Visibility:** Frequent players like Adi and Jake 
  Miller want XP balances and reward tiers 
* **Visual Progress:** We have constant progression 
  meters so that the time investment feels rewarding even
  when it may actually isn't.
  
## End-of-Process Reflection

### Summary
- **What kinds of tasks were AI most useful for?** \\
  AI was best at consistently giving baseline slot machines that actually worked. It also did pretty well with iterative improvements. Once we had something decent, we could keep prompting for better visuals, smoother animations, and cleaner UI. The themed outputs, especially SpongeBob and Akatsuki, improved a lot over time as we gave them more direction. On top of that, it did a decent job for small, targeted fixes. When we clearly pointed out an issue, like removing a UI element or adjusting layout, it was usually handled quickly and correctly. Toward the end, it was also useful for merging features from different candidates into one final version.

- **Where did AI struggle?** \\
  AI struggled the most with complex logic and consistency. There were multiple cases where core features broke, like the spin mechanic not working and the spin zone being incorrectly implemented. It also had trouble when prompts were too specific or overloaded. If we tried to do too much in one prompt, the output would sometimes completely fail (like a missing CSS). There was a clear upper limit to how much complexity it could handle at once. The UI layout was another weak point. The AI often produced designs with awkward spacing, empty areas, or misaligned elements. Like the AI feels so confident and stubborn in its ideas sometimes. 

- **What required human judgment most often?** \\
  Human judgment was most important for anything involving quality and consistency. The AI could generate something functional, but deciding whether it actually looked good or matched the intended theme was on us. We needed to audit every single one. We also had to step in for thematic accuracy. There were cases where names were wrong or not aligned with the Akatsuki/Spongebob theme, and those details mattered for the overall product. Fixing that required manual edits.

- **Did our prompting strategy improve over time?** \\
  Yes, and that made a big difference in results. Early on, our prompts were pretty general, and the outputs reflected that with basic or inconsistent quality. As we went on, we became more intentional. We started using role-based, story-based, persona-based prompts, and more specific language, especially for UI and design. That helped the AI produce more polished and consistent outputs.

- **How should AI be used in our future SWE workflow?** \\
  AI should be used as a tool, not something we rely on completely. It's very effective for generating initial code, speeding up repetitive work, and helping with smaller refinements. But I wouldn't trust it with core logic or major design decisions without verification. I don't want to be taken to a ChatGPT doctor, or a ChatGPT car-repair-person. There needs to be consistent human oversight, especially for debugging and ensuring overall quality. I feel like the best approach is to use AI for iteration and then refine and validate everything manually. Perfecting this balance is what actually leads to a strong, sustainable final product.

### Final Takeaway
**Write a short conclusion about whether and how AI was useful in this project.** \\
There is no doubt in my mind that AI is useful in this project. This project would not be possible without AI. The candidates would have been impossible to create just off our perseverance and sheer will. AI casts such a wide net when I ask it to create something. But it can be tamed if I ask it to. If I refine, refine, refine, prompt engineer, prompt engineer, and prompt engineer, then I can get a better product. But there is an upper limit to how good the outcome is. If I hypothetically really wanted to deploy a slot machine application and used AI exclusively, that program would be awful. AI just makes me a sausage, and I have no idea what's inside a sausage. It's a bunch of ground-up mishmash. It makes so many assumptions that I will never fully know. AI built these programs with an existing knowledge of the internet. Next year, if I ran this same project again, the outputs could look completely different depending on the model, the training data, and even small changes in how I prompt it. This lack of consistency makes it hard to rely on AI as a standalone solution. It needs direction, oversight, and constant babysitting to actually produce something that meets real world standards.

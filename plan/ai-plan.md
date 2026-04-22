# AI Plan

## Project
Warm-Up 2: AI-assisted slot machine design, refinement, evaluation, and final selection

## Final Winner
**SpongeBob Candidate 6** was selected as the final winning candidate after multiple rounds of prompting, comparison, refinement, bug fixing, and evaluation.

---

## 1. Initial Strategy

Our initial strategy was to treat the assignment like a structured product iteration process rather than a one-shot code generation task.

We planned to:

- start with a **baseline prompt** to understand how well the model could generate a slot machine from a broad product description
- generate multiple candidate implementations from different prompt variants
- compare those candidates using a shared rubric
- identify strong and weak features at the **feature level**, not just the candidate level
- refine the strongest candidates with more targeted prompts informed by research, personas, and user stories
- preserve assignment alignment throughout the process, especially:
  - clear gameplay
  - understandable UI
  - transparency of bets and session results
  - responsible play features
  - maintainable code structure

From the beginning, the goal was not just to get a working slot machine, but to build the **best final product** through controlled iteration.

---

## 2. Baseline Prompting Phase

We began with a broad baseline prompt asking the model to create a slot machine using:

- vanilla HTML
- CSS
- JavaScript
- browser/platform APIs

The product theme at this stage was still general and exploratory. The purpose of the first prompt was to establish a starting point and observe:

- how complete the generated implementation was
- how the UI was structured
- whether the slot logic worked
- how much polish and product thinking the model showed on its own

This first phase helped us understand what the model could already do without much steering.

---

## 3. Structured Prompt Variation Plan

After the baseline phase, we moved to a more systematic plan.

We created a workflow where:

- multiple prompt variants would be generated
- each prompt variant would produce multiple candidates
- candidates would be compared and narrowed down through selection rounds
- later prompts would build on research and targeted refinement instead of generic instructions

The intent was to avoid random iteration and instead follow a process similar to product development:

1. generate
2. evaluate
3. shortlist
4. refine
5. compare again
6. select final winner

---

## 4. Research-Driven Prompting

To make the prompting more realistic and more aligned with human-centered design, we introduced:

- slot machine market and behavioral research
- personas
- user stories
- engine and payout behavior research
- retention / replay mechanics research
- responsible play and regulation-inspired constraints

This research helped us move the project from “make a slot machine” to “make a slot machine for specific kinds of users with clear needs, motivations, and frustrations.”

### Research themes used
We considered:

- player demographics
- near-miss effect
- variable-ratio reinforcement
- dopamine / anticipation loops
- losses disguised as wins
- loyalty systems and progression
- RTP / payout transparency
- autoplay and session concerns
- accessibility and responsible-play expectations

### Personas and user stories
We then used personas and user stories to influence the prompt design. This allowed prompt variations to focus on different user expectations, such as:

- clarity and transparency
- replay value
- strong audiovisual feedback
- accessibility
- loyalty and progression
- session spend awareness
- realistic casino atmosphere
- easy-to-understand paytables and controls

This was a major step in improving prompt quality.

---

## 5. Prompt Variation Strategy

Once research was incorporated, we created multiple prompt families.

The idea was to create prompts that emphasized different combinations of:

- personas
- user stories
- product priorities
- UI / UX expectations
- realism
- engagement
- transparency
- responsible play

Instead of asking the model to do everything at once, each prompt variation emphasized a different design direction.

This helped us compare:
- which prompts led to better structure
- which prompts led to better UX
- which prompts led to better logic
- which prompts led to more complete products

---

## 6. Evaluation Approach

We evaluated candidates using a shared rubric centered around:

- **Functionality**
- **Simplicity / correct use of tools**
- **User experience**
- **Responsiveness / bugs**

During evaluation, we learned that simply picking the “coolest” candidate was not enough. A candidate might have:

- better UI but weaker logic
- better animations but missing features
- better sound but poor layout
- better polish but incomplete symbol coverage

So our evaluation evolved into a **feature-level comparison process**.

---

## 7. Feature-Level Comparison Method

Instead of only asking which candidate was “best overall,” we began comparing candidates by specific features.

We identified strengths such as:

- best loading screen
- best spin animation
- best title/banner treatment
- best layout
- best guardrails/settings section
- best sound implementation
- best payout/rules clarity
- best symbol coverage
- best win celebration
- best product flow
- best code structure / maintainability

This allowed us to build a stronger refinement plan, because we could intentionally preserve the best parts from different candidates.

This was one of the most important changes in our AI strategy.

---

## 8. Refinement Philosophy

As we moved into refinement rounds, we established an important rule:

> **Refinement should preserve working logic and assignment-aligned features, not rebuild everything from scratch.**

This became one of our core prompting principles.

Each refinement prompt emphasized:

- preserve what already works
- do not remove working features
- do not break betting logic
- do not change the stack
- improve polish on top of stable foundations
- integrate theme assets carefully
- keep code maintainable
- prioritize product cohesion over random feature addition

This helped us avoid destructive rewrites.

---

## 9. Themed Refinement Phase

Later in the process, we introduced stronger theme-specific refinement directions.

One major branch of refinement involved themed candidates, where we supplied:

- background images
- banner images
- patterned textures
- custom sound files
- icon assets
- a defined palette and aesthetic direction

This phase taught us that AI output improved significantly when we gave it:

- clearer asset mapping
- clearer visual hierarchy
- clearer preservation rules
- stronger product constraints
- stronger references to prior candidate strengths

We also learned that themed refinement worked best when paired with explicit instructions such as:

- what to preserve
- what to improve
- what candidate feature to emulate
- what layout issues to fix
- what not to break

---

## 10. Bug Fixing and Human Intervention

Although AI handled a large portion of generation and refinement, some manual intervention was still necessary.

We used in-editor manual fixes when:
- a candidate had a minor navigation issue
- a back button was missing
- a layout alignment issue needed correction
- a small bug needed patching without regenerating the whole candidate

Whenever manual edits were made, they were treated as targeted corrections rather than uncontrolled redesigns.

This preserved the spirit of the AI-driven workflow while keeping candidates usable and comparable.

---

## 11. What We Learned About Effective Prompting

Over the course of the assignment, our prompting strategy became more sophisticated.

### Early prompts
Early prompts were broad and useful for exploration, but they often produced:
- incomplete products
- inconsistent UI hierarchy
- missing features
- weaker layout balance
- uneven polish

### Later prompts
Later prompts became much more effective because they included:
- research context
- personas and user stories
- candidate-specific references
- preservation rules
- feature borrowing instructions
- explicit hierarchy
- acceptance criteria
- clearer product goals

### Key lesson
The best prompting was not the most verbose prompt.  
The best prompting was the one that clearly defined:

- what problem we were solving
- what user experience mattered
- what constraints had to stay intact
- what prior candidate strengths should be reused
- what tradeoffs mattered most

---

## 12. Why SpongeBob Candidate 6 Won

After all rounds of generation, comparison, refinement, and evaluation, **SpongeBob Candidate 6** was selected as the final winner.

It was chosen because it best balanced the qualities we cared about most:

- product completeness
- gameplay clarity
- theme integration
- usability
- polish
- working logic
- overall feel as a final deliverable

Rather than winning on only one flashy trait, it emerged as the strongest **overall product**.

The final decision reflected our overall strategy:
- not just choosing the most visually impressive version
- not just choosing the most technically dense version
- but choosing the candidate that best combined **working functionality, strong design, and complete product feel**

---

## 13. Final AI Workflow Summary

Our overall AI workflow was:

1. Create baseline prompt
2. Generate initial candidate set
3. Perform research on players, mechanics, and responsible play
4. Build personas and user stories
5. Create more targeted prompt variations
6. Generate additional candidates
7. Evaluate using shared rubric
8. Compare candidates feature by feature
9. Shortlist strongest candidates
10. Refine with preservation-first prompts
11. Use theme-specific assets and higher-fidelity product guidance
12. Apply targeted manual fixes where necessary
13. Compare finalists again
14. Select final winner: **SpongeBob Candidate 6**

---

## 14. Engineering / Process Principles We Followed

Throughout the process, we tried to keep the work aligned with software engineering expectations:

- iterative development
- comparison through explicit criteria
- preservation of stable working logic
- modular thinking
- human review of AI output
- targeted refinement instead of blind regeneration
- balancing creativity with assignment constraints

We treated AI as:
- a generator
- a refiner
- a rapid prototyping assistant
- and a structured ideation partner

But not as something to trust blindly.

---

## 15. Final Reflection

The strongest result came from combining:

- broad exploration at the start
- research-driven prompting in the middle
- feature-level evaluation
- preservation-focused refinement
- careful human oversight
- and final synthesis based on actual observed candidate strengths

This process produced a much better final outcome than using one prompt and accepting the first result.

AI was most effective when given:
- clear structure
- specific user-centered goals
- concrete constraints
- and grounded feedback from prior iterations

That is how we progressed from an initial exploratory baseline to a polished final winner: **SpongeBob Candidate 6**.

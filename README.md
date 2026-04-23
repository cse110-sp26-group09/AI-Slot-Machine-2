# AI-Slot-Machine-2

This repository contains our team’s work for our warmup 2 exercise.

## Overview

The goal of this assignment is to determine whether and how generative AI can be used responsibly in a real software engineering workflow. Unlike the earlier slot machine experiment, this warm-up is not about luck or repeated frozen runs. Instead, it focuses on whether a team can use AI more strategically to build a **significantly improved slot machine** while following basic software engineering practices such as planning, user-centered thinking, documentation, testing, linting, and clean code.

## Core Questions

By the end of this project, our team aims to answer:

- What challenges come up when using AI to build software engineering quality code?
- How much do planning and research improve outcomes?
- How important are user needs, software quality, and team discipline?
- If AI is useful in our project workflow, how should we use it going forward?

## Repository Structure

```text
AI-Slot-Machine-2/
├── .gitignore
├── README.md
├── package.json
├── candidates/
│   ├── README.md
│   ├── akatsuki-candidates/
│   │   ├── candidate-13/
│   │   ├── candidate-14/
│   │   ├── candidate-15/
│   │   └── candidate-16/
│   ├── candidate-01/
│   │   ├── index.html
│   │   ├── README.md
│   │   ├── stats.md
│   │   ├── scripts/
│   │   └── styles/
│   ├── candidate-02/
│   │   ├── index.html
│   │   ├── stats.md
│   │   ├── scripts/
│   │   └── styles/
│   ├── candidate-03/
│   │   ├── index.html
│   │   ├── stats.md
│   │   ├── scripts/
│   │   └── styles/
│   ├── candidate-04/
│   │   ├── index.html
│   │   ├── README.md
│   │   ├── stats.md
│   │   ├── docs/
│   │   ├── scripts/
│   │   └── styles/
│   ├── candidate-05/
│   │   ├── index.html
│   │   ├── stats.md
│   │   ├── assets/
│   │   ├── scripts/
│   │   └── styles/
│   ├── candidate-06/
│   │   ├── index.html
│   │   ├── stats.md
│   │   ├── assets/
│   │   ├── scripts/
│   │   └── styles/
│   ├── candidate-07/
│   │   ├── index.html
│   │   ├── stats.md
│   │   ├── assets/
│   │   ├── scripts/
│   │   └── styles/
│   ├── candidate-08/
│   │   ├── index.html
│   │   ├── stats.md
│   │   ├── assets/
│   │   ├── scripts/
│   │   └── styles/
│   ├── candidate-09/
│   │   ├── esbuild.config.js
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── stats.md
│   │   ├── client/
│   │   └── server/
│   ├── candidate-10/
│   │   ├── esbuild.config.js
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── stats.md
│   │   ├── client/
│   │   └── server/
│   ├── candidate-11/
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── stats.md
│   │   ├── client/
│   │   ├── scripts/
│   │   └── server/
│   ├── candidate-12/
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── stats.md
│   │   ├── client/
│   │   ├── scripts/
│   │   └── server/
│   ├── candidate-13/
│   │   ├── index.html
│   │   ├── stats.md
│   │   ├── assets/
│   │   ├── scripts/
│   │   └── styles/
│   ├── candidate-14/
│   │   ├── index.html
│   │   ├── stats.md
│   │   ├── assets/
│   │   ├── scripts/
│   │   └── styles/
│   ├── candidate-15/
│   │   ├── index.html
│   │   ├── stats.md
│   │   ├── assets/
│   │   ├── scripts/
│   │   └── styles/
│   ├── candidate-16/
│   │   ├── index.html
│   │   ├── stats.md
│   │   ├── assets/
│   │   ├── scripts/
│   │   └── styles/
│   ├── Final-Candidates/
│   │   ├── Akatsuki/
│   │   └── Spongebob/
│   └── spongebob-candidates/
│       ├── candidate-05/
│       └── candidate-06/
├── docs/
│   ├── README.md
│   └── prompting-notes.md
├── final-report/
│   ├── FINAL-REPORT.md
│   ├── presentation.pdf
│   ├── presentation-video.mp4
|   ├── demo-video.mp4
│   └── README.md
├── plan/
│   ├── README.md
│   ├── research-overview.md
│   ├── ai-plan.md
│   ├── ai-use-log.md
│   ├── personas/
│   │   ├── README.md
│   │   ├── Daniel-personas.md
│   │   ├── josh-personas.md
│   │   ├── waleeds_persona.md
│   │   └── woosik-personas.md
│   ├── user-stories/
│   │   ├── README.md
│   │   └── user-stories.md
│   └── raw-research/
│       ├── README.md
│       ├── daniel-research.md
│       ├── josh-research.md
│       └── waleeds_research.md
├── src/
│   ├── README.md
│   ├── index.html
│   ├── package.json
│   ├── assets/
│   │   ├── palette.md
│   │   ├── theme-notes.md
│   │   ├── audio/
│   │   ├── icons/
│   │   └── images/
│   ├── scripts/
│   └── styles/
└── tests/
    ├── game.test.js
    ├── payouts.test.js
    ├── reels.test.js
    ├── test-utils.js
```

## Quick Links

- Prompting notes: [docs/prompting-notes.md](docs/prompting-notes.md)
- Winner: `candidate-06` implementation finalized in `src/`
- Presentation demo (YouTube placeholder): [https://youtu.be/PLACEHOLDER](https://youtu.be/PLACEHOLDER)
- Presentation PDF: [final-report/presentation.pdf](final-report/presentation.pdf)
- Presentation video: [final-report/presentation-video.mp4](final-report/presentation-video.mp4)

## Team Process

We will:

- Perform domain and user research first
- Document our AI usage strategy in `plan/ai-plan.md`
- Keep a running log in `plan/ai-use-log.md`
- Build incrementally with frequent commits
- Test, lint, and document code as we go
- Only hand-edit code after first attempting a fix through AI, and log that decision

## Engineering Standards

Our codebase will aim to be:

- linted
- documented
- tested
- modular
- readable
- easy to update

## Final Deliverables

The final submission will include:

- A completed repository with all planning, code, tests, and logs
- A `final-report/FINAL-REPORT.md`
- A 4–7 slide presentation PDF
- A presentation video no longer than 4 minutes
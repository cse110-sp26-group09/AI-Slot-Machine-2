# Tests Directory

This directory contains automated test files for the AI Slot Machine project.

## Purpose

These tests verify core game behavior and payout logic for the slot machine implementation in `src/`.

## Files

- `game.test.js` — tests overall game flow and win/lose state behavior.
- `payouts.test.js` — verifies payout calculations and award logic.
- `reels.test.js` — checks reel spinning, symbol selection, and reel outcomes.
- `test-utils.js` — shared helper utilities used by the test files.

## Running Tests

Use the project test command from the repository root:

```bash
npm test
```

If a separate script exists for tests in `package.json`, run the configured command instead.

## Notes

- Keep tests small and focused on a single behavior.
- Update test expectations whenever the game rules or payout rules change.
- Use `test-utils.js` for shared setup, fixtures, and helper functions.

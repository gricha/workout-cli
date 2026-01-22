---
description: Run targeted tests based on changed files. Use after making code changes to verify they work.
---

# Test

Run tests for the workout CLI.

## Commands

| Command | What it runs |
|---------|--------------|
| `bun run test` | All tests once |
| `bun run test:watch` | Tests in watch mode |

## Test Location

- `test/*.test.ts` - All tests

## Steps

1. Check what changed:
   ```bash
   git diff --name-only HEAD
   ```

2. Run tests:
   ```bash
   bun run test
   ```

3. For specific test file:
   ```bash
   bun run test test/exercises.test.ts
   ```

## Notes

- Tests use vitest
- Focus on functionality, not coverage metrics
- Keep output concise - only report failures in detail

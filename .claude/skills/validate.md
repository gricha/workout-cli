---
description: Run full validation (lint, format, typecheck, tests, build) and warden code review. Use before committing or after changes.
---

# Validate

Run the full validation suite and code review to ensure code quality.

## Steps

1. Run the validation suite:
   ```bash
   bun run validate
   ```
   This runs:
   - `oxlint` - Linting with type-aware rules
   - `oxfmt --check` - Format verification
   - `tsc --noEmit` - Type checking
   - `vitest run` - Unit tests
   - `tsc` - Build

2. If validation passes, run warden for code review feedback:
   ```bash
   warden -v
   ```
   The `-v` flag streams findings in real-time (code simplification, bug detection).
   Fix any issues warden finds before proceeding.

## When to Use

- Before committing changes
- After making significant changes
- When CI fails and you need to reproduce locally

## Expected Output

All checks should pass with no errors. Warden findings should be addressed before proceeding.

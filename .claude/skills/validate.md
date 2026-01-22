---
description: Run full validation (lint, format, typecheck, tests, build). Use before committing or after changes.
---

# Validate

Run the full validation suite to ensure code quality.

## Command

```bash
bun run validate
```

This runs:
1. `oxlint` - Linting with type-aware rules
2. `oxfmt --check` - Format verification
3. `tsc --noEmit` - Type checking
4. `vitest run` - Unit tests
5. `tsc` - Build

## When to Use

- Before committing changes
- After making significant changes
- When CI fails and you need to reproduce locally

## Expected Output

All checks should pass with no errors. If any step fails, fix the issues before proceeding.

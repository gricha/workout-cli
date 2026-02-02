# Agent Workflow

## Warden Code Review

Running `npx @sentry/warden -v` is **required** once before creating a PR. Warden performs automated code review (simplification, bug detection) and its findings must be addressed before submitting. It only needs to be run once — do not re-run when creating the PR if it has already passed.

### When to run

- After all code changes are complete and `bun run validate` passes
- Before creating a pull request
- Only once per change set (no need to re-run after fixing warden findings unless substantial new code was added)

### Workflow

```
make changes → bun run validate → npx @sentry/warden -v → fix findings → create PR
```

Skipping warden risks shipping code that warden will flag during PR review, creating unnecessary back-and-forth. Always run it locally first.

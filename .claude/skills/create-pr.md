---
description: Create a pull request with a concise description. Use when ready to submit changes for review.
---

# Create PR

Create a pull request for the current branch.

## Prerequisites

1. All changes committed
2. Branch pushed to remote
3. Validation passing (`bun run validate`)

## Steps

1. Ensure clean state and validation passes:
   ```bash
   git status
   bun run validate
   ```

2. Push branch if needed:
   ```bash
   git push -u origin HEAD
   ```

3. Create PR with gh CLI:
   ```bash
   gh pr create --title "Brief title" --body "## Summary
   - Change 1
   - Change 2"
   ```

## PR Description Format

Keep it concise:

```markdown
## Summary
- 1-3 bullet points describing what changed and why

## Test Plan
- How the changes were verified
```

## Notes

- Title should be brief and descriptive (imperative mood)
- Body should focus on "why" not "what" (code shows the what)
- Link to issues if applicable: `Fixes #123`

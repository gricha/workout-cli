# Agent Instructions

## Skills

Use the `skill` tool for common workflows:

| Skill | When to use |
|-------|-------------|
| `validate` | Before committing, after changes, to verify code quality |
| `test` | To run targeted tests for your changes |
| `create-pr` | To create a pull request with concise description |
| `release` | To cut a new version release |

## Architecture

Workout CLI is a command-line tool for tracking workouts, managing exercises, and querying training history.

- **Runtime**: Bun (not Node.js)
- **Language**: TypeScript with ES modules, strict mode
- **CLI**: Commander.js for command parsing
- **Storage**: JSON files in `~/.workout/`
- **Validation**: Zod schemas

## Project Structure

```
src/
├── index.ts           # CLI entry point
├── commands/          # Command implementations
├── data/              # Storage and data access
├── types.ts           # Zod schemas and types
└── exercises.ts       # Pre-populated exercise library
test/
└── *.test.ts          # Vitest tests
```

## Code Style

- Fight entropy - leave the codebase better than you found it
- Prefer simpler solutions where it reasonably makes sense
- Minimal dependencies
- Early returns, fail fast
- TypeScript strict mode
- No comments in code (self-documenting)

## Testing Philosophy

- Focus on functionality testing, not coverage metrics
- Test behavior, not implementation details
- Write tests for commands and data operations
- Don't chase vanity metrics

## Constraints

- No skipping failing tests
- Run `bun run validate` before committing
- Pre-commit hooks run linting and tests automatically

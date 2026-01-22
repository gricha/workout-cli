---
description: Cut a new version release. Use when ready to publish a new version.
---

# Release

Create a new release by tagging a version.

## Prerequisites

1. All changes committed and pushed
2. CI passing on main branch
3. Version bump in package.json (if needed)

## Steps

1. Ensure clean state:
   ```bash
   git status
   git pull origin main
   ```

2. Update version in package.json if needed:
   ```bash
   # Edit package.json version field
   bun run validate
   git add package.json
   git commit -m "Bump version to X.Y.Z"
   git push
   ```

3. Create and push tag:
   ```bash
   git tag v0.X.Y
   git push origin v0.X.Y
   ```

4. The release workflow will automatically:
   - Build binaries for all platforms (linux, darwin, windows - x64 and arm64)
   - Create GitHub release with artifacts
   - Generate checksums

## Version Guidelines

- **Patch** (0.0.X): Bug fixes, minor changes
- **Minor** (0.X.0): New features, backwards compatible
- **Major** (X.0.0): Breaking changes

## Notes

- Tags must start with `v` (e.g., `v0.1.0`)
- Release notes are auto-generated from commits
- Binaries available via `install.sh` after release

# Recordly Development Guidelines for Agents

## Repository Layout

- **Upstream (canonical repo):** `https://github.com/webadderallorg/Recordly` (`upstream` remote)
- **Personal fork (your workspace):** `https://github.com/Rocke1001feller/Recordly` (`origin` remote)
- **Default branch on `origin`:** `master`
- **Upstream default branch:** `main`

All new development must start from `origin/master` and be pushed to `origin` first.

## Branching Model

1. **Start every task from `master`:**
   ```bash
   git fetch upstream
   git checkout master
   git reset --hard origin/master
   ```
2. **Create feature/fix branches from `master`:**
   ```bash
   git checkout -b <type>/<short-description>
   ```
   Use prefixes: `fix/`, `feat/`, `build/`, `ci/`, `refactor/`, `docs/`.
3. **Keep branches focused.** One logical change per branch.
4. **Push to `origin`, never to `upstream` directly.**
   ```bash
   git push -u origin <branch>
   ```
5. **Open pull requests from `origin/<branch>` → `upstream/main`** when contributing back to the canonical repo.

## Commit & Merge Discipline

- Write conventional commits (`fix:`, `feat:`, `build:`, `ci:`, `refactor:`, `docs:`).
- End every commit message with:
  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```
- For branches that contain multiple exploratory commits, use **squash merge** into `master` so that `master` stays a clean, linear sequence of complete changes.
- Before merging to `master`, verify:
  - `npx tsc --noEmit`
  - `npm test` (or the relevant test file)
  - `npm run lint` introduces no new errors

## macOS-Specific Checks

Because this project builds signed, notarized macOS DMGs with native helpers:

- After modifying `electron/native/**/*.swift`, rebuild helpers:
  ```bash
  npm run build:native-helpers
  ```
- After modifying `electron-builder.json5` or entitlements, run the distribution verifier on a packaged build:
  ```bash
  npm run build:mac
  node scripts/verify-macos-distribution.mjs --arch arm64 --team-id <TEAM_ID>
  ```
- Do **not** commit unrelated, timestamp-only changes to native helper binaries.

## Permission & Security

- Do not push to `upstream` unless explicitly instructed.
- Do not commit secrets, certificates, or provisioning profiles.
- Do not run destructive commands (`git push --force`) on shared branches without confirmation.

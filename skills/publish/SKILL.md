---
name: publish
description: Use when preparing a new npm release for Spec Embryo. Bumps the package version, verifies publish-readiness, runs deterministic checks and `bun publish --dry-run`, then stops and hands the exact final publish command to the user because the real publish requires their 2FA approval.
---

# Publish

Use this skill when the user wants to prepare `@leonarto/spec-embryo` for npm publish.

## Goal

Make the repo publish-ready in a deterministic way, but never run the final public publish yourself.

At the end of this workflow, the agent should hand the user the exact `bun publish --access public` command and let them execute it.

## Default workflow

1. Inspect current release state:
   - `git status --short`
   - `cat package.json`
2. Decide the bump level:
   - use the user-specified bump if given
   - otherwise default to `patch` and state that assumption
3. Bump the version without auto-tagging:
   - `npm version patch --no-git-tag-version`
   - or `minor` / `major` when explicitly requested
4. Check publish-readiness:
   - package is not private
   - package name is still `@leonarto/spec-embryo`
   - `bin` entries still expose `spm` and `spec-embryo`
   - publish-relevant assets are still included
5. Run deterministic verification:
   - `bun test`
   - `bun run web:check`
   - `bun run check:agents`
   - `bun publish --dry-run --access public`
6. If the dry run is clean, summarize:
   - the new version
   - what changed to make publish ready
   - any remaining warnings
7. Stop and hand the user the final command:
   - `bun publish --access public`

## Required rules

- Do not run the final publish yourself.
- Treat `bun publish --dry-run --access public` as mandatory before handoff.
- If verification fails, fix what is deterministic to fix and re-run checks before handing back the publish command.
- If the worktree contains unrelated dirty changes that make the release risky, call that out clearly before proceeding.
- If package metadata or bundled assets drifted, fix them in the same change instead of only warning.
- If the real publish needs human confirmation or 2FA, stop and return the exact command for the user to run.

## Version-bump policy

- Default bump: `patch`
- Use `minor` when the user explicitly frames the release as new backward-compatible functionality.
- Use `major` only when the user explicitly intends a breaking release.
- Prefer `npm version <level> --no-git-tag-version` so git commit and tag flow stays explicit.

## Output contract

At the end, give the user:

- the package name
- the final version being prepared
- the checks that passed
- the exact publish command they should run next

If something is still blocking publish, do not give the final publish command as if it were ready.

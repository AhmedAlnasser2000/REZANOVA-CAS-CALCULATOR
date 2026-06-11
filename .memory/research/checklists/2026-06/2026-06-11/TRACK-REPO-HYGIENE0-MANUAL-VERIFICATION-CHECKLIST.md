# TRACK-REPO-HYGIENE0 Manual Verification Checklist

Date: 2026-06-11
Status: completed
Owner: codex

## Scope

- [x] Confirmed `REPO-HYGIENE0` was not already used as a prior milestone name.
- [x] Classified stale-looking workspace and route vocabulary without deleting or refactoring code.
- [x] Audited legacy `advancedCalculus`, hidden Trigonometry screens, guided Calculate calculus compatibility, legacy workbench paths, guide/replay routes, and schema vocabulary.
- [x] Marked compatibility seams that are unsafe to delete until tests or migrations exist.
- [x] Kept the audit read-only.

## Verification

- [x] `rg -n "REPO-HYGIENE0|REPO HYGIENE|repo hygiene|EQUATION-RESULT-HYGIENE" .memory src`
- [x] `npm run test:memory-protocol`
- [x] `git diff --check`

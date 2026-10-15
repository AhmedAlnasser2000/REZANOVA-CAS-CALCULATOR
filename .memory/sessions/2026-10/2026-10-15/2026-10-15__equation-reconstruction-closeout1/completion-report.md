# EQUATION-RECONSTRUCTION-CLOSEOUT1 PR A (stage 17)

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Authority and scope

- **2026-10-14:** the user approved stage 17 (corpus and capability ledger, then retirement) and dropped the old-engine parity bar. Every run past 60 s is fixed.
- **2026-10-15:**
  - fix all five last cases;
  - the complete case list for many parameters;
  - i in Real mode decided over ℂ and kept real.
- **Constraints:**
  - root-only, no subagents;
  - no caps, only typed stops, no partial answers;
  - files under 1000 lines;
  - the 60-second rule;
  - nothing in New Integration;
  - Galois groups or a shared factorization layer only with approval (neither used).

## Delivered

- The corpus, harness and report under `tools/equation-parity/`. The corpus is frozen and the tools cover the new core only.
- The fixes listed in `docs/architecture/equation/equation-reconstruction-closeout1-spec.md` (A2).
- The capability ledger `docs/architecture/equation/equation-capability-ledger.md` and four new deferred-items rows in the roadmap.

## Outcome

- **Final corpus run:**
  - ℝ: 1,053 exact, 16 certified, 383 typed refusals.
  - ℂ: 694 exact, 758 typed refusals.
  - 0 failed, 0 killed; 88 unreadable strings per domain.
- **Changes during the stage:** runs killed at 60 s went from 38 to 0; 25 internal errors and 4 verification failures were fixed.

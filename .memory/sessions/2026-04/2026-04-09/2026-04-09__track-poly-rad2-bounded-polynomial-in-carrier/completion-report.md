# POLY-RAD2 Completion Report

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.4
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.4
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.4
- attribution_basis: historical-user-confirmed

- Milestone: `POLY-RAD2 — Bounded Polynomial-in-Carrier Radical Follow-On for Equation`
- Status: verified
- Scope completed:
  - added `src/lib/equation/polynomial-carrier-follow-on.ts` as the shared bounded carrier bridge for Equation radical follow-ons
  - supported carrier families now include:
    - affine carriers `ax+b`
    - even-power affine carriers `(ax+b)^2`
    - shifted even-power carriers `(ax+b)^2+c`
    - direct quadratic carriers `ax^2+bx+c`
  - reused shared carrier branch-building from `src/lib/equation/composition-stage.ts` instead of duplicating radical-local back-solving logic
  - integrated the carrier bridge into `src/lib/equation/guarded/run.ts` so both `RAD2` sequential isolation and outer-inversion/composition handoff can reuse it
  - widened Equation-only radical recognition in `src/lib/equation/guarded/algebra-stage.ts` to allow bounded quadratic radicands needed to reach the bridge
  - kept the milestone Equation-first:
    - no intentional visible widening of `Calculate > Factor`
    - no intentional visible widening of `Calculate > Simplify`
- Key examples now covered:
  - `\sqrt{(x^2+x)^2-(x^2+x)}=1`
  - `\sqrt{x^2+x+\sqrt{5-(x^2+x)}}=2`
  - `\ln\left(\sqrt{(x^2+x)^2-5(x^2+x)+4}\right)=0`
  - `\sqrt{(2x+1)^4-5(2x+1)^2+4}=1`
- Important implementation notes:
  - the carrier bridge is only attempted from actual radical/composition follow-on contexts
  - original-equation validation remains authoritative after carrier back-solving
  - broader nonlinear carriers and repeated-radical expansion remain deferred to later milestones

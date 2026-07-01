# Equation Numeric Algorithm Discipline Next 5

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Completed Gates

- `EQUATION-NUMERIC-KERNEL-CONTRACT1`: added an internal real root-refinement kernel contract and routed the existing numeric interval sampler through it while preserving visible Brent-Dekker-style behavior.
- `EQUATION-NUMERIC-ITP-KERNEL1`: replaced the sign-change bracket refiner under the kernel contract with ITP and updated numeric method wording while preserving route order, interval/manual/auto-search eligibility, validation, and local-minimum recovery.
- `EQUATION-NUMERIC-SEGMENTATION-HARDEN1`: added bounded segmentation probes for denominator exclusions, log/root/fractional-power boundaries, affine trig poles, and sampled hazards; interval/manual/auto-search now uses those probes while keeping hard facts and diagnostic evidence in separate detail sections.

## Notes

- Normal Equation Solve/Run remains the only solve entry.
- Numeric Interval remains explicit local/windowed solving.
- TOMS 748 is retired from the planned path in favor of the upcoming ITP kernel.

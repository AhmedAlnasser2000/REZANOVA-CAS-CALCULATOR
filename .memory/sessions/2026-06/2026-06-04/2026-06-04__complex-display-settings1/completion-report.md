# COMPLEX-DISPLAY-SETTINGS1 Completion Report

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors:
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Summary

Implemented `COMPLEX-DISPLAY-SETTINGS1` as complex Equation readback/settings stabilization.

The milestone fixes the imaginary-unit display guard so `ImaginaryUnit` / `\imaginaryI` does not normalize into numeric `1`, and adds the persisted `complexExactForm` setting with three explicit exact branch forms: `rectangular`, `polar`, and `cis`.

## Completed

- Added `complexExactForm: 'rectangular' | 'polar' | 'cis'` with default `rectangular`.
- Threaded the setting through app-state schemas, Tauri settings sanitization, runtime Equation requests, OOE Equation snapshots/provenance, history entries, and replay context.
- Added a Settings `Complex` section for exact branch form selection.
- Preserved `i` as a reserved imaginary unit in symbolic display normalization and Equation analysis.
- Kept `j` and `k` as ordinary symbols.
- Updated bounded complex branch readback so selected-target powers and exact scalar complex branches can honor rectangular, polar, and cis forms.
- Preserved output style boundaries: `EXACT` uses the selected exact form, `DECIMAL` uses rectangular decimal branches, and `BOTH` uses selected exact main output plus approximate branch supplements.

## Boundaries Preserved

- No new complex solver family.
- No complex `Approximate` search.
- No complex `Isolate` solving.
- No stored complex values.
- No reserved-symbol override syntax.
- No non-Equation complex adoption.
- No OOE runtime behavior change.
- No Rust solver execution.

## Notes

`polar` means expanded `r(\cos(\theta)+i\sin(\theta))` notation. `cis` is opt-in and uses compact `r\operatorname{cis}(\theta)` notation. The top-header `Complex On/Off` button remains the domain-intent toggle only.

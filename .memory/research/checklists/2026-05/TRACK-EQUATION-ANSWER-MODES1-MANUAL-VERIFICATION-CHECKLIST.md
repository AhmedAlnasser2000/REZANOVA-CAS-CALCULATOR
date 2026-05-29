# TRACK-EQUATION-ANSWER-MODES1 Manual Verification Checklist

## Scope

- Add explicit Equation answer modes: `Exact`, `Approx`, and `Isolate`.
- Persist the selected answer mode and include it in Equation runtime/history/OOE snapshot intent.
- Keep Exact as strict symbolic behavior, Approx as the existing numeric interval lane only when numeric parameters are available, and Isolate as textbook formula rearrangement.

## Manual Checks

- [ ] `Exact` mode preserves selected-target symbolic results and stops controlled numeric-only fallback output.
- [ ] `Approx` mode opens/guides the numeric interval workflow and does not invent an interval.
- [ ] `Approx` mode uses the existing numeric interval solve when a valid interval is enabled.
- [ ] `Approx` mode stops when non-target symbolic parameters remain after stored-value substitution.
- [ ] `Isolate` mode on `u^2=a`, target `u`, shows the real `\pm\sqrt{a}` formula and `a\ge0`.
- [ ] `Isolate` mode on `u^3=a`, target `u`, shows `u=\sqrt[3]{a}` without broad Exact-mode detail sections.
- [ ] `Isolate` mode on `b^2+c^4v^3=uy\sqrt{k}`, target `v`, shows formula-style rearrangement and `c^4\ne0`.
- [ ] `Isolate` mode on `b/\sqrt{a+c+v+x}=u^2`, target `u`, shows the corresponding `\pm` square-root formula.
- [ ] `Isolate` mode on `b/\sqrt{a+c+v+x}=u^2`, target `x`, keeps the current target-containing denominator boundary.
- [ ] Huge symbolic examples stay readable and avoid monster exact expansion when Isolate is selected.
- [ ] Result cards show the selected answer mode.
- [ ] History replay restores or respects the saved Equation answer mode.
- [ ] Stored values remain ignored in Exact/Isolate symbolic Equation paths and keep existing numeric policy in Approx.

## Boundaries

- [ ] No new broad Equation solving family.
- [ ] No broad Exact-mode delegation from Isolate.
- [ ] No new target-containing denominator/radical solving.
- [ ] No broad simplification engine.
- [ ] No fake exact answers.
- [ ] No Equation symbolic stored-value substitution.
- [ ] No OOE runtime behavior change beyond snapshot metadata.

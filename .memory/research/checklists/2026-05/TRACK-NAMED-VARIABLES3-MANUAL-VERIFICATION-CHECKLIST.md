# TRACK-NAMED-VARIABLES3 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- attribution_basis: direct

## Scope

- [ ] Explicit named variables such as `@mass` and `var(mass)` can be Equation solve targets.
- [ ] Raw adjacent letters such as `mass` remain multiplication and expose the parsed single-letter targets.
- [ ] Raw adjacent-letter hints remain visible and do not imply one named variable.
- [ ] Equation symbolic stored values remain ignored/protected, including named stored values.
- [ ] Existing selected-target families are reused; no new solving family is introduced.

## Manual Checks

- [ ] Equation symbolic `@mass+2=7`, target `mass`, returns `mass=5` with upright target readback.
- [ ] Equation symbolic `x+@mass=7`, target `mass`, returns `mass=7-x`.
- [ ] Equation symbolic `@mass^2-a=0`, target `mass`, uses the existing quadratic selected-target path.
- [ ] Equation symbolic `1/(@mass-a)=b`, target `mass`, uses the existing rational selected-target path.
- [ ] Equation symbolic `sin(@mass)=a`, target `mass`, uses the existing trig selected-target path.
- [ ] Equation symbolic raw `mass=2` shows target choices for `a`, `m`, and `s`.
- [ ] Equation symbolic raw `mass=2`, target `s`, treats the input as `m*a*s*s=2`, not as one named variable.
- [ ] With stored `mass=5`, Equation symbolic target `mass` does not substitute the stored value.

## Boundaries

- [ ] Raw `mass` never becomes a named variable.
- [ ] Variables panel still inserts named variables as `@name`.
- [ ] No Equation symbolic stored-value substitution is added.
- [ ] No graphing, `POLY-ELIM2`, source-mirror work, or Labs runner work is included.


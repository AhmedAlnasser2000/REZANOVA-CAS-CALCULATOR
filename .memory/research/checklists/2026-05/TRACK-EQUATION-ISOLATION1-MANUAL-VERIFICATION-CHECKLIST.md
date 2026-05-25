# TRACK-EQUATION-ISOLATION1 Manual Verification Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- attribution_basis: direct

## Scope

- [ ] One selected-target island can be isolated through target-free add/subtract/multiply/divide shells.
- [ ] Generated equations delegate to existing selected-target helper files rather than adding a new solving family.
- [ ] Target-free denominator and nonzero facts such as `g+v\ne0` are preserved.
- [ ] Explicit named targets use the same isolation path as single-letter targets.
- [ ] Cube-root/power-isolation cases remain honest unsupported boundaries when they would need symbolic root isolation.

## Manual Checks

- [ ] Equation symbolic `(5f+4^p)/(g+v)+cx=34`, target `p`, returns a log-base result and includes `g+v\ne0`.
- [ ] Equation symbolic `sqrt(z+a)+bx=c`, target `z`, still returns a carrier solve without regression.
- [ ] Equation symbolic `sin(z+a)/b+c=d`, target `z`, isolates/delegates while preserving `b\ne0`.
- [ ] Equation symbolic `ln(z+a)+b=c`, target `z`, delegates to exp/log solving.
- [ ] Equation symbolic `(a z+b)/(c+d)=k`, target `z`, preserves `c+d\ne0`.
- [ ] Equation symbolic `(5f+4^@mass)/(g+v)+cx=34`, target `mass`, returns an upright named-target result.

## Boundaries

- [ ] `z+e^z=a`, target `z`, reports multiple selected-target islands.
- [ ] `a^z+b^z=c`, target `z`, reports multiple selected-target islands.
- [ ] `sin(z)+sqrt(z)=a`, target `z`, remains a mixed independent-carrier boundary.
- [ ] `z sin(z)=a`, target `z`, reports target in multiple multiplied factors.
- [ ] `34x^3-z^2=25`, target `x`, remains unsupported cube-root isolation and suggests solving for `z` or numeric solve.
- [ ] Equation symbolic stored values remain ignored/protected.
- [ ] No graphing, `POLY-ELIM2`, source-mirror work, Labs runner work, result-origin changes, or history-schema changes are included.

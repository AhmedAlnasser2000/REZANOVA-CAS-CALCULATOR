# AREA-ASSUMPTIONS0 Risks

## Correctness Risk

The largest risk is inventing facts that are not proven by a bounded owner. A false exclusion or false domain proof can make later algebra/calculus behavior worse than an honest unsupported stop.

## Honesty Risk

If Calcwiz shows assumptions as broad truths when they are only local, sampled, or display-oriented, users may trust results outside their valid domain.

## Architecture Risk

An assumptions core can easily turn into a hidden mega-engine. That would conflict with Calcwiz's bounded exact-first workbench identity and make future code hard to audit.

## Licensing Risk

Static mirrors provide evidence only. Do not copy implementation code, translate code line-by-line, or add source-mirror runtime dependencies.

## Mitigation

- Keep `ASSUMPTIONS-CORE0` metadata-first.
- Require each fact to record source operation and trust.
- Keep request-local facts separate from any future user-facing global assumption feature.
- Use strict stop reasons when a fact cannot be represented.
- Test fact shape and propagation separately from visible behavior.
- Keep source mirrors ignored, static, and non-executable.

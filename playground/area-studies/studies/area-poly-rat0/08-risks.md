# AREA-POLY-RAT0 Risks

## Correctness Risk

Rational integration can look correct while dropping denominator exclusions, mishandling log absolute values, or over-trusting partial fractions.

## Honesty Risk

Cross-engine research can create feature-parity pressure. Calcwiz must not imply broad FriCAS/SymPy/Giac/Sage capability from a bounded distinct-linear slice.

## Architecture Risk

Calculus could bypass `rational-function-core` and recreate local polynomial/factor helpers. That would undo the substrate work that made `POLY-RAT-CORE0` valuable.

## Licensing Risk

The source mirrors use different licenses. This study cites paths and extracts ideas only. Any direct code reuse proposal must stop for explicit source/license review first.

## Mitigation

- Make `INT-RAT1` consume shared polynomial and rational-function cores.
- Add stop reasons before broader family support.
- Preserve denominator constraints and derivative verification.
- Keep source mirrors static-only and ignored.
- Keep benchmark families as challenge context until promoted into Calcwiz-native tests.

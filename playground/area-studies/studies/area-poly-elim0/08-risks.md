# AREA-POLY-ELIM0 Risks

## Correctness Risk

Resultants and Grobner bases can introduce extraneous factors, drop constraints, or explode in term/coefficient size. Without exact domains and validation facts, results can look authoritative while being unsafe.

## Honesty Risk

A visible elimination command would imply broad CAS capability. Calcwiz should not expose that until the implementation can state its caps, domain, and stop reasons clearly.

## Architecture Risk

Adding elimination directly to the current one-variable polynomial core would likely create duplicate exact linear algebra and multivariate representation code in the wrong layer.

## Licensing Risk

The source mirrors are context only. No external code should be copied or translated line-by-line. Any future algorithm must be Calcwiz-native and independently implemented.

## Mitigation

- Keep `AREA-POLY-ELIM0` study-only.
- Choose `AREA-EXACT-LINEAR-ALGEBRA0` before `POLY-ELIM1`.
- Preserve graphing deferral.
- Use Playground for any later algorithm prototypes.
- Require exact coefficient-domain gates, monomial-order policy, and assumption-fact preservation before stable adoption.

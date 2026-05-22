# AREA-SIMPLIFY0 Synthesis

## Findings

The study confirms that simplification is not one feature. It is a policy layer over many bounded transforms.

Calcwiz already has useful local behavior, but the ownership is spread across Calculate, algebra helpers, symbolic-engine modules, calculus, trigonometry, and display. That is acceptable for shipped behavior, but it becomes risky before `INT-RAT2` because repeated-linear and irreducible-quadratic rational outputs need trustworthy equivalence and readable log/arctan forms.

## What To Carry Forward

- Keep transforms family-specific.
- Add shared form-intent vocabulary before broadening output.
- Preserve denominator/domain constraints as first-class facts.
- Separate canonical/check forms from readable/user-facing forms.
- Use bounded equivalence policy instead of global simplification claims.
- Keep source mirrors as evidence, not authorities.

## What Not To Inherit

- A full FriCAS-style expression/domain architecture.
- SymPy's broad simplification API promise.
- Maxima's global switch style.
- SageMath multi-backend simplification delegation.
- Giac/XCAS calculator-CAS breadth as a parity target.
- SymEngine rewrite of Calcwiz's core expression identity.
- GeoGebra product/workflow identity.

## Capability Boundary

Recommended boundary:

- `SIMPLIFY-CORE0` owns form intent, equivalence trust, preserved constraints, and stop reasons.
- Existing algebra/display/calculus/trig modules continue owning their current transforms.
- `INT-RAT2` consumes the policy later if rational integration widens.

Deferred:

- broad rewrite engine
- general assumptions engine
- global canonicalizer
- branch-cut theorem proving
- feature parity with source mirrors

## Decision

Recommended next move: `SIMPLIFY-CORE0`.

Reason: the blocker is shared policy, not only rational calculus wording. `INT-RAT2` would be safer after Calcwiz can consistently describe when a form is canonical, readable, constraint-preserving, or merely display-preferred.

# EQUATION-CUBIC-CARDANO-GENERATED-HANDOFF-AUDIT1

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5-codex
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5-codex
- verified_by_agent: codex
- verified_by_agent_model: gpt-5-codex
- attribution_basis: live

## Decision

Generated/wrapper Cardano remains non-live. The live Cardano surface is top-level direct degree-3 selected-target polynomials plus top-level rational equations whose safe denominator clearing produces a direct cubic. Generated branch handoff must continue to exclude `cubic-cardano`.

## Evidence

- `GENERATED_HANDOFF_ROUTE_ORDER` still excludes `cubic-cardano`.
- `solveGeneratedBranchEquations` route-gates generated branch families and skips `cubic-cardano` even when a caller supplies it explicitly.
- Composition wrapper regression `\sqrt{z^3+z+1}=b` records generated-handoff profile evidence and does not attempt or succeed with `cubic-cardano`.
- Exp/log wrapper regression `\ln\left(z^3+z+1\right)=b` records generated-handoff profile evidence and does not attempt or succeed with `cubic-cardano`.
- Trig regression `\sin\left(z^3+z+1\right)=b` stops at the current non-affine trig-argument boundary before generated handoff.

## Why It Stays Blocked

- Real Cardano output is conditional case math, not an unconditional finite branch list. Wrapper handoff currently expects branch equations to become solution expressions and supplements, not case-local rows.
- Complex Cardano output relies on route-owned definitions and facts such as `A`, `B`, `C`, `p`, `q`, `\Delta`, `R`, `U_k`, `a\ne0`, and sometimes `R\ne0`. Flattening those through wrapper back-substitution would lose meaning or duplicate definitions.
- Case-local facts need structured propagation through wrapper back-substitution. Global supplements alone cannot honestly represent `\Delta>0`, `\Delta=0`, `\Delta<0`, multiplicity, or Real trig-case prerequisites.
- Wrapper back-substitution needs candidate validation and fact validation before it can emit Cardano-derived roots under radicals, logs, trigs, absolute values, or nested carriers.
- Display and copy semantics for generated case answers are not designed yet. Promoting top-level Real Cardano cases to `caseMath` does not automatically solve generated case composition.

## Required Prerequisites For A Future Live Handoff

- A structured generated-handoff result carrier that can hold case rows, branch rows, route-owned definitions, and scoped facts without flattening them into raw `exactLatex`.
- Candidate validation for wrapper substitutions, including denominator exclusions, carrier-domain facts, branch facts, and original-equation checks where required.
- A policy for composing Real Cardano cases through wrappers without pretending every case is an unconditional finite set.
- A policy for composing Complex Cardano branch definitions through wrappers without losing `PrincipalRoot`/omega metadata or `complexExactForm` readback.
- Focused Display/readback support for generated case answers before user-visible wrapper Real Cardano is enabled.

## Recommended Next Direction

Do not add a generated Cardano route skeleton yet. The next live direction should be a generated-handoff carrier audit/substrate slice that models structured branch/case payloads and scoped facts, then proves one narrow wrapper family can preserve validation and readback. Until then, generated cubic branches should stop honestly with current unsupported handoff evidence.

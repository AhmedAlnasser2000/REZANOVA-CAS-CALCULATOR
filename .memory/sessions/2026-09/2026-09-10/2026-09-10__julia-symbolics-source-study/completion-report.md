# Julia symbolic ecosystem capture and mathematical source study

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6-astra
- primary_agent_family: astra
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6-astra
- recorded_by_agent_family: astra
- verified_by_agent: codex
- verified_by_agent_model: gpt-6-astra
- verified_by_agent_family: astra
- attribution_basis: live
- contributors: none

## Outcome

- Backend gate; DIRECT root-only. User approved the ten-repository batch and deeper source study; Catalyst explicitly excluded. No commit or push.
- Registered index and metadata before clones. Captured depth-1 single branches with hooks disabled and no recursive submodules. Metatheory deliberately uses upstream development branch `ale/3.0`; remaining repositories use default branches.
- All ten mirrors are shallow, clean, ignored, and contain no gitlinks. Included monorepo lib directories are ordinary upstream files, not separately cloned dependencies. Registry now has 27 entries.
- Reviewed manifests/licenses and selected mathematical implementations plus test source in every repository. Durable study: `.memory/research/audits/2026-09-10-julia-symbolics-mathematical-study.md`.
- Key findings: Groebner modular/reconstruction/learn-apply pipeline separates randomized checks from optional rational certification; Symbolics has branch-lazy CSE tests; SymbolicIntegration has internal algebraic reductions beyond public Risch reachability and some permissive internal tests; ModelingToolkit contains signed-alias mathematics separable conceptually from its framework; DataDriven monorepo contains actual sparse fitting and DMD algorithms.
- Mathematical study only: no framework adoption, source copying, dependency installation, upstream execution, benchmark, or production changes. No app-visible output was changed or validated, so there is no visual gate.

## Captured revisions

| Mirror | Branch | Capture commit |
| --- | --- | --- |
| symbolics | master | `688cd095d64f7ff5aedbe5768d75d0a04095a818` |
| symbolicutils | master | `acb741d397ef1492dae7c83a3112d232e13e5b7f` |
| terminterface | master | `2b4933e709c05996987997b4097433d08d602262` |
| metatheory | ale/3.0 | `b743e7597b26c9e4c1409ff389105264160ae12b` |
| groebner | master | `30f908652353b29eca7c0a46f472685c19bed4dd` |
| symbolicintegration | main | `ea0d9e6b6097c489912c5086864f31bcc3abcdaf` |
| reversepropagation | master | `923c5d5ab296150f06985c524897a24bc3e24720` |
| modelingtoolkit | master | `35818b83286b874bb908d7c27ecc18f47c9d9ec2` |
| datadrivendiffeq | master | `db020d4d2943680751f49da17254922bb2283a64` |
| symbolicregression | master | `70cf5d6505aee948b5a69631702d0875a4b70b58` |

## Durable memory updated

- `.memory/current-state.md`
- `.memory/journal/2026-09/2026-09-10.md`
- `.memory/research/audits/2026-09-10-julia-symbolics-mathematical-study.md`
- This session: `completion-report.md` and `verification-summary.md`.
- No new architecture or roadmap decision is locked; experiments are research suggestions under the existing static-only policy. Existing uncommitted work is preserved.

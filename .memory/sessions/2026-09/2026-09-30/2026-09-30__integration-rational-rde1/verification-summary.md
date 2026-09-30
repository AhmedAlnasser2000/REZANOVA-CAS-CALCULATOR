# INTEGRATION-RATIONAL-RDE1 verification

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

## Scope and status

2026-09-30; backend, CRITICAL, root-only. Implements exact rational RDE solution spaces and no-rational-solution certificates over Q(x), with replayable completeness evidence. Production files remain inside the private integration core. No UI, parser, public result, dependencies, parameters or higher-tower equation solving. User subsequently authorized the milestone commit and next-step discussion; no push.

## Mathematical and compatibility evidence

- `npx vitest run src/lib/symbolic-engine/integration/core --maxWorkers=2`: 240 tests passed in 20 files, 9.36 s. This retains all 178 previous tests and adds 62 RDE/root/replay tests. Existing scalar, primitive, rational-decision and differential codecs pass unchanged-format tests; the isolation test passes.
- A final bounded correction adds an explicit JavaScript array-capacity resource stop and charges matrix traversal work. Affected RDE/replay tests: 57 passed in 2 files, 2.15 s, two workers. The prior retained-core evidence remains applicable.
- Incremental TypeScript and scoped ESLint pass, including the final correction.
- Positive/negative replay disables the RDE, integer-root, denominator, degree, matrix, Gauss-Jordan, resultant and derivative producers. Replay reconstructs identities and checks evidence, without repeating the search.
- Known fixtures include zero/constant coefficients, u'=1/x, u'+u/x=0, u'-3u/x=0, u'+2xu=2x versus u'+2xu=1, repeated poles, irreducible quadratic factors, distinct finite integer resonances, affine families and irregular singularities. Seeded equations use independently differentiated known rational solutions. Exact large coefficients and proved bounds beyond the profile are tested.
- Adversarial cases remove or alter factor/interval/root coverage, Hasse recurrences, Sturm signs, resultant indices/degrees, splits, degree bounds, coefficient matrices, row evidence, homogeneous bases, final derivatives, expected targets and conditions. Strict artifact tests reject malformed/cyclic/accessor/sparse/noncanonical/oversized data and show sticky resource exhaustion during construction, replay and final verification.
- The specification documents finite-pole, integer-root and infinity completeness arguments. A failed finite system becomes a negative decision only after those arguments' executable hypotheses pass. The universal denominator is never added to the retained source restrictions.

## Workflow evidence

- `npm run test:ooe-boundaries`: 8 tests plus validator pass (26 TypeScript / 6 Rust).
- `npm run test:compartments-boundaries`: tests plus validator pass (1,575 source files; 26 OOE TypeScript / 6 Rust).
- `npm run lint`: zero errors, two pre-existing React-ref cleanup warnings in `useGraphWorkspaceController.ts`.
- `npm run build`: TypeScript and Vite pass; Vite 37.37 s. The final private array-guard/accounting correction is additionally covered by incremental TypeScript/scoped lint and the affected 57 tests; it does not change any app import, bundle or runtime contract.
- Memory/file-size and diff checks pass; checkpoint details appear below.
- No full app suite or Playwright gate: no app-visible behavior changes or new application caller. No orphaned test/build/dev process is intentionally left running.

## Measurement method

Serial observations through `npx vite-node .task_tmp/integration-rational-rde1/measure.ts`, Node v24.19.0. Every operation uses fresh execution/proof state, with already constructed normalized inputs. Stage rows are standalone measurements and must not be summed as an integration profile: complete solve also checks the assembled decision and scopes primitive work differently. These are single observations, not medians or speed guarantees. Process RSS includes the Vite runner and module-loading overhead; it is not kernel live memory. Raw final observations are preserved in `measurements.jsonl` beside this file.

Limits: work 20 billion, cumulative allocation 1 trillion, integer bits 2,048, degree 256; artifact depth 64, nodes 100,000, bytes 16 MiB. Allocation units measure cumulative charged storage, not free/peak RAM. No application defaults or hidden algorithmic degree ceiling are introduced; machine array capacity has an explicit resource stop before conversion/allocation.

| Fixture | Operation | ms | Work | Allocation units |
| --- | --- | ---: | ---: | ---: |
| zero | solve-checked | 5.943 | 88,245 | 833,707 |
| zero | verify-fresh | 1.124 | 29,932 | 268,273 |
| zero | encode-checked | 2.116 | 35,877 | 273,989 |
| zero | decode-replay | 2.107 | 40,846 | 316,690 |
| distinct-resonances | solve-checked | 35.671 | 1,877,275 | 20,760,210 |
| distinct-resonances | verify-fresh | 32.746 | 743,630 | 8,218,048 |
| distinct-resonances | encode-checked | 22.252 | 764,330 | 8,244,240 |
| distinct-resonances | decode-replay | 20.781 | 945,343 | 10,250,477 |
| repeated-quadratic-negative | solve-checked | 8.435 | 435,985 | 4,834,078 |
| repeated-quadratic-negative | verify-fresh | 2.366 | 117,906 | 1,309,238 |
| repeated-quadratic-negative | encode-checked | 2.532 | 131,025 | 1,326,920 |
| repeated-quadratic-negative | decode-replay | 3.607 | 165,299 | 1,694,546 |
| polynomial-negative | solve-checked | 1.661 | 91,339 | 964,168 |
| polynomial-negative | verify-fresh | 0.423 | 21,937 | 229,525 |
| polynomial-negative | encode-checked | 0.686 | 27,224 | 235,385 |
| polynomial-negative | decode-replay | 0.727 | 31,479 | 277,256 |
| repeated-pole | solve-checked | 14.670 | 775,510 | 8,244,407 |
| repeated-pole | verify-fresh | 5.702 | 293,852 | 3,097,857 |
| repeated-pole | encode-checked | 6.362 | 308,320 | 3,115,663 |
| repeated-pole | decode-replay | 8.698 | 394,701 | 4,025,127 |
| irregular-positive | solve-checked | 4.231 | 221,490 | 2,324,350 |
| irregular-positive | verify-fresh | 1.269 | 58,851 | 601,293 |
| irregular-positive | encode-checked | 1.384 | 67,957 | 611,621 |
| irregular-positive | decode-replay | 2.485 | 109,794 | 1,049,057 |

Raw observations also include clearing, pole/root bounds, transformation, infinity bound, matrix construction and elimination separately. Complete solves ranged from 1.661 to 35.671 ms for this small representative corpus. This is not a claim about all accepted equations.

## Final checkpoint

- Memory protocol: 24 tests plus validator pass. File sizes: 10 tests plus validator pass (2,334 files, 5 baseline caps). Diff hygiene passes.
- Required specification, provisional roadmap, current-state, decisions, journal and dossier records are updated. The next-gate scope question is recorded in open-questions.md.
- User authorized the integration-only milestone commit. The index is checked for only the named gate paths; pre-existing September 28 Agent Attention modifications remain excluded. No push.

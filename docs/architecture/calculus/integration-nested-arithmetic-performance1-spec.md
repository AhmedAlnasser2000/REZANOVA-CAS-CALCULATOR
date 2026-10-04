# INTEGRATION-NESTED-ARITHMETIC-PERFORMANCE1

Started: 2026-10-03. Completed: 2026-10-04. Backend, CRITICAL, root-only. Performance, correctness, lint/build and boundary acceptance pass. User authorized one final milestone commit; no push.

## Contract and baseline

Accelerate exact nested fraction arithmetic without changing native ownership, normalized representations, algorithmic integration capabilities, independent mathematical verification or existing artifacts. Production changes stay inside the integration core; no dependencies, UI adoption or OOE changes.

Baseline `b452798e`. Require at least 5x faster complete integration and fresh verification for the shifted repeated-pole fixture. The corresponding quadratic/inverse-exponent fixtures must complete ordinary/direct input construction and the complete integration/verification/codec pipeline under unchanged limits. Non-target operations may regress by at most max(20%,20 ms).

The stress primitive is v+log(g), with g=t+x, v=1/((x+1)g²), t=exp(r), r in {x+1,x²,1/x}. Build the input both with ordinary fractions and directly as [-g-2(x+1)Dg+(x+1)²g²Dg]/[(x+1)²g³]. Compare exact normalized values. Setup costs are separate from integration timers. The baseline quadratic/inverse fixtures exhaust even in direct input normalization, not just during integration.

Use two warm-ups and five measurements, serially on the same Node/machine/harness. Every operation uses a fresh context; verification uses the same baseline-produced artifact bound outside the timer. Record artifact SHA-256 identities. JIT warm-up never preserves mathematical proof state. Exclude JSON parsing/file I/O; record work/allocation and RSS/heap/maxRSS independently. Process maxRSS is a lifetime high-water observation, not per-operation live memory. Profiles are separate. Baseline exhaustion is a typed failure, never a fabricated speed ratio.

Explicit profile: work 20 billion; allocation 1 trillion; integer bits 2,048; degree 256; tower 8; artifact depth/nodes/bytes 64/100,000/16 MiB. Do not raise these or weaken accounting to meet the target.

## Checkpoint A: normalization evidence

For N/D, obtain a checked extended GCD g=sN+tD, divide N=gn₀ and D=gd₀, then put c=1/lc(d₀), n=cn₀, d=cd₀. Independently check sn+td=c with c nonzero, monicity, and nD=Nd. The constant combination proves coprimality in the polynomial ring over the coefficient field. It replaces the second Euclidean run, not the coprimality obligation. Zero, constant and monomial cases keep their established checks.

## Checkpoint B: primitive Euclid

An internal native-domain registry bridges actual RationalFunctionField owners and DifferentialField wrappers. Only domains recursively registered from native Q qualify. Custom coefficient fields, including shallow-frozen implementations, remain on ordinary field Euclid. No compatibility is inferred from variable names or object shape.

For a polynomial over K(x), form a common coefficient denominator d and a polynomial P in K[x][t]. Verify each coefficient cross-product. Remove coefficient content c using checked GCD/exact division, reconstructing P=cP₀. Initially P₀=(d/c)a.

Each working remainder carries S,T,h satisfying P=(Sa+Tb)/h over the fraction field. For the next pseudo-division, lP=QV+R. With previous/current witness denominators h₁,h₂, align them through their checked polynomial GCD. Form the new numerator witnesses for lP−QV; divide the remainder by its checked content and multiply the witness denominator by that content. Cancel any common coefficient factor of both witnesses and their denominator through exact division and reconstruction. Pseudo-division identities, degree descent and content reconstruction are checked before progress.

At termination, divide the last nonzero polynomial and both witnesses by its leading coefficient. Convert back into the original owned field, then run the existing verifier for monicity, divisibility of both inputs and the full Bezout identity. The computational helper stays private and the exported helper cannot return unchecked evidence. The recurrence terminates because each nonzero remainder has lower t-degree.

Zero/constant outer inputs use ordinary Euclid. Each recursive coefficient GCD moves to the preceding polynomial coefficient domain. No hidden degree limit, floating approximation, factorization or heuristic negative result is introduced. Brown/resultant certificates are unchanged.

## Acceptance and checkpoint C

Checkpoints A/B meet acceptance: shifted integration 89.930 -> 8.778 seconds (10.25x), fresh verification 32.334 -> 2.942 seconds (10.99x). Quadratic and inverse stress cases complete construction, integration, verification and replay under unchanged limits. All 149 non-target comparisons pass the regression threshold. Checkpoint C is therefore omitted: no new proof cache, shared-denominator verifier or derivative-checker changes. Full raw samples, spread, counters and memory observations are in the [performance report](../../../.memory/sessions/2026-10/2026-10-03/2026-10-03__integration-nested-arithmetic-performance1/performance-results.md).

Retain 470 core tests; add general-path arithmetic oracles, nested identities, ownership/custom-domain tests, mutations, resource stops and historical artifacts with producers disabled. The regression corpus includes rational/quintic, RDE, single-product/finite-sum exponentials, exponential rational decisions and recursive/logarithmic derivatives.

Run focused core/adoption tests with two workers, incremental TypeScript, scoped lint, isolation, compartment/OOE, memory/file-size and diff checks. Inspect polynomial/root-log/source-exclusion output through npm-dev Playwright because shared arithmetic is adopted by New Integration. No exponential UI capability is added. Repository lint/build are required for the authorized milestone commit.

Update roadmap/current-state/decisions/journal and the [dossier](../../../.memory/sessions/2026-10/2026-10-03/2026-10-03__integration-nested-arithmetic-performance1/verification-summary.md). Completion records measured acceptance, historical replay, 481 core/40 adoption tests and real-app smoke, with final memory/diff checks before the authorized commit.

## Reproduction commands

Run from the repository root. The baseline extraction is a read-only historical source copy, not another active worktree. Stop competing heavy checks before timing.

```sh
mkdir -p .task_tmp/integration-nested-arithmetic-performance1/baseline
git archive b452798e src/lib/symbolic-engine/integration/core | tar -x -C .task_tmp/integration-nested-arithmetic-performance1/baseline
node src/lib/symbolic-engine/integration/core/__tests__/nested-performance.ts --core .task_tmp/integration-nested-arithmetic-performance1/baseline/src/lib/symbolic-engine/integration/core --output .task_tmp/integration-nested-arithmetic-performance1/baseline-final.json --artifacts .task_tmp/integration-nested-arithmetic-performance1/artifacts
node src/lib/symbolic-engine/integration/core/__tests__/nested-performance.ts --output .task_tmp/integration-nested-arithmetic-performance1/candidate-final.json --saved-artifacts .task_tmp/integration-nested-arithmetic-performance1/artifacts --compare .task_tmp/integration-nested-arithmetic-performance1/baseline-final.json
node src/lib/symbolic-engine/integration/core/__tests__/differential-performance.ts --core .task_tmp/integration-nested-arithmetic-performance1/baseline/src/lib/symbolic-engine/integration/core --nested-corpus --regression-only --output .task_tmp/integration-nested-arithmetic-performance1/corpus-baseline.json
node src/lib/symbolic-engine/integration/core/__tests__/differential-performance.ts --nested-corpus --regression-only --output .task_tmp/integration-nested-arithmetic-performance1/corpus-candidate.json --compare .task_tmp/integration-nested-arithmetic-performance1/corpus-baseline.json
```

The existing differential-performance harness retains its original inverse-exponential target by default. `--regression-only` explicitly selects this gate's no-regression policy; `--nested-corpus` adds standalone positive/negative RDE and finite-sum fixtures. No application settings are changed.

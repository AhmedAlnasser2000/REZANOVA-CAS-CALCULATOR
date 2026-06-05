# OOE Resume Readiness Audit - 2026-06-05

## Scope

This is an audit, not a milestone.

It does not create a new `OOE-RS` label, checklist, session dossier, solver feature, UI change, OOE implementation change, or roadmap replacement. Its only purpose is to answer whether Calcwiz is clear enough to resume the paused OOE roadmap after the inequality and complex Equation work.

## Question

Are the current inequality and complex foundations stable enough that the next OOE work can resume at `OOE-RS26` without guessing about domains, answer modes, replay metadata, or provenance?

## Verdict

Go for `OOE-RS26`, with constraints.

Calcwiz is ready to resume OOE with `OOE-RS26: Equation guarded-stage cancellation checkpoints`.

Calcwiz is not ready to jump directly to broad Equation cancellation, worker isolation, or public diagnostics. The next OOE step must be a checkpoint/cancellation integration pass inside the existing guarded Equation stage pipeline, not a broad scheduler rewrite.

## Why This Is Now Clear Enough

### Domain And Answer Contracts Are Present

The app now carries the domain pieces OOE needs to distinguish the major Equation result classes:

- `equationAnswerMode`: `exact`, `approximate`, or `isolate`.
- `equationDomainIntent`: real-first or complex-enabled intent.
- `complexExactForm`: rectangular, polar, or cis display preference.
- `answerDomain`: real, complex, conditional-real, or unknown-domain.
- `solutionKind`: exact symbolic, approximate numeric, isolate formula, inequality solution set, or condition/fact-only stop.

These contracts exist in app settings, runtime request types, history/replay metadata, and Equation OOE snapshots. That means new OOE diagnostics and cancellation records can refer to the intended Equation lane without flattening complex answers, inequality sets, approximate real searches, and isolate/rearrangement outputs into one vague solve event.

### Equation Runtime Requests Preserve The Needed State

`createEquationRuntimeController` builds `RunEquationModeRequest` with:

- answer mode;
- domain intent;
- complex exact form;
- angle unit;
- output style;
- selected target;
- numeric interval when applicable;
- stored variables.

For symbolic Equation runs, it also uses `runEquationModeWithOoePilot` with an active revision resolver. If the commit assessment is not allowed, it skips committing the stale result.

This means OOE already owns the visible commit decision for active Equation results. The next work does not need to invent the stale gate again; it needs to deepen runtime cancellation/checkpoints inside the guarded stages.

### Equation Provenance Is Rich Enough To Resume

Equation OOE provenance currently records:

- answer mode;
- domain intent;
- complex exact form;
- answer domain;
- solution kind;
- selected target;
- target discovery summary;
- guarded stage order;
- guarded stage attempts;
- winning stage;
- stop reason;
- detail section titles;
- generated rewrite/isolation details;
- output hygiene summary;
- explicit imaginary-input evidence;
- inequality route evidence when the result is an inequality solution set;
- complex route evidence when the result is complex.

This is enough for `OOE-RS26` to add cancellation checkpoints while still being able to explain which stage was active, what domain contract applied, and what kind of answer was being attempted.

### Diagnostics Can Store The New Evidence

The diagnostics buffer already accepts completed, stale-dropped, skipped, cancelled, and failed terminal statuses. Its output summary and provenance types can store answer domain, solution kind, detail section titles, exact output length, periodic-family markers, warnings, host metadata, and route-specific Equation evidence.

That means `OOE-RS26` can record a cancelled Equation guarded-stage job without needing a schema redesign first.

### Readback Is Stable Enough For OOE References

Recent inequality and complex readback work made the visible result shape less ambiguous:

- inequality restrictions now belong in `Valid when`;
- result detail cards can be collapsed;
- math-heavy detail lines can be rendered as math instead of plain ASCII;
- complex display form is persisted;
- explicit `i` is treated as a reserved unit;
- history/replay carries the relevant domain and display settings.

This matters because OOE diagnostics should be able to reference route/readback evidence without being polluted by display artifacts like raw construction text.

## Remaining Gaps Before Broad OOE Expansion

### 1. Equation Stages Do Not Yet Poll OOE Cancellation

The shared Equation OOE pilot wraps `runSharedEquationSolveWithTrace(request)`, but the current guarded solve execution path does not receive an OOE runtime control context.

`runOoeRuntimeJob` already provides:

- `registryId`;
- `shouldCancel()`;
- `checkpoint(message)`;
- `yieldIfBudgetExceeded(message?)`.

Table uses this style. Equation does not yet use it inside `guarded/run.ts` or the stage helpers.

This is the exact work of `OOE-RS26`, not a blocker to starting `OOE-RS26`.

### 2. Cancellation Outcome Policy Needs To Be Locked For Equation

Before implementation, `OOE-RS26` should decide:

- whether a cancelled Equation run leaves the previous visible result unchanged;
- whether it commits a controlled cancellation note;
- whether cancellation differs between symbolic Exact, Approximate numeric interval, and heavy helper stages;
- whether replay snapshots are preserved on cancellation.

The Table policy from `OOE-RS24` is useful precedent, but Equation may need a slightly different visible-state rule because Equation output is more central and has answer-mode semantics.

### 3. Checkpoint Granularity Must Be Stage-First

The first Equation cancellation pass should not try to instrument every helper deeply.

Recommended initial checkpoint levels:

- before each guarded stage;
- after each guarded stage returns no outcome;
- before recursive guarded solve calls;
- before direct symbolic fallback;
- around known heavy helpers such as substitution, composition, direct symbolic, complex preimage, and inequality routes when feasible.

Fine-grained helper checkpoints can come later, after stage-level behavior is proven.

### 4. No Worker Isolation Yet

`OOE-RS27` should remain separate. Equation should not move into a worker until `OOE-RS26` proves:

- stage checkpoint semantics;
- cancellation visible-state behavior;
- diagnostics record quality;
- no regression to existing stale gates.

## Go / No-Go Matrix

| Area | Status | Notes |
| --- | --- | --- |
| Resume OOE roadmap | Go | Resume at `OOE-RS26`, not a renamed milestone. |
| Equation guarded-stage cancellation checkpoints | Go | This is the right next OOE slice. |
| Broad Equation cancellation coverage | No-go for now | Wait until RS26 proves stage-level cancellation. |
| Equation worker/heavy-helper isolation | No-go for now | Keep for `OOE-RS27`. |
| Public diagnostics UI or MCP diagnostics | No-go for now | Keep for later diagnostics surface work. |
| More inequality/complex capability before OOE | Optional, but not required | Current domain contracts are sufficient for RS26. |
| Supercarrier compartment hardening | Not yet | Do after more OOE tail stabilization, starting with `COMPARTMENTS0`. |

## Recommended `OOE-RS26` Shape

`OOE-RS26` should be narrowly framed as:

> Equation guarded-stage cancellation checkpoints.

Expected implementation shape:

- Thread an optional OOE runtime control context from the Equation pilot into shared guarded solving.
- Preserve direct non-OOE callers by making the context optional.
- Add checkpoint events at guarded stage boundaries and recursive handoffs.
- Poll `shouldCancel()` before entering the next stage and before expensive fallbacks.
- Return or throw through a controlled cancellation path that the coordinator can mark as terminal `cancelled`.
- Preserve current stale-drop behavior.
- Preserve current Equation result wording/history schema except for any explicit cancellation note policy chosen for this milestone.
- Add tests for completed, stale-dropped, cancelled, and failed Equation jobs.

## Audit Conclusion

The pause after `OOE-RS25` served its purpose. Inequality and complex Equation work now have enough domain/result/readback metadata for OOE to resume without guessing.

The correct next move is `OOE-RS26`, but it should be treated as a controlled Equation checkpoint milestone, not as broad cancellation, worker isolation, or a new diagnostics UI.

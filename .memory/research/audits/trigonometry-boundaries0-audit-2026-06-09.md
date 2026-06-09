# TRIGONOMETRY-BOUNDARIES0: Trigonometry Capability And Experience Boundary Audit

## Attribution
- primary_agent: codex
- primary_agent_model: gpt-5.5
- attribution_basis: live

## Summary

`TRIGONOMETRY-BOUNDARIES0` began as an audit/design milestone only. Its follow-up implementation, `TRIGONOMETRY-SURFACE1`, chose the stricter cleanup path: visible Trigonometry now keeps only `Identities`, `Triangles`, and `Angle Convert`.

The locked boundary is:

- Reusable trigonometry cores stay reusable by Calculate, Equation, Trigonometry, Calculus, and future workspaces.
- The visible Trigonometry workspace should be a guided angle, triangle, identity, and periodic-structure experience.
- Trigonometry should not become a second Calculate quick evaluator or a second Equation solver.
- General relation solving belongs to Equation, even when the relation contains trig functions.
- Direct quick trig evaluation can remain available in Calculate because Calculate is the quickform evaluator.

The product problem is not that Calcwiz has reusable trig cores. That is correct. The problem is that the current Trigonometry home surface still mixes true trig workflows with generic capability entrypoints.

## TRIGONOMETRY-SURFACE1 Follow-Up

The implemented surface boundary is stricter than the initial "Angles And Unit Circle" grouping idea:

1. Visible Trigonometry home entries are exactly `Identities`, `Triangles`, and `Angle Convert`.
2. `Functions` is no longer a visible Trigonometry card. Direct values such as `sin(30)` and inverse-trig one-shots belong to Calculate.
3. `Equations` is no longer a visible Trigonometry card. General trig relation solving belongs to Equation symbolic solve.
4. `Special Angles` is no longer a visible Trigonometry card. The reference role moved to Guide as a visual `Unit Circle` article with concise special-angle notes beneath the diagram.
5. Internal `TrigScreen` values and helper modules remain available for legacy replay and future reuse.
6. Legacy `functions` and expression-based `specialAngles` history replay routes forward to Calculate with the original input.
7. Legacy `equationsHome` and `equationSolve` replay routes forward to Equation symbolic with the original relation.
8. `Period And Phase Analyzer` remains a later Trigonometry-native addition, not part of this surface cleanup.

## Locked Decisions

1. Keep the reusable trig implementation modules.
   - Do not delete `src/lib/trigonometry/functions.ts`, `identities.ts`, `equations.ts`, `triangles.ts`, `parser.ts`, `serializer.ts`, or rewrite helpers just because the visible surface changes.
   - These modules are capability/core layers, not proof that every capability needs a top-level Trigonometry card.

2. Keep `trigScreen` replay compatibility.
   - Existing history stores `trigScreen` hints and reparses `inputLatex` on replay.
   - Future visible renames must preserve or map old screen IDs.

3. Do not widen OOE to Trigonometry before product boundaries are clean.
   - OOE would otherwise harden a surface that still duplicates Calculate and Equation.
   - After surface cleanup, Trigonometry can be evaluated for runtime-shell and launch-ticket adoption.

4. Add Period And Phase Analyzer after cleanup, not before.
   - It is a strong Trigonometry-native experience.
   - It should not be added while the workspace still has unclear `Functions` and `Equations` roles.

## Current Surface Inventory

| Current screen | Current visible role | Boundary classification | Notes |
| --- | --- | --- | --- |
| `functions` | Evaluate `sin`, `cos`, `tan`, and inverse trig functions. | Reframe or merge into Angles / Unit Circle. | Direct evaluation overlaps Calculate. It is valuable when framed as exact values, quadrant signs, inverse principal ranges, and angle-unit interpretation. |
| `identitiesHome` / `identitySimplify` / `identityConvert` | Simplify and convert bounded trig identities. | Keep as Identity Workbench. | This is a strong Trigonometry experience if it explains transformations and identity provenance rather than acting like a generic Simplify button. |
| `equationsHome` / `equationSolve` | Solve bounded trig equations in `x`. | Reframe as Equation Setup / Periodic Branch Guide, or demote from home. | This is the highest duplication risk. The current route delegates to shared Equation solving and tests include non-trig exp/log solving through this screen, so the visible surface can act like a second Equation doorway. |
| `trianglesHome` / `rightTriangle` / `sineRule` / `cosineRule` | Guided triangle solving. | Keep. | This is a clear Trigonometry workflow: entered sides/angles, ambiguity, triangle relations, and geometric readback. |
| `angleConvert` | Convert degree, radian, and grad values. | Keep, likely under Angles. | Useful utility, but too small to define the workspace alone. |
| `specialAngles` | Exact-value reference for standard angles. | Keep and expand into Unit Circle / Exact Values. | Strong fit. Should become the home for exact values, principal angles, quadrants, and reference-angle reasoning. |

## Current Core Inventory

| Module area | Ownership classification | Future use |
| --- | --- | --- |
| `src/lib/trigonometry/functions.ts` | Shared trig-value capability. | Use from Calculate quickform, Trigonometry exact-values/principal-angle screens, and any guided trig readback. |
| `src/lib/trigonometry/identities.ts` and rewrite helpers | Shared identity capability. | Use from Trigonometry Identity Workbench and potentially Equation/Calculate simplification surfaces when explicitly routed. |
| `src/lib/trigonometry/equations.ts`, `equation-match.ts`, `rewrite-solve.ts` | Bounded trig relation helpers. | Keep as reusable helpers for Equation and Trigonometry setup/branch explanation. Do not make the visible Trig workspace own broad equation solving. |
| `src/lib/trigonometry/triangles.ts` | Triangle-solving capability. | Keep surfaced in Trigonometry. This is not a Calculate or Equation duplicate. |
| `src/lib/trigonometry/angles.ts` and special-angle helpers | Angle/unit-circle capability. | Promote as part of the target Trigonometry experience. |
| `src/lib/trigonometry/parser.ts` / `serializer.ts` | Structured request and replay compatibility layer. | Keep old request/screen IDs stable or provide explicit forward mapping in the surface cleanup. |

## Evidence From Current Code

- `src/lib/trigonometry/navigation.ts` currently exposes `Functions`, `Identities`, `Equations`, `Triangles`, `Angle Convert`, and `Special Angles`.
- `src/lib/trigonometry/core.ts` routes `equationSolve` through the shared Equation backend, then emits handoff-style metadata when relevant.
- `src/lib/trigonometry/core.test.ts` includes exp/log equation behavior through the Trigonometry equation path. This proves the current `Equations` surface is broader than trig understanding.
- History replay stores `trigScreen` hints and reparses `inputLatex`, so visible reorganization must not break legacy history.
- The guide domain currently describes Trigonometry as "Functions, identities, equations, angle conversion, and triangle solving." That wording should be narrowed in the next surface milestone.

## Target Trigonometry Experience

The target visible Trigonometry workspace should become:

1. **Angles And Unit Circle**
   - Merge or absorb current `Functions`, `Angle Convert`, and `Special Angles`.
   - Show exact values, reference angles, quadrant signs, angle-unit conversion, inverse principal ranges, and radian/degree/grad interpretation.
   - Keep quick examples, but frame them as angle understanding, not as a generic evaluator.

2. **Identity Workbench**
   - Keep identity simplification and conversion.
   - Show transformation provenance and bounded identity facts.
   - Avoid acting like a generic algebra simplify workspace.

3. **Triangle Solver**
   - Keep right-triangle, sine-rule, and cosine-rule workflows.
   - Preserve ambiguity/readback details and geometric meaning.

4. **Equation Setup / Periodic Branch Guide**
   - Do not market as general solving.
   - Use it to explain trig-specific setup, unit-circle branches, period families, range restrictions, and when to hand off to Equation.
   - General symbolic/numeric solving remains Equation-owned.

5. **Period And Phase Analyzer** later
   - Analyze forms such as `a sin(bx+c)+d`, `a cos(bx+c)+d`, and guarded tangent forms.
   - Return amplitude, period, phase shift, midline, range, zeros, extrema, and key points.
   - This is a strong post-cleanup Trigonometry-native addition.

## Proposed Visible Navigation After Cleanup

The initial audit considered this broader home order:

1. Angles And Unit Circle
2. Identity Workbench
3. Triangle Solver
4. Equation Setup
5. Period And Phase Analyzer, when implemented later

Compatibility note: the visible labels can change before internal `TrigScreen` IDs change. For example, old `functions`, `angleConvert`, and `specialAngles` IDs may remain internal replay destinations while the visible hub groups them under `Angles And Unit Circle`.

`TRIGONOMETRY-SURFACE1` ultimately rejected the extra visible grouping and Equation Setup card. The implemented home order is:

1. Identities
2. Triangles
3. Angle Convert

## Guide And Wording Changes For Next Milestone

Update guide/user-facing wording in the surface cleanup:

- `trig-functions`
  - Reframe from "function evaluator" to exact values, principal values, and angle-unit interpretation.

- `trig-identities`
  - Keep, but emphasize identity workbench and transformations.

- `trig-equations`
  - Reframe to trig equation setup, branch interpretation, and Equation handoff.
  - Remove wording that suggests Trigonometry owns broad exp/log/mixed symbolic solving.

- `trig-triangles`
  - Keep as the guided triangle workflow.

- `trig-special-angles`
  - Merge conceptually into Angles And Unit Circle or keep as a subsection.

## What Not To Do

- Do not delete reusable trig cores.
- Do not move broad solving from Equation into Trigonometry.
- Do not remove Calculate quickform trig evaluation.
- Do not widen OOE to Trigonometry before surface cleanup.
- Do not rename persisted `trigScreen` values without a forward compatibility mapper.
- Do not add Period And Phase Analyzer until redundant surface wording is reduced.

## Recommended Next Milestones

### `TRIGONOMETRY-SURFACE1`

Implemented as surface cleanup only.

- Reorganized the visible Trigonometry hub around Identities, Triangles, and Angle Convert.
- Kept internal screen IDs compatible.
- Updated guide summaries, launcher wording, breadcrumbs, empty states, and history/replay handoffs.
- Removed visible `Functions`, `Equations`, and `Special Angles` cards without deleting reusable trig helpers.
- Added a visual Unit Circle guide article; special-angle notes sit beneath the diagram rather than becoming a cluttered workspace screen.

### `TRIGONOMETRY-PERIOD-PHASE1`

Add the first new Trigonometry-native experience after cleanup.

- Analyze amplitude, period, phase shift, midline, range, zeros, extrema, and key points for bounded trig forms.
- Use shared trig/algebra/readback cores.
- Keep general relation solving in Equation.

### Later OOE Widening

After the surface is stable:

- Audit Trigonometry as a MathLive-backed workspace.
- Apply the `PRE-RS34-LIVE-SNAPSHOT-GATE` rule before worker shell or launch-ticket adoption.
- Only add tickets to explicit user-visible Trigonometry runs that still produce durable history records.

## Outcome

`TRIGONOMETRY-BOUNDARIES0` concludes that Trigonometry is worth keeping as a visible workspace, but not as a generic trig evaluator or second equation solver. `TRIGONOMETRY-SURFACE1` applies that conclusion by keeping the visible workspace focused on identities, triangles, and angle conversion, while shared trig capabilities remain reusable across Calcwiz.

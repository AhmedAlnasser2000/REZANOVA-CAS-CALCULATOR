# Track C P2 Manual Verification Checklist

Date: 2026-03-06  
Status: PASS (automated) + UI manual sweep pending user confirmation

## Achieved Now
- Added deferred Geometry inverse solve-missing families:
  - `coneSolveMissing`
  - `cuboidSolveMissing`
  - `arcSectorSolveMissing`
  - `triangleHeronSolveMissing`
- Extended `lineEquation(...)` parsing to route one-unknown + one-constraint requests into existing coordinate solve-missing engines:
  - `slopeSolveMissing`
  - `distanceSolveMissing`
  - `midpointSolveMissing`
- Added explicit handoff warning mapping for unresolved coordinate sends (Equation uses `x` as placeholder and names the mapped coordinate symbol).
- Added solve-missing template chips for Geometry leaf tools covered in P2.
- Updated Geometry route help text and guide article content for P2 coverage boundaries.

## App Steps
1. Enter `cone(radius=?, height=4, volume=12*pi)` on Geometry `cone`.
Expected:
- Solves `radius` with positive-domain checks and standard cone outputs.
Pass/Fail:
- PASS (covered by `src/lib/geometry/core.test.ts`).

2. Enter `cuboid(length=?, width=3, height=4, diagonal=13)` on Geometry `cuboid`.
Expected:
- Solves missing dimension using real-root diagonal guard.
Pass/Fail:
- PASS (covered by `src/lib/geometry/core.test.ts`).

3. Enter `arcSector(radius=?, angle=60, unit=deg, arc=2*pi)` on Geometry `arcSector`.
Expected:
- Solves `radius` from arc relation and preserves unit handling.
Pass/Fail:
- PASS (covered by `src/lib/geometry/core.test.ts`).

4. Enter `triangleHeron(a=?, b=13, c=14, area=84)` on Geometry `triangleHeron`.
Expected:
- Returns valid side branch solutions with explicit two-branch warning when applicable.
Pass/Fail:
- PASS (covered by `src/lib/geometry/core.test.ts`).

5. Enter line constraint routing requests on Geometry `lineEquation`:
- `lineEquation(p1=(0,0), p2=(?,8), slope=2)`
- `lineEquation(p1=(0,0), p2=(3,?), distance=5)`
- `lineEquation(p1=(1,2), p2=(?,8), mid=(3,5))`
Expected:
- Requests route to slope/distance/midpoint solve-missing, not a parallel line solver.
Pass/Fail:
- PASS (covered by `src/lib/geometry/parser.test.ts` + `src/lib/geometry/core.test.ts`).

6. Enter ambiguous line-constraint request:
- `lineEquation(p1=(0,0), p2=(?,8), slope=2, distance=5)`
Expected:
- Explicit parser error requiring exactly one constraint.
Pass/Fail:
- PASS (covered by `src/lib/geometry/parser.test.ts`).

7. Enter unresolved eligible coordinate case:
- `slope(p1=(?,2), p2=(4,2), slope=0)`
Expected:
- Controlled unresolved message + `Send to Equation` action + explicit warning that `x` maps to missing `x_1`.
Pass/Fail:
- PASS (covered by `src/lib/geometry/core.test.ts`).

## Evidence Commands
- `npm test -- --run src/lib/geometry/parser.test.ts src/lib/geometry/core.test.ts src/lib/geometry/navigation.test.ts src/lib/guide/content.test.ts`
- `npm test -- --run`
- `npm run build`
- `npm run lint`
- `cargo check`

## Notes
- Desktop click-through smoke for these exact UI flows is pending user recording/confirmation.

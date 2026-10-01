# PTX-ENGINE1: derivatives, intervals and proofs

## Attribution

- primary_agent: claude
- primary_agent_model: claude-opus-5-5
- primary_agent_family: opus-5.5
- recorded_by_agent: claude
- recorded_by_agent_model: claude-opus-5-5
- recorded_by_agent_family: opus-5.5
- verified_by_agent: claude
- verified_by_agent_model: claude-opus-5-5
- verified_by_agent_family: opus-5.5
- attribution_basis: live

## Authority and outcome

- Date: 2026-10-01. Third of three approved moves (ASYMPTOTE-FIX1, PTX3, PTX-ENGINE1), one commit, no push. The user chose all of: automatic differentiation, intervals with domain tracking, affine / mean-value tightening, Krawczyk proofs with a new **proved** badge, faithful implicit drawing, the Plantinga–Vegter shape guarantee and the argument principle, built now (not waiting for the Equation interval rebuild), with double-double as the precision lane; the GPU interval pass skipped; Arb only as a possible later spike, never without the user's permission. The user asked to finalize and leave performance to another gate.
- Outcome: **verified** (backend + ui); a performance follow-up is recorded.

## Delivered

- **E1 AD** (`evaluator/dual.ts`): forward-mode derivatives on the postfix tape; port functions carry `derivative`, `gradient` and `velocity`; Newton projection, tangents, implicit turning points, the 2-D solver and extrema (bisection of f′ = 0, to the last bit) use them instead of finite differences.
- **E2 intervals** (`evaluator/interval-math.ts`, `interval.ts`, `numeric/directed-rounding.ts`): outward-rounded interval arithmetic for every tape operator with defined/partial/nowhere, continuity and smoothness flags, and interval forward-mode AD for slope ranges. Fuzzed against the scalar and AD evaluators (tens of thousands of random expressions).
- **E3 tighter ranges** (`evaluator/affine.ts`): affine arithmetic for sums, products and integer powers (x − x = 0), the mean-value form, and their intersection (`graphTightRange`).
- **E4 proofs** (`ptx/prove.ts`): 1-D Krawczyk (unique zero), guaranteed sign change (existence), guaranteed slope sign change (extremum) and 2-D Krawczyk, through the port's new `enclose`. New evidence level `interval-proved`, badge **proved** (exact > proved > verified > numeric). Proved now: Analyze roots, extrema and graph intersections; PTX3's crossings, turning points, intersections, corners and origin passes; trace readouts on y = f(x), parametric, polar and implicit curves.
- **E5 faithful implicit curves** (`sampling/implicit-interval.ts`, `implicit.ts`): cells whose enclosure excludes every zero are not refined; cells that may hide a zero the samples miss are refined; curves that only touch zero ((x − y)² = 0) and isolated points (x² + y² = 0) are drawn through Newton-confirmed points whose surroundings keep one sign.
- **E6 shape guarantee:** the Plantinga–Vegter gradient-cone test certifies each crossed cell as one simple arc; uncertified small cells with a possibly vanishing gradient are joined through their singular point (x² = y²); item evidence carries `topology` counts.
- **E7 column check** (`sampling/explicit.ts`, `ptx/features.ts`): enclosures between neighbouring samples find spikes narrower than the sampling (drawn at full height); interval bisection supplies discontinuity candidates to machine precision.
- **E8** (`ptx/argument-principle.ts`, `evaluator/complex-interval.ts`, `evaluator/double-double.ts`): exact counts of zeros and poles of meromorphic z-maps in Analyze ("exactly 2 zeros and 1 pole") and proved zero locations; double-double values with running error bounds for limits near holes and readouts where doubles cancel ((eˣ − 1)/x at 10⁻¹²).

## Deviations and findings

- **Performance:** at the spec's 4× CPU throttle, settled and first-preview times are bimodal (one run 193/312 ms as before, others ~240–300/790 ms). Preview samples skip interval work; the remaining cost is in settled implicit sampling (~20 % per item) and interval evaluation's allocations. Recorded as a follow-up gate, as the user asked.
- Fixed on the way: `complex-plan.ts` divide threw near every pole (its guard and `complexDiv`'s disagreed); `tan`'s pole test was 1e−9 loose; integer exponents lost exactness in slope ranges.
- Kept numeric: implicit turning points (need second-derivative ranges), parametric × parametric intersections, triple roots such as sin x = x at 0, tangencies (no sign change to prove).
- Regions: certainly-inside cells are not filled without sampling (sampling there is cheap); the boundary is what the interval tests sharpen.

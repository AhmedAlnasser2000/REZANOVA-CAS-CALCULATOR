# Poly-Rad Roadmap Reference (ChatGPT)

Date captured: 2026-04-09

Status: external roadmap reference only. This is not a locked Calcwiz roadmap commitment.

Source file:
- `<local-source>\poly_rad_roadmap.md`

Important interpretation:
- This note is preserved so future planning can compare the external roadmap against what Calcwiz actually shipped.
- Drift is allowed and expected where the repo reveals a better bounded milestone shape.
- Use this as a lane-reference document, not as an instruction to force exact milestone names or ordering when the codebase suggests a cleaner next step.

## External roadmap thesis

The Poly-Rad lane should be a visible algebra leap, not backend purity work. The desired user-facing outcome is:
- stronger exact simplify on uglier mixed algebra inputs
- more exact symbolic solves for polynomial-radical equations
- cleaner and more trustworthy denominator/domain conditions
- a more coherent algebra system across `Simplify`, `Factor`, and `Equation > Symbolic`

## Base assumptions recorded in the roadmap

The roadmap assumes these shipped milestones remain the foundation:
- `POLY1`
- `POLY2`
- `RAD1`
- `RAD2`
- `POLY-RAD1`

This matches the shared-core principle already adopted in the repo: new algebra breadth should extend shared polynomial/radical infrastructure rather than reintroducing feature-local solver logic.

## External roadmap phases

### Phase A — visible leap
1. `POLY-RAD2` — broader exact polynomialized radical follow-on
2. `POLY-RAD3` — bounded repeated radical clearing
3. `POLY-RAD4` — denominator/domain intelligence upgrade

### Phase B — algebra polish and structural strength
4. `POLY-RAD5` — wider conjugate / rationalization coverage
5. `POLY-RAD6` — mixed polynomial-radical factorization
6. `ABS-BRIDGE1` — bounded abs companion milestone

## External roadmap descriptions

### `POLY-RAD2`
- broaden exact follow-on solving after radical isolation / normalization
- recognize more equations that reduce to bounded polynomial form in a substituted carrier
- reuse the shared polynomial engine
- preserve candidate validation against the original equation

### `POLY-RAD3`
- add bounded repeated radical-clearing workflows
- support a controlled additional transform where mathematically justified
- preserve transform provenance and candidate validation
- stop honestly instead of widening into open-ended repeated squaring

### `POLY-RAD4`
- strengthen denominator-exclusion and radical-domain tracking
- merge and render conditions/exclusions more cleanly
- filter invalid candidate roots more explicitly
- improve trust in exact outputs without turning the milestone into UI redesign or architecture work

### `POLY-RAD5`
- broaden bounded conjugate / rationalization coverage
- improve exact cleanup after rationalization
- reuse bounded rationalization logic across simplify/factor/equation preprocess

### `POLY-RAD6`
- factor selected mixed polynomial-radical forms
- detect bounded perfect-square / perfect-power structure under radicals and after cleanup
- strengthen `Calculate > Factor` beyond polynomial-only wins

### `ABS-BRIDGE1`
- promote the current narrow radical-to-abs bridge into a deliberate bounded algebra capability
- support selected `|u| = v` style follow-ons created by supported radical transforms
- keep branch honesty and candidate validation explicit

## External order recommendation

Recommended order in the source roadmap:
1. `POLY-RAD2`
2. `POLY-RAD3`
3. `POLY-RAD4`
4. `POLY-RAD5`
5. `POLY-RAD6`
6. `ABS-BRIDGE1`

Rationale recorded in the source:
- `POLY-RAD2` broadens exact solve breadth first
- `POLY-RAD3` makes hard radical equations feel much stronger
- `POLY-RAD4` cleans trust/condition output after solve breadth rises
- `POLY-RAD5` / `POLY-RAD6` deepen simplify/factorization power after the solver leap
- `ABS-BRIDGE1` is valuable but best after the radical lane is already stronger

## Calcwiz-specific comparison checkpoint as of capture

At capture time, the repo had already shipped beyond the roadmap's assumed base:
- `POLY-RAD2` implemented and verified
- `POLY-RAD3` implemented and verified

That means the roadmap should now be read as:
- historical lane framing
- a reference for the intended Phase A -> Phase B arc
- a comparison tool for deciding whether `POLY-RAD4` really is the best next move or whether bounded coverage should widen further first

## Preserved anti-drift rules from the source

The source explicitly warns against:
- reopening the architecture lane mid-milestone without a concrete runtime need
- building a theorem prover or open-ended radical solver
- widening into multivariable algebra
- mixing plugin/profile/runtime-framework work into the Poly-Rad lane
- sacrificing candidate validation or condition tracking for raw breadth

These anti-drift rules fit Calcwiz well and should stay visible in future Poly-Rad planning.

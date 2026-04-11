# Calcwiz Playground

The Playground is Calcwiz's incubation area for experiments that are promising but not yet trustworthy enough for stable product code.

## What it is

- a level-based incubation system
- a safe place to test frontier ideas
- a proving ground for future capability

## What it is not

- not a production subsystem
- not a second runtime authority
- not a shortcut dependency source for stable app code

## Dependency rule

Playground code may import from stable product code when reuse is useful.

Stable product code under `src/` must never import from `playground/`.

That one-way rule is enforced in ESLint for TypeScript product code.

## Graduation rule

Successful experiments do not become product features by direct reuse.

They graduate by:
1. proving value here
2. becoming bounded and explainable
3. being extracted or rewritten into the correct stable layer
4. gaining real tests and product-facing contracts there

## Levels in this tree

- `level-0-research/`: raw ideas, sketches, comparisons
- `level-1-feasibility/`: repeated examples and early proof of usefulness
- `level-2-bounded-prototypes/`: constrained, explainable experiments with known limits
- `level-3-integration-candidates/`: experiments close enough to discuss stable adoption

Levels 4 and 5 do not live here. Once a capability is adopted or mature, it belongs in stable product architecture instead of Playground.

## Required experiment metadata

Every meaningful experiment should record:
- owner
- current level
- hypothesis
- in-scope cases
- out-of-scope cases
- known stop reasons
- success criteria
- promotion criteria
- retirement criteria

Use the starter templates in `playground/templates/`.

## What PGL1 includes

`PGL1` intentionally includes:
- this boundary scaffold
- starter records/templates
- import-fence enforcement

`PGL1` intentionally does not include:
- workflow automation
- schema validation
- experiment execution infrastructure
- any direct stable runtime dependency on Playground

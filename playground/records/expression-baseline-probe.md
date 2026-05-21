# Expression Baseline Probe

## Metadata

- experiment_id: `expression-baseline-probe`
- title: `Expression Baseline Probe`
- owner: `unassigned`
- lane_topic: `visual-labs`
- current_level: `level-0-research`
- status: `active`
- date_started: `2026-05-21`
- last_reviewed: `2026-05-21`
- next_review: `after PGL-VIS1 manual smoke`
- candidate_stable_home: `dev-only labs runner bridge / future incubation tooling`
- companion_manifest: `playground/manifests/expression-baseline-probe.yaml`

## Hypothesis

- A dev-only Labs runner can accept expression input visually without making Playground a product runtime or changing stable Calculate behavior.

## Why It Matters

- PGL-VIS1 needs both equation and expression input from the first interactive console.
- Expression input should be visible and testable before any risky expression experiment exists.
- This probe proves the UI, envelope, and runner bridge using only stable Calculate behavior.

## In Scope

- Expression-shaped input in the Labs console.
- A structured runner envelope for stable Calculate probe output.
- Clear experimental labeling and no history/result-provenance mixing.

## Out Of Scope

- New expression math behavior.
- New product result contracts.
- Stable app imports from `playground/`.
- External compute, source mirrors, FriCAS execution, or remote controls.

## Known Stop Reasons

- Unsupported or malformed expression input should return the stable Calculate stop surfaced through the probe envelope.
- If a future expression experiment needs new behavior, it must become a separate Playground record.

## Success Criteria

- The Labs console can run one expression visually through a dev-only runner.
- The result is clearly labeled experimental.
- Stable Calculate behavior and shipped outputs remain unchanged.

## Promotion Criteria

- The runner bridge proves useful enough to host real expression experiments in later PGL-VIS slices.

## Retirement Criteria

- A richer expression experiment supersedes this probe, or the Labs console no longer needs a baseline expression proof.

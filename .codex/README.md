# Controlled Codex Agent Workflow

`AGENTS.md` is authoritative. These project-scoped roles are dormant unless the user explicitly authorizes subagents for the specific current task.

## Task Start Recommendation

Before substantive work on a new meaningful repository task, root performs only enough read-only grounding to classify it, then states the recommended route, the main reason, and whether subagents would be used.

- If `DIRECT` is recommended, root explains briefly and proceeds automatically without waiting for approval.
- If `CONTROLLED` is recommended, root pauses for explicit task-specific approval before spawning agents.
- If `CRITICAL` is recommended, root pauses for explicit task-specific approval before spawning agents or beginning critical execution.
- Status checks, simple questions, and clear continuations do not repeat the recommendation.
- A material scope change, newly discovered independent task, or completed-task transition requires a fresh recommendation.
- If the user already names a route, root explains the assessment and honors it without reconfirmation.

## Routes

- `DIRECT`: cohesive, low-risk work with no useful independent delegation; root works alone. This is the default.
- `CONTROLLED`: multiple independent investigation, testing, or review lanes with one bounded writer; root may delegate only after explicit per-task permission.
- `CRITICAL`: unresolved high-risk correctness, schema or persistence, security, destructive recovery, or architecture work requiring stricter stops and root-owned decisions.

Permission expires when the task completes or its material scope changes. Configuration presence, prior permission, or a prior task does not authorize delegation.

## Orchestration

- Root is the sole orchestrator and the only agent that may spawn, steer, interrupt, or close subagents.
- At most three subagents may be open concurrently.
- At most one writable role may be active, and only `calcwiz_implementer` is writable.
- Child agents must not spawn subagents.
- After one failed remediation cycle, stop the delegated remediation and return control to root.
- Root or Implementer owns durable-memory edits; there is no Documentation role.

## Context Packet

Every delegated task must state: goal, why the role is needed, relevant architecture, known execution path, files to inspect, files allowed to modify, forbidden paths, invariants, expected output, verification, and stop conditions.

## Compact Result Contract

Read-only roles return concise findings with paths, symbols, evidence, uncertainties, and blockers. The Implementer returns changed paths, behavior impact, verification, and unresolved risks. Raw logs stay out of the root thread unless needed to prove a finding.

## Stop Conditions

Stop and return control to root on missing authority, scope expansion, a required edit outside the allowed paths, conflicting ownership, a new architecture decision, an unclassified regression, or the first failed remediation cycle.

## Model Portability

Role purpose, access, output contracts, and stop conditions are model-independent. Current assignments live in `tools/codex-agent-workflow-model-baseline.json`. Changing them requires an explicitly approved model-migration gate; it must not widen permissions, concurrency, responsibilities, or spawning authority.

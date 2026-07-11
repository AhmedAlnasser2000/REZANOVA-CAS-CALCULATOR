# Approvals

## Scope
- This ledger is for governance-level approvals, workflow-policy approvals, and major roadmap-sequencing approvals.
- Do not use it for routine feature tasks or ordinary commit approvals.

## Required Fields
- approved_at_local
- approver
- decision
- recorded_by_agent
- recorded_by_agent_model
- recorded_by_agent_family (required for entries dated `2026-07-09` or later)
- source
- canonical_targets
- notes

## Entries
- approved_at_local: 2026-04-09 22:18:00 +03:00
  approver: user
  decision: Adopt the Calcwiz agent-governance and memory-attribution protocol, including full historical backfill and validator enforcement.
  recorded_by_agent: codex
  recorded_by_agent_model: gpt-5.4
  source: chat-2026-04-09-agent-governance-plan
  canonical_targets: AGENTS.md; docs/workflow/commit-first-gates.md; .memory/PROTOCOL.md; .memory/current-state.md; .memory/decisions.md
  notes: Historical ownership is user-confirmed as Codex-only, with the primary-agent model split at 2026-03-12.
- approved_at_local: 2026-07-09 +03:00
  approver: user
  decision: Execute the Calcwiz anti-regression program as one attribution-governance prerequisite, four Incident Closure milestones, a mandatory review checkpoint, and five Behavioral Ratchets, with one verified commit per named milestone.
  recorded_by_agent: codex
  recorded_by_agent_model: gpt-5.6
  recorded_by_agent_family: sol
  source: chat-2026-07-09-anti-regression-program-approval
  canonical_targets: .memory/research/roadmaps/anti-regression-nine-move-roadmap.md; .memory/sessions/2026-07/2026-07-09/2026-07-09__anti-regression-nine-move-program/
  notes: Explicit user approval remains required before every commit and push; Behavioral Ratchets cannot start before the Incident Closure review is accepted.
- approved_at_local: 2026-07-10 +03:00
  approver: user
  decision: Lock independent Matrix and Vector runtime topology prospectively before remaining Linear Algebra capability work, while preserving the truthful failed current-risk audit and completing Anti-Regression Moves 5-9 first.
  recorded_by_agent: codex
  recorded_by_agent_model: gpt-5.6
  recorded_by_agent_family: sol
  source: chat-2026-07-10-linear-algebra-topology-lock
  canonical_targets: .memory/research/readiness/linear-algebra-topology-lock-recap.md; .memory/research/audits/linear-algebra-shell-split0.md; .memory/research/roadmaps/anti-regression-nine-move-roadmap.md; .memory/research/roadmaps/linear-algebra-vector-matrix-roadmap.md
  notes: Anti-Regression Moves 5-9 remain unimplemented repository work, not completed Git history. Explicit approval is still required before each commit or push.
- approved_at_local: 2026-07-11 +03:00
  approver: user
  decision: Grant standing commit approval for all remaining anti-regression milestones, Behavioral Ratchets 6-9, while preserving one separately verified commit per named move.
  recorded_by_agent: codex
  recorded_by_agent_model: gpt-5.6
  recorded_by_agent_family: sol
  source: chat-2026-07-11-anti-regression-remaining-commit-approval
  canonical_targets: .memory/research/roadmaps/anti-regression-nine-move-roadmap.md; .memory/sessions/2026-07/2026-07-09/2026-07-09__anti-regression-nine-move-program/
  notes: This approval covers commits only. No push is authorized; `test-results/` remains excluded from staging.
- approved_at_local: 2026-07-11 03:22:39 +03:00
  approver: user
  decision: Approve the Calcwiz Printer, canonical Clipboard, and typed detail-segment program, including its risk-sliced migrations and all named commits in this session.
  recorded_by_agent: codex
  recorded_by_agent_model: gpt-5.6
  recorded_by_agent_family: sol
  source: chat-2026-07-11-printer-clipboard-detail-program-approval
  canonical_targets: .memory/research/roadmaps/printer-detail-clipboard-roadmap.md; .memory/sessions/2026-07/2026-07-11/2026-07-11__printer-detail-clipboard-roadmap0/
  notes: Standing approval covers the named commits only. The mandatory contract review still blocks pedagogical profile migration, scope-changing commits require renewed approval, no push is authorized, and `test-results/` remains excluded.

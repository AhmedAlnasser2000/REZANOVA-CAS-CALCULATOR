# EQUATION-STAGE-CARRIER-GUARDED1 Gate

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live

## Gate

- kind: backend transport migration with UI parity verification
- status: pass
- scope: guarded merge, substitution, composition, algebra, mixed-polynomial, and trig-rewrite recursive result transport
- authority: existing `EquationSolveResultContractV1`; no new solver IR or runtime authority

## Evidence

- Focused Vitest: 12 files and 192 current tests passed, including all Equation golden/replay carrier checks; the 22-test AST ratchet also passed.
- Incremental TypeScript and the production build passed; only existing build warnings remain.
- Display inversion inventory: 677 producers, 603 consumers, 171 native paths, 47 owner assemblies, one compatibility projection, 411 legacy reads, and no violations. Equation has 141 native paths and zero compatibility projections.
- Focused Chromium: five Equation flows passed with zero retries.
- Visual inspection: exact periodic, numeric periodic/domain, candidate evidence, collapsed summary, and overflow surfaces remain readable and unchanged.

## Boundaries

- No mathematical result, wording, printer profile, worker host, capability, cancellation, History, OOE, or Surface DTO change.
- Prompts remain control flow and are rejected by the stage carrier.
- `test-results/` and ignored screenshot artifacts remain outside the commit.
- Next gate: `EQUATION-STAGE-CARRIER-CLOSEOUT1`.

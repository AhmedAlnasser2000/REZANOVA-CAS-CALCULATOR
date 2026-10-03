# EQUATION-EXACT-ALGEBRA1

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

## Authority and scope

- 2026-10-03: the user approved the plan for this CRITICAL, root-only backend gate (plan-mode approval). The user chose to keep factorization and root isolation as a separate next gate, and pre-authorized commit and push to `claude/confident-goodall-fbqe99` once every check passes. No subagents were used.
- Scope: new private files under `src/lib/symbolic-engine/equation/core/`, the spec and roadmap updates, and Equation-owned memory. No edits to the old `src/lib/equation/`, the integration core, result contracts, OOE, UI, dependencies or file-size baselines.

## Outcome

- Built the execution context (typed stops `work | allocation | cancelled`, limb-proportional charging, cooperative cancellation) and the two rails: an isolation test in both directions, and a no-caps ratchet that includes a self-test.
- Built the exact-algebra substrate:
  - ZZ/QQ domains, modular tools and CRT, rational reconstruction;
  - generic dense polynomials with Karatsuba (crossover 24, measured);
  - division, pseudo-division and exact division;
  - subresultant resultants and gcd;
  - Brown modular gcd with unlucky-prime handling;
  - extended gcd over QQ;
  - Yun square-free decomposition;
  - Bareiss linear algebra with nullspace and inconsistency witness;
  - the private wire format v1.
- Every public result is verified before return. The design's no-caps rule holds: no degree, size, depth or count limit exists.

## Evidence

See verification-summary.md.

## Durable memory updated

- `.memory/current-state.md`
- `.memory/decisions.md`
- `.memory/open-questions.md` and `.memory/closed-questions.md` (the merge question was resolved)
- `.memory/journal/2026-10/2026-10-03.md`
- `docs/architecture/equation/equation-exact-algebra1-spec.md` and `equation-reconstruction-roadmap.md`
- This dossier's completion report, verification summary and commit log.

## Handoff

Next is `EQUATION-ALGEBRAIC-NUMBERS1`: factorization over Q (Cantor–Zassenhaus, Hensel, Zassenhaus recombination), real and complex root isolation, and RootOf arithmetic. It needs its own approval. Nothing here is product-adopted.

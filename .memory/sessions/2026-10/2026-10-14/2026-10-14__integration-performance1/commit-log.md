# Performance gate commit checkpoint

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-6
- primary_agent_family: sol
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-6
- verified_by_agent_family: sol
- committed_by_agent: codex
- committed_by_agent_model: gpt-6
- committed_by_agent_family: sol
- attribution_basis: live
- commit_hash: containing commit

## Scope and authority

- Date: 2026-10-15. Gate type: backend with affected ui regression acceptance; pass.
- Explicit user request: commit the completed large gate and explain its work and what comes next. Gate 1 remains the separate predecessor 48b584ac. No push or new-gate implementation.
- Intended containing commit: INTEGRATION-PERFORMANCE1: accelerate checked integration and compact replay.
- Include verified core arithmetic/admission/geometric/certificate changes, focused tests and reproducible measurement harness code, current rational/exponential adapters, specifications, lowered file-size caps and required durable memory.
- Exclude all raw serial measurements, detailed measurement reports, profiles, screenshots, exported test artifacts and the unrelated root tsconfig.tsbuildinfo. The earlier user prohibition remains binding.
- Repository lint/build pass. Lint reports one warning in unchanged Graphing code and zero errors. Preserve accepted focused tests, strict corpus/control acceptance and eleven visually inspected current-source Playwright scenarios; do not rerun known slow baselines or a full suite for metadata-only closeout.
- Final memory/file-size and staged diff checks accompany this checkpoint. Exact successful proof reuse remains operation-local; independent replay and current resource limits are unchanged.
- Git author/committer identity is passed only for this command from the immediately preceding authorized gate, following the documented existing practice. No global/repository identity configuration, amendment or history rewrite.

# Equation Direct-Symbolic Worker District

Status: audit plus split record

Purpose: document the Direct-Symbolic Worker district created by `EQUATION-DIRECT-SYMBOLIC-WORKER-DISTRICT1`. This milestone preserves the root client and worker entrypoints while moving private worker-client, worker-runtime, and message-contract ownership into `src/lib/equation/direct-symbolic-worker/`.

## Public Surface

- `EQUATION_DIRECT_SYMBOLIC_WORKER_HOST_ID`
- `EQUATION_DIRECT_SYMBOLIC_FALLBACK_HOST_ID`
- `runEquationDirectSymbolicViaIsolatedWorker`
- `EquationDirectSymbolicWorkerInboundMessage`
- `EquationDirectSymbolicWorkerOutboundMessage`

The root compatibility entrypoints remain `equation-direct-symbolic-worker-client.ts` and `equation-direct-symbolic.worker.ts`.

## Internal Responsibility Map

- Message contract: inbound/outbound worker messages and the minimal worker global-scope shape.
- Client runner: worker construction, request ids, cancellation polling, fallback routing, host evidence, and terminal status assembly.
- Worker runtime: isolated worker message handling, fallback solve execution, and failed-message conversion.
- Tests: focused direct-symbolic worker tests live with the district while importing through the root entrypoints.

## High-Risk Contracts

- Worker and fallback host ids must stay unchanged for OOE provenance and runtime diagnostics.
- The root worker file remains the bundler entrypoint used by the client worker URL.
- Cancellation must still hard-stop the worker, report cancellation host evidence, and avoid falling through to a visible commit.
- Worker initialization, post-message, runtime error, and runtime failure paths must continue falling back to the main-thread helper.
- Direct-symbolic fallback behavior must keep using the guarded direct-symbolic fallback runner.
- OOE host evidence must continue distinguishing isolated worker completion, cancellation, and fallback.

## Test Gates

- `npx tsc -b --pretty false`
- `npm run test:unit -- src/lib/equation/direct-symbolic-worker/*.test.ts`
- `npm run test:unit -- src/lib/ooe/pilots/equation-pilot.test.ts src/app/logic/runtimeControllers.test.ts src/lib/modes/equation.test.ts`
- `npm run lint`
- `npm run build`
- `npm run test:file-sizes`
- `npm run test:memory-protocol`
- `git diff --check`

## Stop Rules

- Do not change solver behavior, output wording, display/readback policy, OOE/runtime policy, replay/history contracts, schemas, capabilities, worker-host identity, or reserved-symbol policy.
- Do not remove the root worker entrypoint or point the worker URL at a private path unless a later bundler contract milestone explicitly approves it.
- Do not add new direct-symbolic solver families or change guarded stage order.

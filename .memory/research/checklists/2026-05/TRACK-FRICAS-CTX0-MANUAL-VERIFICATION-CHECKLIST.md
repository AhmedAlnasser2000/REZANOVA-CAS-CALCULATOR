# TRACK FRICAS-CTX0 Manual Verification Checklist

primary_agent: codex  
primary_agent_model: gpt-5.5  
milestone: FRICAS-CTX0  
date: 2026-05-01

## Scope

- FriCAS is studied as source context only.
- The local mirror remains ignored under `playground/sources/mirrors/fricas/`.
- Durable outputs are research notes, Playground record/manifest metadata, and a context corpus.
- No product math behavior changes.

## Boundary Checks

1. Confirm `playground/sources/metadata/fricas.yaml` records status `active`, capture commit, and capture date.
2. Confirm no FriCAS mirror payload is tracked.
3. Confirm stable `src/` code does not reference `playground/sources`.
4. Confirm Playground record `fricas-context-atlas` exists and remains `level-0-research`.
5. Confirm the context corpus is under Playground and is not wired into product correctness.
6. Confirm research notes explicitly reject direct dependency, submodule, hidden backend, code copying, and feature parity.

## Commands

```bash
npm run test:source-mirrors
git check-ignore playground/sources/mirrors/fricas/.probe
git ls-files playground/sources/mirrors
npm run test:playground
npm run generate:labs-catalog
npm run test:labs-catalog
npm run test:memory-protocol
npm run lint
npm run build
```

## Expected Result

- FriCAS metadata validates as an active context mirror.
- Only `playground/sources/mirrors/.gitkeep` is tracked under mirror payloads.
- The `fricas-context-atlas` Playground record appears in the generated Labs catalog.
- The typed context corpus validates as bounded source-context research.
- No stable Calcwiz runtime imports or reads from FriCAS or `playground/sources`.

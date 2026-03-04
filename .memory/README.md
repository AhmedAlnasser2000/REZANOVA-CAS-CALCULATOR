# Memory

`\.memory/` is the durable recall bundle for Calcwiz Desktop.

Purpose:
- preserve product and engineering context across sessions
- keep lightweight operational state close to the repo
- separate durable memory from temporary task scratch space

Tracked here:
- memory entrypoints and protocol
- current repo/product state
- stable canon and decisions
- open questions
- dated journals
- task dossiers under `sessions/`
- reusable templates
- lightweight research notes

Ignored elsewhere:
- `.task_tmp/` is the temporary gate/task workspace
- `.memory/logs/`, `.memory/scratchpads/`, and `.memory/review-video/` stay transient or heavy and should not drive workflow decisions

Rules:
- keep notes human-readable and lightweight
- do not make runtime behavior depend on `.memory/`
- use `INDEX.md` as the read entrypoint and `PROTOCOL.md` for read/write rules
- plain-text math syntax is acceptable for memory artifacts; the app UI must not depend on it

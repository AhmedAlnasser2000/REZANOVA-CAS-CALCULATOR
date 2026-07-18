# Notebook object-frame replacement risk register

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.6
- primary_agent_family: sol
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.6
- recorded_by_agent_family: sol
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.6
- verified_by_agent_family: sol
- attribution_basis: live
- gate_type: backend
- date: 2026-07-18

| Risk | Failure mode | Control / evidence | Stop threshold |
| --- | --- | --- | --- |
| document loss | Schema 14 conflicting fields are discarded under the wrong precedence | shared expected Schema 15 fixtures, raw upgrade snapshot, source package untouched, visible pre/post comparison | any valid Schema 14 object cannot be represented without visible or semantic loss |
| schema drift | TypeScript and Rust accept or normalize different frames | exact tagged unions, unknown-key rejection, shared V6-V15 fixtures and compatibility command | any JSON or repair-code mismatch |
| ingress leakage | legacy keys remain usable in current runtime | current type/validator forbids keys; anti-zombie path/symbol ratchet | any current save emits or consumer reads removed keys |
| dual authority | frame coexists with percent/point/aspect/placement writes | one Tiptap attr and one command module; explicit deletion Gate 8 | two live paths can change one object's geometry |
| asset dependency | image geometry cannot resolve when intrinsic metadata is absent | intrinsic height mode, safe decode metadata enrichment, bounded unavailable placeholder | document migration requires raw bytes or silently invents permanent height |
| pagination regression | rotated/floating/wrapped objects move pages or overlap running matter | pure frame-to-layout fixtures, page matrix, existing policy tests, Playwright | header/footer overlap, lost fixed page, unstable anchor page, silent layout mutation |
| structured overflow | auto-height Section/container cannot fit as float | derived overflow finding and one undoable return-to-flow command | layout writes flow mode automatically or content clips/losses |
| export regression | destinations use different geometry or freeze before save choice | immutable projection, destination-first picker, PDF/DOCX/Web fixtures, compatibility findings | DOM becomes export truth, fallback is silent, or cancel writes/builds package |
| DOCX mismatch | anchored structures are not editable/portable in Word or LibreOffice | OOXML inspection, LibreOffice render, Microsoft Word smoke; explicit fallback | malformed OOXML or claimed fidelity without evidence |
| undo regression | gesture creates many transactions or compound move splits | command instrumentation and one-undo tests | pointer preview mutates doc or one release produces more than one undo unit |
| performance regression | selection/pointer events trigger serialization, React churn, full pagination | separated revisions, RAF preview, 5,000-block trace and budgets | preview invokes document/layout/autosave or exceeds fidelity/latency budget |
| accessibility regression | overlay controls are pointer-only or steal editor shortcuts | keyboard command parity, focus tests, live announcements, forced colors | any primary operation lacks keyboard alternative or body typing breaks |
| registry divergence | Objects & Layers stores geometry or stale duplicate identity | registry keyed only by node ID and rebuilt from document/layout | registry can save or override frame geometry |
| behind-text discoverability | object becomes impossible to select on canvas | registry selection plus Alt-click z-stack cycling | hidden object cannot be selected or unlocked without changing document |
| page setup conflict | preserved point geometry falls outside a changed sheet | compound page-setup command for fixed boxes; derived clamp finding for auto height | silent data rewrite or header/footer overlap |
| migration-report pollution | repair evidence becomes author content | sidecar report plus raw snapshot; report omitted from document/package content | repair prose appears in Notebook content or changes publication |
| retained zombie code | old gesture/CSS/custom-event branches remain after parity | explicit deletion map, file-size ratchet, forbidden-symbol test | old path remains load-bearing at closeout |
| scope expansion | object work leaks into video, Graphing, solver, OOE, or general framework | gate touchlists and stop conditions | any forbidden subsystem becomes a prerequisite |

## Resolved product choices

- New objects remain in flow by default.
- Floating remains opt-in or results from a whitespace drop.
- Flow and floating are explicit frame variants, not inferred CSS states.
- Image width/height may be deliberately distorted; intrinsic mode is used only when no explicit height exists or Reset proportions is chosen.
- Videos remain removed.
- Hide while editing and interaction lock are session-only in V1 and do not alter output.
- Permanent hidden-from-publication objects and persisted lock state are outside V1.
- Tight/through contour wrapping remains out of scope.

## Open user decisions

None. The current repo evidence and previously locked product direction resolve the technical and product choices needed for this contract gate. Any request to persist hide/lock state or add permanent publication visibility would be a separate schema/product decision, not an ambiguity in V1.

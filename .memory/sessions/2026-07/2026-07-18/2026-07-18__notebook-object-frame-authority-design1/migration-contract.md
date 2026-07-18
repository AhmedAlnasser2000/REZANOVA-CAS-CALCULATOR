# Schema 14 to Schema 15 object-frame migration contract

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

## Version decision

Schema 15 is required. Schema 14 cannot delete independent percentage, point, ratio, legacy placement, and floating-width fields without changing the persisted contract.

The stored-record, package-manifest, and asset-record envelope versions do not need to change merely because their embedded document advances. Their validators and compatibility manifests must recognize current Schema 15.

## Ingress sequence

1. Identify source document schema.
2. Validate it with the exact historical validator.
3. Migrate Schemas 1-13 through the existing compatibility ingress to a validated Schema 14 value.
4. Normalize every eligible Schema 14 node into `NotebookObjectFrameV1`.
5. Remove all superseded keys.
6. Normalize floating z-order globally.
7. Strictly validate the complete Schema 15 graph.
8. Return `{ document, report }` internally.

The runtime never accepts a current-looking hybrid document. Schema 15 with any removed geometry key fails strict validation.

## Deterministic mapping

### Image width

1. Floating `objectPlacement.widthPt`.
2. `displayWidthPt`.
3. `(widthPercent ?? 100) / 100 * pageSetup.usableWidthPt`.

The result becomes fixed frame width. It is normalized to 0.001 point and bounded to 36-2,000 points. A bound adjustment records `frame-size-clamped`.

### Image height

1. `displayHeightPt` becomes fixed frame height.
2. Otherwise `canonicalWidth / displayAspectRatio` becomes fixed frame height.
3. Otherwise use intrinsic height mode.

Fixed width and height preserve deliberate distortion. A redundant conflicting aspect ratio records `redundant-aspect-discarded`. Floating width wins over point width because the current floating renderer/paginator visibly uses it; `displayHeightPt`, when present, remains unchanged to preserve current visible distortion.

### Image flow placement

| Schema 14 | Schema 15 |
| --- | --- |
| missing/flow object placement + `normal` | flow, legacy alignment or center, wrap none |
| `top-and-bottom` | flow, legacy alignment or center, wrap top-and-bottom |
| `square-left` | flow, left, square |
| `square-right` | flow, right, square |

The current 18 CSS-pixel adjacent square gap becomes 13.5 points on the text-facing side. Other flow distances are zero.

### Image transform

- rotation defaults to `0` and otherwise maps directly after normalization;
- complete crop maps directly;
- missing crop maps to null;
- incomplete/invalid crop cannot occur in a valid Schema 14 document and fails historical validation rather than being guessed.

### Non-image objects

- Flow object: available width, auto height, flow/center/none/zero distance.
- Floating object: fixed width from placement, auto height, and direct placement mapping without the legacy width member.
- No non-image object receives image transform.

### Floating mapping

Anchor, references, X/Y, wrap, distances, and z-order map directly. Paragraph-anchor graph rules remain. Z-order is normalized by current document order when old values are valid but non-contiguous; such normalization records `z-order-normalized`.

## Repair-report codes

The migration report is sidecar evidence, not document content.

| Code | Meaning |
| --- | --- |
| `floating-width-precedence` | floating width replaced a differing image point/percentage width |
| `point-width-precedence` | point width replaced a differing percentage width |
| `redundant-aspect-discarded` | fixed point width/height won over a conflicting aspect ratio |
| `frame-size-clamped` | a valid legacy value exceeded Schema 15 frame bounds |
| `square-gap-converted` | the legacy CSS gap was converted to canonical points |
| `z-order-normalized` | floating z-order was rewritten to a contiguous stack |
| `intrinsic-height-selected` | no durable height/ratio existed; immutable asset ratio will supply height |

Normal expected conversion may omit noisy report rows. Conflicts, clamping, and fallbacks must be reported.

## Durable safety

- Opening a legacy record migrates in memory and does not rewrite disk immediately.
- Before the first Schema 15 save over a durable older record, preserve the existing raw `before-schema-upgrade` snapshot once per source revision.
- If snapshot creation or atomic save fails, retain the original record.
- `.cwiznb` import validates the source package before mutation, migrates into a new library identity, and leaves the source file untouched.
- Version restore, Trash/Restore, recovery, summaries, and package inspection use the same ingress.
- Diagnostic raw recovery remains available when the source bytes are readable but historical validation fails.

## TypeScript/Rust parity

Both implementations must share:

- current schema 15 / minimum durable schema 6 manifest values;
- exact tagged union and unknown-key rejection;
- page-dimension constants and usable-width calculation;
- 0.001 point/degree normalization;
- precedence and repair codes;
- graph and z-order rules;
- shared V6-V15 golden fixtures with expected Schema 15 JSON and report;
- TypeScript-only V1-V5 best-effort fixtures.

The compatibility command fails if either language rejects a supported fixture, produces different normalized JSON, produces different repair codes, or changes a document schema without browser, desktop, snapshot, and package evidence.

## Required fixtures

- percent-only image on A4, Letter, and Legal;
- point width only;
- point width and height with deliberate distortion;
- point dimensions conflicting with aspect ratio;
- floating width conflicting with point width;
- intrinsic-only PNG/JPEG/WebP/SVG metadata;
- missing intrinsic metadata with safe later decode;
- each legacy flow placement/alignment combination;
- floating paragraph/page anchors, all references and wraps;
- rotated/cropped image;
- flow/floating equation, evidence, divider, container, and Section;
- nested paragraph-anchor repair constraints;
- non-contiguous layer order normalization;
- Trash, snapshot, recovery, and `.cwiznb` copies;
- future schema, pre-V6 durable input, malformed frame, and hybrid Schema 15 rejection.

## Stop conditions

Implementation stops if:

- TypeScript and Rust cannot emit identical normalized fixtures;
- a valid Schema 14 image cannot be represented by fixed or intrinsic height without visible loss;
- a destination requires another persisted geometry field;
- runtime consumers still require removed keys after the frame live gate;
- asset resolution is proposed as document geometry authority rather than intrinsic metadata;
- video would need to return.

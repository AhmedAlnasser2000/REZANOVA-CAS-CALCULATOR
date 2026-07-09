# FORMULA-VIEWER-VIRTUALIZATION1 Manual App Checklist

## Attribution

- primary_agent: codex
- primary_agent_model: gpt-5.5
- contributors: []
- recorded_by_agent: codex
- recorded_by_agent_model: gpt-5.5
- verified_by_agent: codex
- verified_by_agent_model: gpt-5.5
- attribution_basis: live

## Checklist

- [ ] `sin((z^3+z+1)/(z-m))=b` in Real Exact keeps the source answer compact and opens a Formula Viewer tab.
- [ ] The Formula Viewer initially mounts only a subset of virtual rows/blocks, and scrolling reveals later rows.
- [ ] Opening `Trig Formula Cases` or another heavy case detail does not mount all formula rows at once.
- [ ] Clicking one `Show formula row` action renders only that row.
- [ ] Copy Result works before scrolling, after scrolling, and after revealing one row.
- [ ] Switching tabs or editing/re-solving cancels stale virtual rendering work.
- [ ] History replay of row-presented Cardano/Ferrari results still avoids raw `\substack`.
- [ ] Display roadmap remains open for viewer readability/sizing polish: huge formulas should become easier to inspect, not merely cheaper to mount.

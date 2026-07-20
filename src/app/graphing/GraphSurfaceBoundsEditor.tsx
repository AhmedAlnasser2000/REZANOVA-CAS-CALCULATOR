import { useState } from 'react';
import type { GraphRelationIR, GraphViewportV1 } from '../../lib/graphing';

type Bounds = NonNullable<Extract<GraphRelationIR, { kind: 'real-surface' }>['bounds']>;

export function GraphSurfaceBoundsEditor({
  bounds,
  onChange,
  viewport,
}: {
  bounds?: Bounds;
  onChange: (bounds?: Bounds) => boolean;
  viewport: GraphViewportV1;
}) {
  const [invalid, setInvalid] = useState(false);
  const active: Bounds = bounds ?? {
    xMin: viewport.xMin, xMax: viewport.xMax, yMin: viewport.yMin, yMax: viewport.yMax,
  };
  const commit = (key: keyof Bounds, raw: string) => {
    const value = Number(raw);
    const next = { ...active, [key]: value };
    const accepted = Number.isFinite(value) && onChange(next);
    setInvalid(!accepted);
  };
  return <section aria-label="Surface domain" className="graph-surface-bounds">
    <div><strong>Surface domain</strong><span>{bounds ? 'Locked bounds' : 'Current ground-plane view'}</span></div>
    <div className="graph-surface-bounds-grid">
      {(['xMin', 'xMax', 'yMin', 'yMax'] as const).map((key) => <label key={key}>
        <span>{key === 'xMin' ? 'x min' : key === 'xMax' ? 'x max' : key === 'yMin' ? 'y min' : 'y max'}</span>
        <input defaultValue={active[key]} key={`${key}:${active[key]}`} onBlur={(event) => commit(key, event.currentTarget.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }} step="any" type="number" />
      </label>)}
    </div>
    <button disabled={!bounds} onClick={() => { setInvalid(false); onChange(undefined); }} type="button">Use current view</button>
    {invalid ? <p role="alert">Bounds must be finite, with each minimum below its maximum.</p> : null}
  </section>;
}

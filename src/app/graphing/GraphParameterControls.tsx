import { Pause, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { GraphItemSpecV1 } from '../../lib/graphing';

type Values = Partial<Pick<
  Extract<GraphItemSpecV1, { kind: 'parameter' }>['parameter'],
  'value' | 'minimum' | 'maximum' | 'step' | 'animation'
>>;

export function GraphParameterControls({ item, onSettle, onUpdate, samplingBusy }: {
  item: Extract<GraphItemSpecV1, { kind: 'parameter' }>;
  onSettle: () => void;
  onUpdate: (values: Values) => boolean;
  samplingBusy: boolean;
}) {
  const parameter = item.parameter;
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync(); query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);
  const playing = parameter.animation?.enabled === true && !reducedMotion;
  useEffect(() => {
    if (!playing) return undefined;
    const timer = window.setInterval(() => {
      if (samplingBusy) return;
      const span = parameter.maximum - parameter.minimum;
      if (!(span > 0)) return;
      const candidate = parameter.value + parameter.step;
      onUpdate({ value: candidate > parameter.maximum ? parameter.minimum : candidate });
    }, 80);
    return () => window.clearInterval(timer);
  }, [onUpdate, parameter.maximum, parameter.minimum, parameter.step, parameter.value, playing, samplingBusy]);
  const commitNumber = (key: 'value' | 'minimum' | 'maximum' | 'step', rawValue: string) => {
    const value = Number(rawValue); if (Number.isFinite(value)) onUpdate({ [key]: value }); onSettle();
  };
  return <div className="graph-parameter-controls" data-testid={`graph-parameter-${parameter.symbol}`}>
    <div className="graph-parameter-heading"><strong>{parameter.symbol}</strong>
      <span>{parameter.origin === 'authored-definition' ? 'Authored parameter' : 'Graph slider'}</span>
      <output aria-label={`${parameter.symbol} value`}>{parameter.value.toFixed(2)}</output></div>
    <div className="graph-parameter-slider-row"><input aria-label={`${parameter.symbol} slider`}
      max={parameter.maximum} min={parameter.minimum} onChange={(event) => onUpdate({ value: event.currentTarget.valueAsNumber })}
      onKeyUp={(event) => { if (event.key === 'Enter') onSettle(); }} onPointerUp={onSettle}
      step={parameter.step} type="range" value={parameter.value} />
      <button aria-label={playing ? `Pause ${parameter.symbol}` : `Play ${parameter.symbol}`}
        className="graph-parameter-play" disabled={reducedMotion} onClick={() => {
          onUpdate({ animation: { direction: 'forward', enabled: !playing,
            periodMs: Math.max(80, Math.round((parameter.maximum - parameter.minimum) / parameter.step) * 80) } });
          if (playing) onSettle();
        }} title={reducedMotion ? 'Animation is disabled by reduced motion.' : undefined} type="button">
        {playing ? <Pause aria-hidden="true" size={14} /> : <Play aria-hidden="true" size={14} />}
      </button></div>
    <div className="graph-parameter-fields">{([
      ['value', 'Value'], ['minimum', 'Min'], ['maximum', 'Max'], ['step', 'Step'],
    ] as const).map(([key, label]) => <label key={key}><span>{label}</span><input
      aria-label={`${parameter.symbol} ${label.toLowerCase()}`} defaultValue={parameter[key]}
      key={`${key}:${parameter[key]}`} onBlur={(event) => commitNumber(key, event.currentTarget.value)}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
      step={key === 'step' ? 'any' : parameter.step} type="number" /></label>)}</div>
  </div>;
}

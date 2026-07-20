import { type CSSProperties, useEffect, useRef } from 'react';
import {
  GRAPH_COLOR_TOKENS,
  graphThemeLabel,
  normalizeGraphItemPresentation,
  resolveGraphPresentationColor,
  type GraphAppearanceThemeV1,
  type GraphItemPresentation,
  type GraphItemPresentationV2,
} from '../../lib/graphing';

const THEMES: GraphAppearanceThemeV1[] = ['technical', 'paper', 'aurora', 'luminous'];

export function GraphThemeControls({
  colorVisionMode,
  onChange,
  theme,
}: {
  colorVisionMode: 'standard' | 'color-vision-friendly';
  onChange: (value: {
    theme?: GraphAppearanceThemeV1;
    colorVisionMode?: 'standard' | 'color-vision-friendly';
  }) => void;
  theme: GraphAppearanceThemeV1;
}) {
  return <div className="graph-theme-controls">
    <label>
      <span>Theme</span>
      <select aria-label="Graph theme" onChange={(event) => onChange({
        theme: event.currentTarget.value as GraphAppearanceThemeV1,
      })} value={theme}>
        {THEMES.map((candidate) => <option key={candidate} value={candidate}>
          {graphThemeLabel(candidate)}
        </option>)}
      </select>
    </label>
    <button aria-pressed={colorVisionMode === 'color-vision-friendly'}
      onClick={() => onChange({ colorVisionMode: colorVisionMode === 'standard'
        ? 'color-vision-friendly' : 'standard' })} type="button">
      Accessible colors
    </button>
  </div>;
}

function luminance(hex: string) {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function hasLowContrast(color: string, theme: GraphAppearanceThemeV1) {
  const background = theme === 'paper' ? '#f4f0e6' : theme === 'aurora' ? '#0a1722' : '#081416';
  const foreground = luminance(color);
  const backdrop = luminance(background);
  return (Math.max(foreground, backdrop) + 0.05) / (Math.min(foreground, backdrop) + 0.05) < 2.4;
}

export function GraphStylePopover({
  colorVisionMode,
  onClose,
  onUpdate,
  presentation,
  theme,
}: {
  colorVisionMode: 'standard' | 'color-vision-friendly';
  onClose: () => void;
  onUpdate: (presentation: GraphItemPresentationV2) => void;
  presentation: GraphItemPresentation;
  theme: GraphAppearanceThemeV1;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const value = normalizeGraphItemPresentation(presentation);
  const resolvedColor = resolveGraphPresentationColor(value, colorVisionMode);
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);
  const patch = (next: Partial<GraphItemPresentationV2>) => onUpdate({ ...value, ...next });
  return <div aria-label="Curve style" className="graph-style-popover" onKeyDown={(event) => {
    if (event.key === 'Escape') onClose();
  }} ref={panelRef} role="dialog" tabIndex={-1}>
    <div className="graph-style-heading"><strong>Curve style</strong>
      <button aria-label="Close curve style" onClick={onClose} type="button">Close</button></div>
    <div aria-label="Curve palette" className="graph-style-palette" role="group">
      {GRAPH_COLOR_TOKENS.map((token) => {
        const candidate: GraphItemPresentationV2 = { ...value, color: { kind: 'token', token } };
        const color = resolveGraphPresentationColor(candidate, colorVisionMode);
        return <button aria-label={`Use ${token.replace('graph-', '')}`} aria-pressed={
          value.color.kind === 'token' && value.color.token === token
        } className="graph-style-swatch" key={token} onClick={() => patch({
          color: { kind: 'token', token },
        })} style={{ '--graph-swatch': color } as CSSProperties} type="button" />;
      })}
    </div>
    <label className="graph-style-field"><span>Custom color</span>
      <input aria-label="Custom curve color" onChange={(event) => patch({
        color: { kind: 'custom', value: event.currentTarget.value },
      })} type="color" value={resolvedColor} /></label>
    {hasLowContrast(resolvedColor, theme) ? <p className="graph-style-warning" role="status">
      This color may be difficult to see on the current canvas.
    </p> : null}
    <div className="graph-style-grid">
      <label><span>Width</span><select aria-label="Curve width" onChange={(event) => patch({
        strokeWidth: event.currentTarget.value as GraphItemPresentationV2['strokeWidth'],
      })} value={value.strokeWidth}>
        <option value="thin">Thin</option><option value="normal">Normal</option><option value="strong">Strong</option>
      </select></label>
      <label><span>Line</span><select aria-label="Curve line style" onChange={(event) => patch({
        stroke: event.currentTarget.value as GraphItemPresentationV2['stroke'],
      })} value={value.stroke}>
        <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option>
      </select></label>
    </div>
    <label className="graph-style-range"><span>Curve opacity</span><output>{Math.round(value.strokeOpacity * 100)}%</output>
      <input aria-label="Curve opacity" max="1" min="0.15" onChange={(event) => patch({
        strokeOpacity: event.currentTarget.valueAsNumber,
      })} step="0.05" type="range" value={value.strokeOpacity} /></label>
    <label className="graph-style-range"><span>Region opacity</span><output>{Math.round(value.regionOpacity * 100)}%</output>
      <input aria-label="Region opacity" max="0.8" min="0" onChange={(event) => patch({
        regionOpacity: event.currentTarget.valueAsNumber,
      })} step="0.05" type="range" value={value.regionOpacity} /></label>
    <label className="graph-style-toggle"><span>Soft halo</span><input checked={value.halo === 'soft'}
      onChange={(event) => patch({ halo: event.currentTarget.checked ? 'soft' : 'none' })} type="checkbox" /></label>
    <label className="graph-style-toggle"><span>Semantic markers</span><input checked={value.markers === 'semantic'}
      onChange={(event) => patch({ markers: event.currentTarget.checked ? 'semantic' : 'none' })} type="checkbox" /></label>
    <label className="graph-style-field"><span>Labels</span><select aria-label="Curve labels" onChange={(event) => patch({
      label: event.currentTarget.value as GraphItemPresentationV2['label'],
    })} value={value.label}>
      <option value="auto">Auto</option><option value="always">Always</option><option value="never">Never</option>
    </select></label>
  </div>;
}

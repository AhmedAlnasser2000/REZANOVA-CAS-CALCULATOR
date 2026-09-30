import type { GraphItemPresentationV2 } from '../../lib/graphing';
import type { graphItemDisplayOptions } from './graph-item-routes';
import type { GraphAsymptoteMode } from './ptx/usePtxPointsOfInterest';

const MODES: Array<{ mode: GraphAsymptoteMode; label: string; title: string }> = [
  { mode: 'auto', label: 'Auto', title: 'Show asymptotes while this curve is selected' },
  { mode: 'always', label: 'Always', title: 'Always show this curve\'s asymptotes' },
  { mode: 'off', label: 'Off', title: 'Never show this curve\'s asymptotes' },
];

/**
 * The Display section of a row's details (the `>` expander): per-curve choices
 * kept out of the row itself so rows stay uncluttered.
 */
export function GraphItemDetails({ complexValues, onToggleComplexValues, onUpdatePresentation, options, presentation }: {
  complexValues: boolean;
  onToggleComplexValues?: () => void;
  onUpdatePresentation?: (presentation: GraphItemPresentationV2) => void;
  options: ReturnType<typeof graphItemDisplayOptions>;
  presentation: GraphItemPresentationV2;
}) {
  const mode = presentation.asymptotes ?? 'auto';
  return <div aria-label="Display options" className="graph-item-details" role="group">
    <span className="graph-item-details-heading">Display</span>
    {options.asymptotes && onUpdatePresentation ? <div className="graph-item-details-row">
      <span id="graph-asymptote-mode">Asymptotes</span>
      <div aria-labelledby="graph-asymptote-mode" className="graph-item-details-segmented" role="group">
        {MODES.map((entry) => <button aria-pressed={mode === entry.mode} key={entry.mode}
          onClick={() => onUpdatePresentation({ ...presentation, asymptotes: entry.mode })} title={entry.title} type="button">
          {entry.label}</button>)}
      </div>
    </div> : null}
    {options.complexValues && onToggleComplexValues ? <div className="graph-item-details-row">
      <span>Complex values</span>
      <button aria-label="Show complex values" aria-pressed={complexValues} className="graph-complex-values-toggle"
        onClick={onToggleComplexValues} title="Show complex values where this curve is not real: Re solid, Im dashed" type="button">
        ℂ {complexValues ? 'On' : 'Off'}</button>
    </div> : null}
  </div>;
}

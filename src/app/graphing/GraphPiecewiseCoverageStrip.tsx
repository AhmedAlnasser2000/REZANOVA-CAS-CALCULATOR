import type { CSSProperties } from 'react';
import type { GraphPiecewiseConditionEvidenceV1 } from '../../lib/graphing';
import { graphBoundaryText, graphCoverageSegments, graphIntervalText } from './graph-piecewise-coverage';

// A number line over the visible range of the piecewise variable: where each
// branch is drawn (in its colour), where nothing is drawn (hatched), and the
// boundaries with filled or open ends. Pressing a segment goes to its branch.

export function GraphPiecewiseCoverageStrip({ branchColors, evidence, hasOtherwise, onSelectBranch }: {
  branchColors: Record<string, string>;
  evidence: GraphPiecewiseConditionEvidenceV1;
  hasOtherwise: boolean;
  onSelectBranch: (branchKey: string) => void;
}) {
  const { minimum, maximum } = evidence.validatedInterval;
  const span = maximum - minimum;
  const at = (value: number) => `${Math.min(100, Math.max(0, ((value - minimum) / span) * 100))}%`;
  const segments = graphCoverageSegments(evidence, hasOtherwise);
  const symbol = evidence.independentSymbol === 'theta' ? 'θ' : evidence.independentSymbol;
  // Boundary labels, skipping any too close to the previous one to read.
  const labels: number[] = [];
  for (const value of [...new Set(evidence.boundaries.map((boundary) => boundary.value))].sort((a, b) => a - b)) {
    if (labels.length === 0 || (value - labels.at(-1)!) / span > 0.09) labels.push(value);
  }
  return <div aria-label={`Where each branch is drawn along ${symbol}`} className="graph-piecewise-coverage" data-testid="graph-piecewise-coverage" role="group">
    <div className="graph-piecewise-coverage-track">
      {segments.map((segment, index) => {
        const width = segment.maximum === segment.minimum ? '0px' : `calc(${at(segment.maximum)} - ${at(segment.minimum)})`;
        const description = segment.branchKey === null ? `Nothing drawn for ${graphIntervalText(evidence, segment)}`
          : `${segment.branchKey === 'otherwise' ? 'Otherwise' : `Branch ${(evidence.drawnIntervals ?? [])
            .findIndex((entry) => entry.branchId === segment.branchKey) + 1}`} for ${graphIntervalText(evidence, segment)}`;
        const style = { left: at(segment.minimum), width, '--graph-branch-color': segment.branchKey ? branchColors[segment.branchKey] : undefined } as CSSProperties;
        // A gap's ends belong to its neighbours, which draw them.
        const ends = <>
          {segment.minimumOpenEnded ? null : <span className={`graph-piecewise-coverage-end is-start${segment.minimumInclusive ? ' is-filled' : ''}`} />}
          {segment.maximumOpenEnded ? null : <span className={`graph-piecewise-coverage-end is-end${segment.maximumInclusive ? ' is-filled' : ''}`} />}
        </>;
        return segment.branchKey === null
          ? <span aria-label={description} className="graph-piecewise-coverage-segment is-gap" data-testid="graph-piecewise-coverage-gap"
            key={`gap-${index}`} role="img" style={style} title={description} />
          : <button aria-label={description} className={`graph-piecewise-coverage-segment${segment.maximum === segment.minimum ? ' is-point' : ''}`}
            data-branch-key={segment.branchKey} key={`${segment.branchKey}-${index}`} onClick={() => onSelectBranch(segment.branchKey!)}
            style={style} title={description} type="button">{ends}</button>;
      })}
    </div>
    <div aria-hidden="true" className="graph-piecewise-coverage-labels">
      {labels.map((value) => <span key={value} style={{ left: at(value) }}>{graphBoundaryText(evidence, value)}</span>)}
      <span className="graph-piecewise-coverage-symbol">{symbol}</span>
    </div>
  </div>;
}

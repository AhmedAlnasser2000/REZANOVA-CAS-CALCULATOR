import type { RefObject } from 'react';
import { SignedNumberDraftInput } from '../../../components/SignedNumberDraftInput';
import type {
  StatisticsRelationshipsState,
  StatisticsScreen,
} from '../../../types/calculator';

type RelationshipAnalysis = StatisticsRelationshipsState['analysis'];

type StatisticsRelationshipsPanelProps = {
  state: StatisticsRelationshipsState;
  firstXRef: RefObject<HTMLInputElement | null>;
  expression: string;
  pointsText: string;
  onOpenScreen: (screen: StatisticsScreen) => void;
  onUpdatePoint: (
    screen: RelationshipAnalysis,
    index: number,
    field: 'x' | 'y',
    value: string,
  ) => void;
  onRemovePoint: (screen: RelationshipAnalysis, index: number) => void;
  onAddPoint: (screen: RelationshipAnalysis) => void;
  onEditExpression: () => void;
  onCopyExpression: () => void;
};

export function StatisticsRelationshipsPanel({
  state,
  firstXRef,
  expression,
  pointsText,
  onOpenScreen,
  onUpdatePoint,
  onRemovePoint,
  onAddPoint,
  onEditExpression,
  onCopyExpression,
}: StatisticsRelationshipsPanelProps) {
  const completePointCount = state.points.filter(
    (point) => point.x.trim() && point.y.trim(),
  ).length;

  return (
    <div className="statistics-relationships-layout">
      <div className="editor-card statistics-relationships-form">
        <div className="card-title-row">
          <strong>Paired data</strong>
          <span className="equation-badge">{completePointCount} complete</span>
        </div>

        <div className="statistics-control-group">
          <span id="statistics-relationships-analysis-label">Analysis</span>
          <div
            className="statistics-segmented-control"
            role="radiogroup"
            aria-labelledby="statistics-relationships-analysis-label"
          >
            {(['regression', 'correlation'] as const).map((analysis) => (
              <button
                key={analysis}
                type="button"
                role="radio"
                aria-checked={state.analysis === analysis}
                className={state.analysis === analysis ? 'is-active' : ''}
                onClick={() => onOpenScreen(analysis)}
              >
                {analysis === 'regression' ? 'Regression' : 'Correlation'}
              </button>
            ))}
          </div>
        </div>

        <div className="statistics-table-labels" aria-hidden="true">
          <span>x</span>
          <span>y</span>
          <span>Action</span>
        </div>
        <div className="statistics-edit-table">
          {state.points.map((point, index) => (
            <div key={`statistics-relationship-point-${index}`} className="statistics-edit-row">
              <SignedNumberDraftInput
                ref={index === 0 ? firstXRef : undefined}
                ariaLabel={`Point ${index + 1} x value`}
                className="statistics-cell-input"
                value={point.x}
                onValueChange={(value) => onUpdatePoint(state.analysis, index, 'x', value)}
              />
              <SignedNumberDraftInput
                ariaLabel={`Point ${index + 1} y value`}
                className="statistics-cell-input"
                value={point.y}
                onValueChange={(value) => onUpdatePoint(state.analysis, index, 'y', value)}
              />
              <button type="button" onClick={() => onRemovePoint(state.analysis, index)}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="display-card-actions">
          <button type="button" onClick={() => onAddPoint(state.analysis)}>Add point</button>
          <button type="button" onClick={onEditExpression}>Edit expression</button>
        </div>
      </div>

      <div className="editor-card statistics-request-card">
        <div className="card-title-row">
          <strong>Generated request</strong>
          <span className="equation-subtitle">
            {state.analysis === 'regression' ? 'Line fit' : 'Linear association'}
          </span>
        </div>
        <code className="statistics-request-preview">{expression}</code>
        <div className="statistics-relationships-summary">
          <strong>Paired observations</strong>
          <p>{pointsText || 'Enter at least two complete points.'}</p>
        </div>
        <div className="display-card-actions">
          <button type="button" onClick={onCopyExpression}>Copy expression</button>
        </div>
      </div>
    </div>
  );
}

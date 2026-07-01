import { useState } from 'react';

import { MathStatic } from '../../components/MathStatic';
import { NotationText } from '../../components/NotationText';
import type { FormulaViewerArtifact } from '../runtime/formula-viewer-artifacts';
import type { SymbolicDisplayPrefs } from '../../lib/display/symbolic-display';
import {
  DEFAULT_FORMULA_VIEWER_MATH_SIZE,
  FormulaViewerReadabilityControls,
  type FormulaViewerMathSize,
} from './formula-viewer/FormulaViewerReadability';
import { FormulaViewerVirtualizedContent } from './formula-viewer/FormulaViewerVirtualizedContent';

type FormulaViewerPageProps = {
  artifact: FormulaViewerArtifact;
  onBackToSource?: () => void;
  onCopyResult: (latex: string) => void;
  sourceAvailable: boolean;
  symbolicDisplayPrefs: SymbolicDisplayPrefs;
};

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return count === 1 ? singular : pluralLabel;
}

function formulaViewerCountText(artifact: FormulaViewerArtifact) {
  if (artifact.countSummary?.text) {
    return artifact.countSummary.text;
  }

  if (artifact.groupCount > 0) {
    return [
      `${artifact.groupCount.toLocaleString()} ${plural(artifact.groupCount, 'branch family', 'branch families')}`,
      `${artifact.rowCount.toLocaleString()} guarded ${plural(artifact.rowCount, 'row')}`,
    ].join(' · ');
  }

  return `${artifact.rowCount.toLocaleString()} guarded ${plural(artifact.rowCount, 'row')}`;
}

function formulaViewerMetaText(artifact: FormulaViewerArtifact) {
  const resultShapeText = [
    artifact.trustSummary,
    formulaViewerCountText(artifact),
  ].filter(Boolean).join(' · ');
  return [
    resultShapeText,
    `${artifact.latexLength.toLocaleString()} characters`,
  ].filter(Boolean).join(', ');
}

export function FormulaViewerPage({
  artifact,
  onBackToSource,
  onCopyResult,
  sourceAvailable,
  symbolicDisplayPrefs,
}: FormulaViewerPageProps) {
  const [mathSize, setMathSize] = useState<FormulaViewerMathSize>(
    DEFAULT_FORMULA_VIEWER_MATH_SIZE,
  );
  const metaText = formulaViewerMetaText(artifact);
  const pageClassName = `formula-viewer-page formula-viewer-page--math-${mathSize}`;

  return (
    <main className={pageClassName} data-testid="formula-viewer-page">
      <header className="formula-viewer-header">
        <div className="formula-viewer-title-group">
          <p className="formula-viewer-kicker">Formula Viewer</p>
          <h1>{artifact.resultTitle}</h1>
          <NotationText
            className="formula-viewer-meta"
            text={`${metaText}.`}
          />
          {artifact.sourceWorkspaceTitle ? (
            <NotationText
              className="formula-viewer-meta"
              text={`Source: ${artifact.sourceWorkspaceTitle}`}
            />
          ) : null}
        </div>
        <div className="formula-viewer-actions">
          <button
            type="button"
            className="workspace-action-button"
            onClick={() => onCopyResult(artifact.copyLatex)}
          >
            Copy Result
          </button>
          {sourceAvailable && onBackToSource ? (
            <button
              type="button"
              className="workspace-action-button"
              onClick={onBackToSource}
            >
              Back to source
            </button>
          ) : null}
        </div>
      </header>
      <FormulaViewerReadabilityControls
        mathSize={mathSize}
        onMathSizeChange={setMathSize}
      />
      <section className="formula-viewer-source" aria-label="Formula source context">
        {artifact.sourceExpressionLatex ? (
          <div className="formula-viewer-source-row">
            <span className="formula-viewer-source-label">Input</span>
            <MathStatic
              className="preview-math formula-viewer-source-math"
              latex={artifact.sourceExpressionLatex}
              normalizeDisplay={false}
            />
          </div>
        ) : null}
        {artifact.resolvedInputLatex ? (
          <div className="formula-viewer-source-row">
            <span className="formula-viewer-source-label">Resolved</span>
            <MathStatic
              className="preview-math formula-viewer-source-math"
              latex={artifact.resolvedInputLatex}
              normalizeDisplay={false}
            />
          </div>
        ) : null}
      </section>
      <section aria-label="Formula viewer content">
        <FormulaViewerVirtualizedContent
          key={artifact.resultSignature}
          artifact={artifact}
          symbolicDisplayPrefs={symbolicDisplayPrefs}
        />
      </section>
    </main>
  );
}

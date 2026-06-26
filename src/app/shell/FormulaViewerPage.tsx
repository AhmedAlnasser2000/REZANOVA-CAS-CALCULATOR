import { useMemo } from 'react';
import { MathStatic } from '../../components/MathStatic';
import { NotationText } from '../../components/NotationText';
import type { FormulaViewerArtifact } from '../runtime/formula-viewer-artifacts';
import type { SymbolicDisplayPrefs } from '../../lib/display/symbolic-display';
import { ScheduledOutcomeBlocks } from './display-panel/DisplayResultBlocks';

type FormulaViewerPageProps = {
  artifact: FormulaViewerArtifact;
  onBackToSource?: () => void;
  onCopyResult: (latex: string) => void;
  sourceAvailable: boolean;
  symbolicDisplayPrefs: SymbolicDisplayPrefs;
};

export function FormulaViewerPage({
  artifact,
  onBackToSource,
  onCopyResult,
  sourceAvailable,
  symbolicDisplayPrefs,
}: FormulaViewerPageProps) {
  const viewerBlocks = useMemo(() => [
    artifact.primaryBlock,
    ...artifact.globalFactBlocks,
    ...artifact.detailBlocks,
  ], [artifact]);
  const visibleBlockIds = useMemo(
    () => new Set(viewerBlocks.map((block) => block.id)),
    [viewerBlocks],
  );
  const branchText = artifact.groupCount > 1
    ? `${artifact.groupCount.toLocaleString()} generated branches`
    : `${artifact.groupCount.toLocaleString()} generated branch`;

  return (
    <main className="formula-viewer-page" data-testid="formula-viewer-page">
      <header className="formula-viewer-header">
        <div className="formula-viewer-title-group">
          <p className="formula-viewer-kicker">Formula Viewer</p>
          <h1>{artifact.resultTitle}</h1>
          <NotationText
            className="formula-viewer-meta"
            text={`${artifact.rowCount.toLocaleString()} guarded case rows, ${branchText}, ${artifact.latexLength.toLocaleString()} characters.`}
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
      <section className="formula-viewer-scroll" data-testid="formula-viewer-scroll">
        <ScheduledOutcomeBlocks
          scheduledDisplayBlocks={viewerBlocks}
          symbolicDisplayPrefs={symbolicDisplayPrefs}
          visibleDisplayBlockIds={visibleBlockIds}
        />
      </section>
    </main>
  );
}

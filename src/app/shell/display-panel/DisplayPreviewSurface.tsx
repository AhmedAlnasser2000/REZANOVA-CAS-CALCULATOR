/* eslint-disable @typescript-eslint/no-explicit-any */
import { MathStatic } from '../../../components/MathStatic';

type DisplayPreviewSurfaceProps = Record<string, any>;

export function DisplayPreviewSurface({
  activeExpressionLatex,
  calculusRouteMeta,
  copyText,
  currentMode,
  deferredDisplayLatex,
  editActiveExpression,
  equationRouteMeta,
  geometryRouteMeta,
  guideModeRef,
  guideRoute,
  guideRouteMeta,
  guideSearchInputRef,
  guideSearchQuery,
  isCalculusMenuOpen,
  isEquationMenuOpen,
  isGeometryMenuOpen,
  isLauncherOpen,
  isStatisticsMenuOpen,
  isTrigMenuOpen,
  labsRuntime,
  launcherState,
  pasteIntoEditor,
  selectedCalculusMenuEntry,
  selectedEquationMenuEntry,
  selectedGeometryMenuEntry,
  selectedGuideExample,
  selectedGuideListEntry,
  selectedLauncherApp,
  selectedLauncherCategory,
  selectedStatisticsMenuEntry,
  selectedTrigMenuEntry,
  setGuideQuery,
  statisticsRouteMeta,
  suppressExpressionPreview = false,
  trigRouteMeta,
}: DisplayPreviewSurfaceProps) {
  const isLabsMode = !isLauncherOpen && currentMode === 'labs';
  const hasExpressionPreview =
    !suppressExpressionPreview
    && typeof deferredDisplayLatex === 'string'
    && deferredDisplayLatex.trim().length > 0;

  return (
    <div className="display-preview">
      {isLauncherOpen ? (
        <div className="launcher-preview-copy">
          {launcherState.level === 'root'
            ? selectedLauncherCategory?.description ?? ''
            : selectedLauncherApp?.description ?? ''}
        </div>
      ) : isEquationMenuOpen ? (
        <div className="equation-preview-copy">
          <strong>{equationRouteMeta?.shortLabel ?? selectedEquationMenuEntry?.label ?? ''}</strong>
          <span>{selectedEquationMenuEntry?.description ?? ''}</span>
          <small>{equationRouteMeta?.helpText}</small>
        </div>
      ) : isCalculusMenuOpen ? (
        <div className="equation-preview-copy">
          <strong>{calculusRouteMeta?.label ?? selectedCalculusMenuEntry?.label ?? ''}</strong>
          <span>{selectedCalculusMenuEntry?.description ?? calculusRouteMeta?.description ?? ''}</span>
          <small>{calculusRouteMeta?.helpText}</small>
        </div>
      ) : isTrigMenuOpen ? (
        <div className="equation-preview-copy">
          <strong>{trigRouteMeta?.label ?? selectedTrigMenuEntry?.label ?? ''}</strong>
          <span>{selectedTrigMenuEntry?.description ?? trigRouteMeta?.description ?? ''}</span>
          <small>{trigRouteMeta?.helpText}</small>
        </div>
      ) : isStatisticsMenuOpen ? (
        <div className="equation-preview-copy">
          <strong>{statisticsRouteMeta?.label ?? selectedStatisticsMenuEntry?.label ?? ''}</strong>
          <span>{selectedStatisticsMenuEntry?.description ?? statisticsRouteMeta?.description ?? ''}</span>
          <small>{statisticsRouteMeta?.helpText}</small>
        </div>
      ) : isGeometryMenuOpen ? (
        <div className="equation-preview-copy">
          <strong>{geometryRouteMeta?.label ?? selectedGeometryMenuEntry?.label ?? ''}</strong>
          <span>{selectedGeometryMenuEntry?.description ?? geometryRouteMeta?.description ?? ''}</span>
          <small>{geometryRouteMeta?.helpText}</small>
        </div>
      ) : currentMode === 'guide' && guideRouteMeta ? (
        <div className="guide-preview-copy">
          {(guideRoute.screen === 'search' || guideRoute.screen === 'symbolLookup') ? (
            <label className="guide-search-row">
              <span>Search</span>
              <input
                ref={guideSearchInputRef}
                className="guide-search-input"
                value={guideSearchQuery}
                onChange={(event) => setGuideQuery(event.target.value)}
                placeholder={guideRoute.screen === 'symbolLookup' ? 'sum, sigma, integral...' : 'Search topics, symbols, modes...'}
              />
            </label>
          ) : null}
          {guideRoute.screen === 'article' ? (
            <>
              <strong>{selectedGuideExample?.title ?? 'Worked examples'}</strong>
              <span>{selectedGuideExample?.explanation ?? 'Read the article and use Open in Tool to load an example.'}</span>
            </>
          ) : guideRoute.screen === 'modeGuide' && guideModeRef ? (
            <>
              <strong>{guideModeRef.title}</strong>
              <span>{guideModeRef.summary}</span>
            </>
          ) : (
            <>
              <strong>{selectedGuideListEntry?.title ?? guideRouteMeta.title}</strong>
              <span>{selectedGuideListEntry?.description ?? guideRouteMeta.description}</span>
            </>
          )}
        </div>
      ) : isLabsMode ? (
        <div className="guide-preview-copy labs-display-preview-copy">
          <strong>{labsRuntime?.selectedExperiment?.title ?? 'Labs'}</strong>
          <span>
            {labsRuntime?.runnerUiEnabled && labsRuntime.selectedRunner
              ? labsRuntime.selectedRunner.description
              : 'Inspect the committed Labs catalog. Runner execution is dev-only and separately gated.'}
          </span>
          <small>
            {labsRuntime?.runnerUiEnabled
              ? `Runner bridge: ${labsRuntime.runnerLoadStatus}`
              : 'Runner bridge disabled'}
          </small>
        </div>
      ) : hasExpressionPreview ? (
        <div className="display-card-content" data-testid="display-expression-preview-card">
          <div className="display-card-actions">
            <button onClick={() => void copyText(activeExpressionLatex(), 'Expression copied')}>
              Copy Expr
            </button>
            {currentMode === 'geometry' || currentMode === 'trigonometry' ? (
              <>
                <button onClick={editActiveExpression}>
                  Focus Editor
                </button>
                <button onClick={() => void pasteIntoEditor()}>
                  Paste
                </button>
              </>
            ) : (
              <>
                <button onClick={editActiveExpression}>
                  Edit Expr
                </button>
                <button onClick={() => void pasteIntoEditor()}>
                  Paste
                </button>
              </>
            )}
          </div>
          <MathStatic
            className="preview-math"
            latex={deferredDisplayLatex}
            emptyLabel="Textbook preview"
            deferRender
          />
        </div>
      ) : null}
    </div>
  );
}

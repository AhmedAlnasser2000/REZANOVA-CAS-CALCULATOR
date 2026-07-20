export function insertStarterLimitPiecewiseTemplate(
  setEditorLatex: (latex: string) => void,
  setRuntimeStatus: (status: string) => void,
) {
  void import('../../lib/calculus/limit-piecewise-row-editor')
    .then(({ buildStarterLimitPiecewiseRequest }) => {
      setEditorLatex(buildStarterLimitPiecewiseRequest());
    })
    .catch(() => {
      setRuntimeStatus('Could not load the piecewise template');
    });
}

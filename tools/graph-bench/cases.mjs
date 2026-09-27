// Fixed Graph benchmark cases shared by the Calcwiz and Equation.io runners.
// `calcwiz` is MathLive LaTeX entered into the last expression row;
// `equationIo` is Equation.io row syntax (complex functions use `w`).
// Correctness (false or missing geometry) is judged from the saved
// screenshots against a CPU reference, never from these timings.

export const GRAPH_BENCH_CASES = [
  {
    id: 'polynomial',
    gesture: 'zoom',
    pane: 'real',
    calcwiz: 'y=x^3-2x',
    equationIo: 'y = x^3 - 2x',
  },
  {
    id: 'rational',
    gesture: 'zoom',
    pane: 'real',
    calcwiz: 'y=\\frac{1}{x-1}+\\frac{x}{x^2+1}',
    equationIo: 'y = 1/(x-1) + x/(x^2+1)',
  },
  {
    id: 'log-root',
    gesture: 'zoom',
    pane: 'real',
    calcwiz: 'y=\\ln(x)+\\sqrt{4-x^2}',
    equationIo: 'y = ln(x) + sqrt(4 - x^2)',
  },
  {
    id: 'implicit-circle',
    gesture: 'zoom',
    pane: 'real',
    calcwiz: 'x^2+y^2=9',
    equationIo: 'x^2 + y^2 = 9',
  },
  {
    id: 'implicit-hard-power',
    gesture: 'zoom',
    pane: 'real',
    calcwiz: 'y^{\\sin(x)+x}=y',
    equationIo: 'y^(sin(x)+x) = y',
  },
  {
    id: 'implicit-hard-mixed-power',
    gesture: 'zoom',
    pane: 'real',
    calcwiz: 'xy^{\\sin(x)-\\cos(x)}=y^{3x}',
    equationIo: 'x y^(sin(x)-cos(x)) = y^(3x)',
  },
  {
    id: 'implicit-hard-nested-log',
    gesture: 'zoom',
    pane: 'real',
    calcwiz: '\\sin(\\ln(\\cos(y)+x))=0',
    equationIo: 'sin(ln(cos(y)+x)) = 0',
  },
  {
    id: 'inequality',
    gesture: 'zoom',
    pane: 'real',
    calcwiz: 'y<\\cos(x)+\\frac{x}{3}',
    equationIo: 'y < cos(x) + x/3',
  },
  {
    id: 'complex-quadratic',
    gesture: 'zoom',
    pane: 'complex',
    calcwiz: 'f(z)=z^2+1',
    equationIo: 'domain(w^2+1)',
  },
  {
    id: 'complex-log-pole',
    gesture: 'zoom',
    pane: 'complex',
    calcwiz: 'f(z)=\\log(z)+\\frac{1}{z}',
    equationIo: 'domain(ln(w)+1/w)',
  },
  {
    id: 'surface-paraboloid',
    gesture: 'orbit',
    pane: 'real-3d',
    calcwiz: 'z=x^2+y^2',
    equationIo: 'z = x^2 + y^2',
  },
];

export function selectGraphBenchCases(ids) {
  if (!ids || ids.length === 0) return GRAPH_BENCH_CASES;
  const unknown = ids.filter((id) => !GRAPH_BENCH_CASES.some((entry) => entry.id === id));
  if (unknown.length > 0) throw new Error(`Unknown graph bench case(s): ${unknown.join(', ')}`);
  return GRAPH_BENCH_CASES.filter((entry) => ids.includes(entry.id));
}

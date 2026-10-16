// Generates the website's pre-computed examples by running the real Equation and Integration engines
// (run: node node_modules/vite-node/dist/cli.mjs --root . tools/website-examples.ts).
// Development tool only: the website holds no math code, and this is deliberately not a CI step, so
// engine changes never break the website build. Rerun it by hand after the engines change.
// Every example must come out verified; anything else fails the run, so the site never shows an
// answer the app would not give.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { executeEquation } from '../src/lib/symbolic-engine/equation/service/service';
import { autoTargets, parseRow } from '../src/lib/new-equation/parse';
import { DEFAULT_EQUATION_LIMITS } from '../src/lib/new-equation/types';
import { verificationSummary } from '../src/lib/new-equation/verification';
import { executeIntegration } from '../src/lib/calculus/new-integration/service';
import { DEFAULT_INTEGRATION_LIMITS } from '../src/lib/calculus/new-integration/types';
import { readIntegrationPresentation } from '../src/lib/result-contract/integration-presentation';
import type { CanonicalEquationDocument } from '../src/types/calculator/canonical-result-current';

type Text = { en: string; ar: string };
interface EquationExample { id: string; rows: string[]; domain?: 'real' | 'complex'; title: Text }
interface IntegrationExample { id: string; integrand: string; title: Text }

const EQUATIONS: EquationExample[] = [
  { id: 'quintic', rows: ['x^5-x-1=0'], title: { en: 'A quintic with no formula', ar: 'معادلة خماسية بلا صيغة' } },
  { id: 'forall', rows: ['\\forall x:x^2+ax+1>0'], title: { en: 'For every x', ar: 'لكل قيمة من x' } },
  { id: 'disc', rows: ['x^2+y^2<1', 'y>x'], title: { en: 'A region in the plane', ar: 'منطقة في المستوى' } },
  { id: 'cases', rows: ['ax^2+x+1=0'], title: { en: 'Cases over a parameter', ar: 'حالات حسب الوسيط' } },
  { id: 'sine', rows: ['\\sin x=\\frac{1}{2}'], title: { en: 'Every solution, as families', ar: 'كل الحلول كعائلات' } },
  { id: 'circle-line', rows: ['x^2+y^2=1', 'y=x'], title: { en: 'A system, exactly', ar: 'نظام بدقة تامة' } },
  { id: 'lambert', rows: ['e^x=x+2'], title: { en: 'Beyond elementary functions', ar: 'ما وراء الدوال الأولية' } },
  { id: 'radicals', rows: ['\\sqrt{x+\\sqrt{x+\\sqrt{x+\\sqrt{x}}}}=1'], title: { en: 'Nested radicals', ar: 'جذور متداخلة' } },
];
const INTEGRALS: IntegrationExample[] = [
  { id: 'quartic', integrand: '\\frac{1}{x^4+1}', title: { en: 'A rational integral', ar: 'تكامل كسري' } },
  { id: 'quintic-root', integrand: '\\frac{1}{x^5-x-1}', title: { en: 'Over roots with no formula', ar: 'على جذور بلا صيغة' } },
  { id: 'gauss-derivative', integrand: '2xe^{x^2}', title: { en: 'An exponential integral', ar: 'تكامل أسي' } },
  { id: 'logistic', integrand: '\\frac{e^x}{1+e^{2x}}', title: { en: 'Rational in an exponential', ar: 'كسري في دالة أسية' } },
  { id: 'gaussian', integrand: 'e^{x^2}', title: { en: 'Proved: no elementary answer', ar: 'مُثبت: لا جواب أوليًا' } },
  { id: 'exp-over-x', integrand: '\\frac{e^x}{x}', title: { en: 'Proved: no elementary answer', ar: 'مُثبت: لا جواب أوليًا' } },
];

function fail(message: string): never {
  process.stderr.write(`website-examples: ${message}\n`);
  process.exit(1);
}
const round = (ms: number) => Math.max(1, Math.round(ms));

const equation = EQUATIONS.map((example) => {
  const parsed = example.rows.map(parseRow);
  const response = executeEquation({
    rows: example.rows, targets: autoTargets(parsed), domain: example.domain ?? 'real',
    limits: { ...DEFAULT_EQUATION_LIMITS }, digits: 6,
  });
  if (response.document.outcomeKind === 'error') fail(`${example.id}: ${response.document.title}`);
  const summary = verificationSummary(response.document as CanonicalEquationDocument);
  const exact = response.presentations?.exact, both = response.presentations?.both;
  if (!summary || !exact) fail(`${example.id}: not verified`);
  return {
    id: example.id, title: example.title, rows: example.rows, domain: example.domain ?? 'real',
    answer: exact.copyLatex, answerWithDigits: both?.copyLatex ?? exact.copyLatex, plainText: exact.plainText,
    verification: summary, elapsedMs: round(response.elapsedMs),
  };
});

const integration = INTEGRALS.map((example) => {
  const source = `\\int ${example.integrand}\\,dx`;
  const response = executeIntegration({ request: { source, limits: { ...DEFAULT_INTEGRATION_LIMITS } } });
  if (response.document.outcomeKind !== 'success') fail(`${example.id}: ${response.document.title}`);
  const presentation = readIntegrationPresentation(response.document);
  if (!presentation) fail(`${example.id}: no presentation`);
  return {
    id: example.id, title: example.title, source, answer: presentation.compact,
    definition: presentation.generatorDefinition ?? presentation.fallbackDefinition,
    terms: presentation.terms, negative: presentation.negative ?? false, explanation: presentation.explanation,
    headline: response.document.title, checks: response.checks, elapsedMs: round(response.elapsedMs),
  };
});

const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
const out = resolve('website/src/data/examples.json');
writeFileSync(out, `${JSON.stringify({ generatedFrom: commit, equation, integration }, null, 2)}\n`);
process.stdout.write(`website-examples: ${equation.length} Equation and ${integration.length} Integration examples written to ${out} (from ${commit})\n`);

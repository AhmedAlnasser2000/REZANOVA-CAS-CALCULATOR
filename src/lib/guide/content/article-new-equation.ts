import type { GuideArticleDraft } from './builders';

/** EQUATION-ADOPTION1: the New Equation workspace (rows, unknowns, assumptions, styles, keys); EQUATION-SEMIALGEBRAIC1: ∧ ∨ ¬ ∀ ∃, regions. */
export const NEW_EQUATION_ARTICLE: GuideArticleDraft = {
  id: 'algebra-new-equation',
  domainId: 'algebra',
  title: 'New Equation',
  summary: 'Solve equations, inequalities and systems exactly, one relation per row, with every answer verified.',
  whatItIs: [
    'New Equation is a separate workspace (Menu → Core → New Equation). It solves equations, inequalities, ≠ conditions and systems exactly, and checks every answer before showing it.',
    'Each row holds one relation, or relations joined with ∧ (and), ∨ (or) and ¬ (not). All rows hold together: a row with ≠ removes points, an inequality keeps an interval, and several equations form a system.',
    'Inequalities in several unknowns give a region, written like Mathematica\'s Reduce: ranges of the first unknown, then of the next as functions of the earlier ones, for example −1 < x < 1 and −√(1 − x²) < y < √(1 − x²).',
  ],
  whatItMeans: [
    'Solve for: the unknowns are picked automatically (x, then y, z, t, then other letters), one per equation row; rows without any equation (only inequalities, ∧ ∨ ¬ or quantifiers) solve for every letter. Change them with the chips; every other letter is a parameter, and the answer is split into cases over the parameters.',
    'Symbols (Logic keyboard page ∧∨¬∀; hover a symbol in a row to see what it means): ∧ and — both sides hold; ∨ or — at least one side holds; ¬ not — put it before a relation in parentheses, ¬(x² ≤ 1); ∀ for all — ∀x: x² + ax + 1 > 0 must hold for every real x; ∃ there exists — ∃y: x² + y² < 1 must hold for some real y. A quantified letter belongs to its row only and is never an unknown.',
    'A row whose every letter is quantified, such as ∀x: x² + 1 > 0, is a statement: the answer is True or False.',
    'Assumptions: a row that mentions only parameters, such as a > 0 beside x² = a, is an assumption. Cases where it fails are left out and the answer starts with "Assuming a > 0". Without an assumption row, every case is solved.',
    'e and i are the constants e and i. Decimals you type are exact numbers: 0.5 means 1/2.',
  ],
  howToUse: [
    'Type one relation per row. Press Enter to solve. Press Shift+Enter to add a new row below the current one; "+ Add row" does the same.',
    'Choose Real or Complex. Inequalities, ∀ and ∃ need Real; with Complex selected the page marks them and offers Switch to Real.',
    'Type a quantifier as ∀x: … or ∃x: … (from the Logic keyboard page, or \\forall and \\exists); several nest, as in ∀x, ∃y: y² > x.',
    'Choose Exact, Decimal or Both for the answer. Decimals are certified to the digits shown; roots without a closed form show a decimal and their definition.',
    'After an edit the previous answer stays, greyed, until you solve again. Stop ends a long run at once; Advanced limits sets how much work and memory a run may use.',
  ],
  concepts: [
    'Every answer is verified exactly before it is shown; open "Verified exactly" for what was checked.',
    'A problem that cannot be solved yet says so plainly; nothing partial is shown.',
    'Conditions used lists where the expressions are defined (x > 0 for ln x); the engine applies them automatically.',
    'Regions, quantifiers and several parameters are decided by cylindrical algebraic decomposition, for real polynomial rows; the answer is checked at a sample of every cell and against a second decomposition in another variable order.',
  ],
  whereToFindIt: ['Menu → Core → New Equation', 'Keys: Enter solves, Shift+Enter adds a row'],
  bestModes: ['equation'],
  symbols: [],
  examples: [],
  pitfalls: [
    'Enter solves; it does not start a new line. Use Shift+Enter for a new row.',
    'A row that mentions only letters you are not solving for is an assumption, not an equation.',
    'Drafts are kept per tab on this device; answers are recomputed, never stored.',
    '¬x < 1 is read as (¬x) < 1 and is refused: write ¬(x < 1).',
    'Problems in four or more unknowns can be very large for cylindrical decomposition and may stop at the work limit.',
  ],
  exactVsNumeric: [
    'Answers are exact. Decimal and Both add certified decimals; they never replace the exact answer that was verified.',
  ],
  relatedArticleIds: ['algebra-equations'],
};

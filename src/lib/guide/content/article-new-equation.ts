import type { GuideArticleDraft } from './builders';

/** EQUATION-ADOPTION1: the New Equation workspace (rows, unknowns, assumptions, styles, keys). */
export const NEW_EQUATION_ARTICLE: GuideArticleDraft = {
  id: 'algebra-new-equation',
  domainId: 'algebra',
  title: 'New Equation',
  summary: 'Solve equations, inequalities and systems exactly, one relation per row, with every answer verified.',
  whatItIs: [
    'New Equation is a separate workspace (Menu → Core → New Equation). It solves equations, inequalities, ≠ conditions and systems exactly, and checks every answer before showing it.',
    'Each row holds one relation. All rows hold together: a row with ≠ removes points, an inequality keeps an interval, and several equations form a system.',
  ],
  whatItMeans: [
    'Solve for: the unknowns are picked automatically (x, then y, z, t, then other letters), one per equation row. Change them with the chips; every other letter is a parameter.',
    'Assumptions: a row that mentions only parameters, such as a > 0 beside x² = a, is an assumption. Cases where it fails are left out and the answer starts with "Assuming a > 0". Without an assumption row, every case is solved.',
    'e and i are the constants e and i. Decimals you type are exact numbers: 0.5 means 1/2.',
  ],
  howToUse: [
    'Type one relation per row. Press Enter to solve. Press Shift+Enter to add a new row below the current one; "+ Add row" does the same.',
    'Choose Real or Complex. Inequalities need Real; with Complex selected the page marks them and offers Switch to Real.',
    'Choose Exact, Decimal or Both for the answer. Decimals are certified to the digits shown; roots without a closed form show a decimal and their definition.',
    'After an edit the previous answer stays, greyed, until you solve again. Stop ends a long run at once; Advanced limits sets how much work and memory a run may use.',
  ],
  concepts: [
    'Every answer is verified exactly before it is shown; open "Verified exactly" for what was checked.',
    'A problem that cannot be solved yet says so plainly; nothing partial is shown.',
    'Conditions used lists where the expressions are defined (x > 0 for ln x); the engine applies them automatically.',
  ],
  whereToFindIt: ['Menu → Core → New Equation', 'Keys: Enter solves, Shift+Enter adds a row'],
  bestModes: ['equation'],
  symbols: [],
  examples: [],
  pitfalls: [
    'Enter solves; it does not start a new line. Use Shift+Enter for a new row.',
    'A row that mentions only letters you are not solving for is an assumption, not an equation.',
    'Drafts are kept per tab on this device; answers are recomputed, never stored.',
  ],
  exactVsNumeric: [
    'Answers are exact. Decimal and Both add certified decimals; they never replace the exact answer that was verified.',
  ],
  relatedArticleIds: ['algebra-equations'],
};

import type { LessonSpec } from '../../types/calculator';

export const KEYBOARD_LESSONS: LessonSpec[] = [
  {
    id: 'milestone-00-keyboard-foundation',
    milestone: 'Keyboard Foundation',
    title: 'Using the Curated Calcwiz Keyboard',
    concepts: [
      'Switch between curated pages from the keyboard toolbar instead of using the generic MathLive tabs.',
      'Use Core for digits, operators, fraction, square root, power, π, e, and Ans.',
      'Use Letters and Greek for symbolic variable entry only.',
      'Long-press variant keys such as ε, θ, ρ, φ, and Σ to access alternate glyphs without clutter.',
    ],
    examples: [
      {
        title: 'Build a fraction',
        steps: ['Open Core.', 'Tap a/b.', 'Fill numerator and denominator.', 'Press EXE.'],
        expected: 'A stacked textbook fraction is inserted and evaluated.',
      },
      {
        title: 'Enter a symbolic variable',
        steps: ['Open Letters.', 'Tap x or y.', 'Return to Core for operators and constants.'],
        expected: 'The editor keeps the variable as symbolic input.',
      },
      {
        title: 'Use a Greek variable',
        steps: ['Open Greek.', 'Tap α or β.', 'Long-press Σ if you need σ or ς instead.'],
        expected: 'The chosen Greek letter inserts without exposing the summation operator.',
      },
    ],
    pitfalls: [
      'Σ on the Greek page is a letter, not the discrete summation operator.',
      'Use the calculator keypad or soft keys for actions like Simplify and Solve.',
      'Only visible pages are active; future domains stay hidden until later milestones.',
    ],
  },
  {
    id: 'milestone-01-algebra-core',
    milestone: 'Algebra Core',
    title: 'Algebra Core for Exact CAS Work',
    concepts: [
      'Use Algebra for nth root, subscript, absolute value, grouped powers, and reciprocal powers.',
      'Use Relations for =, ≠, <, >, ≤, and ≥.',
      'Use F1 to Simplify or Solve, F2 to Factor or open Equation menus, and F3/F4 for Expand/Numeric.',
      'Exact textbook output stays primary; decimal approximations appear as the second line when available.',
    ],
    examples: [
      {
        title: 'Simplify an algebraic expression',
        steps: ['Enter (x+1)^2 from Core and Algebra.', 'Press F1 in Calculate.'],
        expected: 'Calcwiz simplifies or normalizes the expression in textbook notation.',
      },
      {
        title: 'Factor a quadratic',
        steps: ['Enter x^2-5x+6 in Calculate.', 'Press F2.'],
        expected: 'The result factors to (x-2)(x-3) when supported.',
      },
      {
        title: 'Solve an equation',
        steps: ['Enter x^2-5x+6=0 in Equation > Symbolic.', 'Press EXE or F1.'],
        expected: 'You get exact roots first and an approximation line if available.',
      },
      {
        title: 'Use absolute value',
        steps: ['Open Algebra.', 'Insert |x|.', 'Fill the placeholder.', 'Evaluate or simplify.'],
        expected: 'Absolute value stays structured instead of becoming raw text.',
      },
      {
        title: 'Use grouped powers',
        steps: ['Insert ( )ⁿ from Algebra.', 'Fill the base expression and exponent.', 'Evaluate or expand.'],
        expected: 'The power applies to the whole grouped expression.',
      },
    ],
    pitfalls: [
      'Use Equation mode for = solving; Calculate still redirects equations instead of solving them directly.',
      'Relations like ≠, <, >, ≤, and ≥ are available for notation, but inequality solving is not part of this milestone.',
      'x^2 and (x)^2 are not always the same as (x+1)^2; grouped powers matter.',
      'Exact output is preferred; use Numeric or the approximation line when you need decimals.',
    ],
  },
  {
    id: 'milestone-02-discrete-core',
    milestone: 'Discrete Core',
    title: 'Discrete Operators: Sum, Product, Factorial, nCr, and nPr',
    concepts: [
      'Use Discrete for finite summation, finite product, and factorial.',
      'Use Combinatorics for combinations and permutations.',
      'Σ is still a Greek letter on the Greek page, while ∑ is the discrete summation operator on the Discrete page.',
      'Discrete Core in this milestone is exact and integer-focused; invalid domains return controlled messages.',
    ],
    examples: [
      {
        title: 'Finite sum',
        steps: ['Open Discrete.', 'Insert ∑.', 'Fill the index, lower bound, upper bound, and body.', 'Press EXE.'],
        expected: 'A bounded finite sum evaluates to an exact integer when valid.',
      },
      {
        title: 'Finite product',
        steps: ['Open Discrete.', 'Insert ∏.', 'Fill the placeholders.', 'Press EXE.'],
        expected: 'A bounded finite product evaluates exactly when valid.',
      },
      {
        title: 'Factorial',
        steps: ['Enter a non-negative integer.', 'Tap !.', 'Press EXE.'],
        expected: 'The factorial evaluates to an exact integer.',
      },
      {
        title: 'Combination',
        steps: ['Open Combinatorics.', 'Insert nCr.', 'Fill n and r.', 'Press EXE.'],
        expected: 'The combination evaluates exactly.',
      },
      {
        title: 'Permutation',
        steps: ['Open Combinatorics.', 'Insert nPr.', 'Fill n and r.', 'Press EXE.'],
        expected: 'The permutation evaluates exactly.',
      },
    ],
    pitfalls: [
      '∑ is not the same as Σ. Use Greek for Σ and Discrete for ∑.',
      'Factorial, nCr, and nPr are restricted to non-negative integers in this milestone.',
      'For nCr and nPr, the second argument must be less than or equal to the first.',
      'This milestone is finite and exact; it is not a general symbolic discrete-math solver.',
    ],
  },
  {
    id: 'milestone-03-calculus-core',
    milestone: 'Calculus Core',
    title: 'Calculus Core: Derivatives, Integrals, Limits, and Functions',
    concepts: [
      'Use Calculus for derivatives, derivative-at-point, indefinite integrals, definite integrals, and limits.',
      'Use Functions for sin, cos, tan, log, and ln when building calculus expressions.',
      'Exact symbolic output is still preferred first, but definite integrals, limits, and derivative-at-point may fall back to numeric approximations.',
      'Visible calculus notation is restricted to the cases this milestone can evaluate cleanly or fail with a controlled message.',
    ],
    examples: [
      {
        title: 'Differentiate a polynomial',
        steps: ['Open Calculus.', 'Insert d/dx.', 'Enter x^3+2x.', 'Press EXE.'],
        expected: 'The derivative evaluates symbolically to 3x^2+2.',
      },
      {
        title: 'Derivative at a point',
        steps: ['Insert d/dx|.', 'Enter x^2.', 'Set x=3.', 'Press EXE.'],
        expected: 'The derivative at the selected point evaluates to 6.',
      },
      {
        title: 'Indefinite integral',
        steps: ['Insert ∫.', 'Enter x^2.', 'Press EXE.'],
        expected: 'The antiderivative returns symbolically as x^3/3 when supported.',
      },
      {
        title: 'Definite integral',
        steps: ['Insert ∫ab.', 'Set bounds 0 and 1, then body sin(x^2).', 'Press EXE.'],
        expected: 'If symbolic integration is unavailable, Calcwiz shows a numeric definite integral with a warning.',
      },
      {
        title: 'Limit',
        steps: ['Insert lim.', 'Set target 0 and body sin(x)/x.', 'Press EXE.'],
        expected: 'Calcwiz shows a numeric limit approximation when the symbolic engine does not resolve the limit directly.',
      },
    ],
    pitfalls: [
      'Use d/dx| when you need the derivative evaluated at a specific numeric point.',
      'Definite integrals and limits may return numeric fallback warnings; that means the result is an approximation, not a closed-form symbolic answer.',
      'This milestone does not add multivariable calculus, proof steps, or arbitrary symbolic limit solving.',
      'If a limit or integral cannot be evaluated reliably, the app returns a controlled message instead of raw parser output.',
    ],
  },
];

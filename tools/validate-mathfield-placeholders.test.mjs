import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { looksLikeProse, placeholderViolations, validateMathfieldPlaceholders } from './mathfield-placeholders-core.mjs';

describe('Math-field placeholder policy', () => {
  it('accepts the committed sources', () => {
    assert.ok(validateMathfieldPlaceholders().files > 0);
  });

  it('flags prose written as LaTeX and accepts words inside \\text{}', () => {
    assert.equal(looksLikeProse('Enter an expression'), true);
    assert.equal(looksLikeProse(String.raw`\text{Enter an expression}`), false);
    assert.equal(looksLikeProse(String.raw`\text{Enter }\frac{d}{dz}\left(f(z)\right)`), false);
    assert.equal(looksLikeProse(String.raw`\frac{\sin(x)}{x}`), false);
    assert.equal(looksLikeProse('x^3+2x'), false);
  });

  it('reports each kind of violation with its line', () => {
    const source = [
      '<MathEditor placeholderLatex="Enter an expression" />',
      '<MathEditor placeholder="\\\\frac{\\\\sin(x)}{x}" />',
      'field.placeholder = text;',
      'field.setAttribute(\'data-placeholder\', text);',
      '<MathEditor placeholder="Enter an expression" placeholderLatex={String.raw`\\text{Enter }x`} />',
    ].join('\n');
    const violations = placeholderViolations('src/app/Example.tsx', source);
    assert.equal(violations.length, 4);
    assert.match(violations[0], /Example\.tsx:1 placeholderLatex has words/u);
    assert.match(violations[1], /Example\.tsx:2 placeholder is plain text/u);
    assert.match(violations[2], /Example\.tsx:3 sets a math-field placeholder directly/u);
    assert.match(violations[3], /Example\.tsx:4 sets a math-field placeholder directly/u);
  });

  it('lets the two math-field components apply the placeholder', () => {
    assert.deepEqual(placeholderViolations('src/components/MathEditor.tsx', 'field.placeholder = shown.latex;'), []);
  });
});

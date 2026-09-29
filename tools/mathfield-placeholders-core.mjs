import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Math Editor Placeholder Policy (AGENTS.md): MathLive parses a math-field
// placeholder as LaTeX, so readable words go through `placeholder` (wrapped in
// \text{} by src/components/math-field-placeholder.ts) and math examples
// through `placeholderLatex`. This check catches the mistakes that bring back
// italic run-together placeholders such as "Enteranexpression".

const OWNERS = new Set([
  'src/components/MathEditor.tsx',
  'src/app/shell/notebook/math-field/NotebookMathField.tsx',
]);
const EXCLUDED = [/\.test\.tsx?$/u, /\.spec\.tsx?$/u, /^src\/lib\/symbolic-engine\//u, /^src\/test\//u];

function sourceFiles(rootDir, dir = 'src', out = []) {
  for (const entry of readdirSync(path.join(rootDir, dir), { withFileTypes: true })) {
    const repoPath = `${dir}/${entry.name}`;
    if (entry.isDirectory()) sourceFiles(rootDir, repoPath, out);
    else if (/\.tsx?$/u.test(entry.name) && !EXCLUDED.some((pattern) => pattern.test(repoPath))) out.push(repoPath);
  }
  return out;
}

/** String literals inside an attribute value: "…", '…' or `…`. */
function literals(value) {
  return [...value.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([^`]*)`/gu)]
    .map((match) => match[1] ?? match[2] ?? match[3] ?? '');
}

/** Two or more words of letters outside \text{…} and \commands: prose written as math. */
export function looksLikeProse(latex) {
  const withoutText = latex.replace(/\\text\{[^{}]*\}/gu, ' ').replace(/\\[A-Za-z]+/gu, ' ');
  return /[A-Za-z]{2,}\s+[A-Za-z]{2,}/u.test(withoutText);
}

export function placeholderViolations(repoPath, text) {
  const violations = [];
  const lineOf = (index) => text.slice(0, index).split('\n').length;
  for (const match of text.matchAll(/\bplaceholderLatex=(\{[^\n]*\}|"[^"\n]*")/gu)) {
    for (const literal of literals(match[1])) {
      if (looksLikeProse(literal)) {
        violations.push(`${repoPath}:${lineOf(match.index)} placeholderLatex has words outside \\text{}: ${literal}`);
      }
    }
  }
  for (const match of text.matchAll(/\bplaceholder=("[^"\n]*"|\{[^\n]*\})/gu)) {
    if (/\\/u.test(match[1])) {
      violations.push(`${repoPath}:${lineOf(match.index)} placeholder is plain text; move LaTeX to placeholderLatex: ${match[1]}`);
    }
  }
  if (!OWNERS.has(repoPath)) {
    for (const match of text.matchAll(/\.placeholder\s*=(?!=)|setAttribute\(\s*['"]data-placeholder['"]/gu)) {
      violations.push(`${repoPath}:${lineOf(match.index)} sets a math-field placeholder directly; use MathEditor placeholder/placeholderLatex`);
    }
  }
  return violations;
}

export function validateMathfieldPlaceholders(rootDir = process.cwd()) {
  const files = sourceFiles(rootDir);
  const violations = files.flatMap((repoPath) => placeholderViolations(repoPath, readFileSync(path.join(rootDir, repoPath), 'utf8')));
  if (violations.length) {
    throw new Error(`Math-field placeholder policy violations:\n${violations.map((line) => `- ${line}`).join('\n')}`);
  }
  return { files: files.length };
}

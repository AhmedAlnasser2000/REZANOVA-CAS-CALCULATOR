import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

function propertyName(node) {
  if (!node?.name) return undefined;
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) return node.name.text;
  return undefined;
}

function sourceFiles(rootDir) {
  const result = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolute);
      } else if (
        /\.(?:ts|tsx)$/u.test(entry.name)
        && !/\.(?:test|spec)\.(?:ts|tsx)$/u.test(entry.name)
        && !entry.name.endsWith('.d.ts')
      ) {
        result.push(absolute);
      }
    }
  };
  visit(path.join(rootDir, 'src'));
  return result.sort();
}

function lineOf(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

export function scanResultIntent({ rootDir = process.cwd() } = {}) {
  const violations = [];
  let directSummaryAssignments = 0;
  let declaredDirectAssignments = 0;

  for (const absolute of sourceFiles(rootDir)) {
    const sourceFile = ts.createSourceFile(
      absolute,
      fs.readFileSync(absolute, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      absolute.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const file = path.relative(rootDir, absolute).replaceAll('\\', '/');

    const visit = (node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const properties = new Set(node.properties
          .filter((property) =>
            ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property))
          .map(propertyName));
        if (properties.has('solveSummaryText')) {
          directSummaryAssignments += 1;
          if (properties.has('solveSummaryParts')) {
            declaredDirectAssignments += 1;
          } else {
            violations.push({
              file,
              line: lineOf(sourceFile, node),
              message: 'Direct solveSummaryText assignment must declare solveSummaryParts.',
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  return {
    summary: {
      directSummaryAssignments,
      declaredDirectAssignments,
      violationCount: violations.length,
    },
    violations,
  };
}

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

/** Named adapter files outside the core that may import it. None exist before adoption. */
const ADAPTERS: readonly string[] = [];

it('keeps the private Equation core disconnected in both directions', () => {
  const src = resolve('src'), core = resolve('src/lib/symbolic-engine/equation/core');
  const adapters = new Set(ADAPTERS.map(p => resolve(p)));
  const violations: string[] = [];
  const options: ts.CompilerOptions = { moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext };
  const cache = ts.createModuleResolutionCache(process.cwd(), x => x, options);
  function walk(dir: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== '__tests__') walk(file); continue; }
      if (!/\.tsx?$/.test(file) || /\.(test|spec)\.tsx?$/.test(file) || file === join(core, 'test-support.ts')) continue;
      const inside = file.startsWith(core + sep);
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      function inspect(node: ts.Node): void {
        let spec: ts.Expression | undefined;
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) spec = node.moduleSpecifier;
        if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
          || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) spec = node.arguments[0];
        if (spec && ts.isStringLiteralLike(spec)) {
          const target = ts.resolveModuleName(spec.text, file, options, ts.sys, cache).resolvedModule?.resolvedFileName;
          const destination = target ? resolve(target) : resolve(dirname(file), spec.text);
          if (!inside && !adapters.has(file) && destination.startsWith(core + sep)) violations.push(`outside imports core: ${file}: ${spec.text}`);
          if (inside && !destination.startsWith(core + sep)) violations.push(`core imports outside: ${file}: ${spec.text}`);
          if (inside && /test-support|\.(test|spec)$/.test(spec.text)) violations.push(`core imports test code: ${file}`);
        }
        ts.forEachChild(node, inspect);
      }
      inspect(source);
    }
  }
  walk(src);
  expect(violations).toEqual([]);
});

import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildPrintHygieneBaseline } from '../src/lib/__golden__/print-hygiene-baseline';
import { parsePrintHygieneUpdateArgs } from '../src/lib/__golden__/print-hygiene-update-policy';

const options = parsePrintHygieneUpdateArgs(process.argv.slice(2));
const manifest = await buildPrintHygieneBaseline(options.reason);
const outputPath = resolve('src/lib/__golden__/print-hygiene-baseline.json');
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
process.stdout.write(`Updated ${manifest.caseCount}-case print-hygiene baseline: ${options.reason}\n`);

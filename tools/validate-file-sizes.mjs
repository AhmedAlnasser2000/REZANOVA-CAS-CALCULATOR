import { updateBaseline, validateFileSizes } from './file-sizes-core.mjs';

if (process.argv.includes('--update-baseline')) {
  const result = updateBaseline();
  console.log(
    `File-size baseline updated (${Object.keys(result.baseline).length} entr(ies), `
    + `${result.lowered} lowered, ${result.removed} removed). Caps are never raised by this command.`,
  );
} else {
  const result = validateFileSizes();
  console.log(
    `File sizes are within caps (${result.files} file(s), ${result.baselineEntries} baseline cap(s)).`,
  );
}

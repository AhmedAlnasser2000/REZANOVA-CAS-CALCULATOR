import { validateCalculusLimitsCorpusLedger } from './calculus-limits-corpus-ledger-core.mjs';

const result = validateCalculusLimitsCorpusLedger();

console.log(
  `Calculus limits corpus ledger is valid (${result.sourceCount} source(s), ${result.uniqueCaseCount} unique case(s), ${result.duplicateCaseCount} duplicate record(s), ${result.runResultCount} run result(s), ${result.scanFindingCount} scan finding(s)).`,
);

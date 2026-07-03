import { validateEquationCorpusLedger } from './equation-corpus-ledger-core.mjs';

const result = validateEquationCorpusLedger();

console.log(
  `Equation corpus ledger is valid (${result.sourceCount} source(s), ${result.uniqueCaseCount} unique case(s), ${result.duplicateCaseCount} duplicate record(s), ${result.runResultCount} run result(s), ${result.scanFindingCount} scan finding(s)).`,
);

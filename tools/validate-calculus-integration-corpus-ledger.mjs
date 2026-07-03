import { validateCalculusIntegrationCorpusLedger } from './calculus-integration-corpus-ledger-core.mjs';

const result = validateCalculusIntegrationCorpusLedger();

console.log(
  `Calculus integration corpus ledger is valid (${result.sourceCount} source(s), ${result.uniqueCaseCount} unique case(s), ${result.duplicateCaseCount} duplicate record(s), ${result.runResultCount} run result(s), ${result.scanFindingCount} scan finding(s)).`,
);

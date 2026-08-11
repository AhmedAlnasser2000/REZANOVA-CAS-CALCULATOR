#!/usr/bin/env node

import { runResultContractCommand } from './result-contract-runner-core.mjs';

process.exitCode = await runResultContractCommand({
  callerArgs: process.argv.slice(2),
});

#!/usr/bin/env node
import { validateRepoCodexAgentWorkflow } from './codex-agent-workflow-core.mjs';

const result = validateRepoCodexAgentWorkflow();
console.log('Codex controlled-agent workflow');
console.log(`Roles: ${result.roleCount}`);
console.log(`Writable roles: ${result.writableCount}`);
console.log(`Maximum concurrent subagents: ${result.concurrency}`);

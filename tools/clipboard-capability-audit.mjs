#!/usr/bin/env node
import {
  auditClipboardCapabilitySetup,
  formatClipboardCapabilityAudit,
} from './clipboard-capability-audit-core.mjs';

const report = auditClipboardCapabilitySetup();
process.stdout.write(`${formatClipboardCapabilityAudit(report)}\n`);
if (!report.ok) process.exitCode = 1;

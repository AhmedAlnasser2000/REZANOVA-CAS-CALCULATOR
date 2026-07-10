export type PrintHygieneUpdateOptions = {
  accepted: true;
  reason: string;
};

export function parsePrintHygieneUpdateArgs(args: readonly string[]): PrintHygieneUpdateOptions {
  if (args.includes('-u') || args.includes('--updateSnapshot')) {
    throw new Error('Snapshot update flags are not supported; use --accept with --reason.');
  }
  if (!args.includes('--accept')) {
    throw new Error('Print-hygiene baseline updates require --accept.');
  }
  const reasonIndex = args.indexOf('--reason');
  const reason = reasonIndex >= 0 ? args[reasonIndex + 1]?.trim() : '';
  if (!reason) {
    throw new Error('Print-hygiene baseline updates require a non-empty --reason.');
  }
  return { accepted: true, reason };
}

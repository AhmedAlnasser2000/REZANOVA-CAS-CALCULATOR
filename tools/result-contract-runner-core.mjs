import { spawn } from 'node:child_process';

export const COMPILATION_FALLBACK_MARKER = 'Compilation fallback for';

export function resultContractVitestArgs(callerArgs) {
  const hasWorkerLimit = callerArgs.some((argument) => (
    argument === '--maxWorkers' || argument.startsWith('--maxWorkers=')
  ));
  return [
    'node_modules/vitest/vitest.mjs',
    'run',
    'src/lib/result-contract',
    ...(hasWorkerLimit ? [] : ['--maxWorkers=4']),
    ...callerArgs,
  ];
}

function watchOutput(stream, destination, onFallback) {
  let carry = '';
  stream.on('data', (chunk) => {
    destination.write(chunk);
    const text = carry + chunk.toString();
    if (text.includes(COMPILATION_FALLBACK_MARKER)) onFallback();
    carry = text.slice(-(COMPILATION_FALLBACK_MARKER.length - 1));
  });
}

export function runResultContractCommand({
  callerArgs,
  command = process.execPath,
  commandArgs = resultContractVitestArgs(callerArgs),
  stdout = process.stdout,
  stderr = process.stderr,
  spawnCommand = spawn,
}) {
  return new Promise((resolve, reject) => {
    let fallbackSeen = false;
    const child = spawnCommand(command, commandArgs, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    watchOutput(child.stdout, stdout, () => { fallbackSeen = true; });
    watchOutput(child.stderr, stderr, () => { fallbackSeen = true; });
    child.once('error', reject);
    child.once('close', (code, signal) => {
      if (signal) {
        stderr.write(`Result-contract tests terminated by ${signal}.\n`);
        resolve(1);
        return;
      }
      if (fallbackSeen && code === 0) {
        stderr.write('Result-contract tests emitted a forbidden Compute Engine compilation fallback.\n');
      }
      resolve(code === 0 && !fallbackSeen ? 0 : (code === 0 ? 1 : (code ?? 1)));
    });
  });
}

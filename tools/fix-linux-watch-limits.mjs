#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import os from 'node:os';

export const calcwizInotifyConfigPath = '/etc/sysctl.d/99-calcwiz-inotify.conf';

export const calcwizInotifyConfig = [
  'fs.inotify.max_user_watches=1048576',
  'fs.inotify.max_user_instances=1024',
  'fs.inotify.max_queued_events=32768',
  '',
].join('\n');

export function buildLinuxWatchLimitFixInstructions() {
  return [
    'Run:',
    '  npm run fix:linux-watch-limits',
    '',
    'This writes:',
    `  ${calcwizInotifyConfigPath}`,
    '',
    'Manual equivalent:',
    `  printf '%s\\n' 'fs.inotify.max_user_watches=1048576' 'fs.inotify.max_user_instances=1024' 'fs.inotify.max_queued_events=32768' | sudo tee ${calcwizInotifyConfigPath} >/dev/null`,
    '  sudo sysctl --system',
  ].join('\n');
}

export function applyLinuxWatchLimitFix({
  platform = os.platform(),
  execFile = execFileSync,
} = {}) {
  if (platform !== 'linux') {
    return {
      ok: false,
      message: 'Linux watch-limit repair is only needed on Linux.',
    };
  }

  execFile('sudo', ['tee', calcwizInotifyConfigPath], {
    input: calcwizInotifyConfig,
    stdio: ['pipe', 'ignore', 'inherit'],
  });
  execFile('sudo', ['sysctl', '--system'], {
    stdio: 'inherit',
  });

  return {
    ok: true,
    message: [
      'Linux file-watch limits were updated.',
      'Close/reopen VS Code or close other watcher-heavy apps, then rerun:',
      '  npm run tauri:dev',
    ].join('\n'),
  };
}

const isCli = process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'));

if (isCli) {
  if (process.argv.includes('--print')) {
    console.log(buildLinuxWatchLimitFixInstructions());
  } else {
    const result = applyLinuxWatchLimitFix();
    if (!result.ok) {
      console.error(result.message);
      process.exitCode = 1;
    } else {
      console.log(result.message);
    }
  }
}

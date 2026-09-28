import { execFile } from 'node:child_process';

export function sendDesktop({ title, message, urgency }, config, execFileImpl = execFile) {
  if (config.desktop?.enabled === false) return Promise.resolve({ channel: 'desktop', skipped: 'disabled' });
  return new Promise((resolve, reject) => {
    execFileImpl(
      'notify-send',
      ['--app-name=Agent Attention', `--urgency=${urgency ?? 'normal'}`, title, message],
      { timeout: 5_000 },
      (error) => (error ? reject(new Error(`notify-send: ${error.message}`)) : resolve({ channel: 'desktop', sent: true })),
    );
  });
}

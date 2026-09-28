import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const EVENT_TYPES = ['critical', 'question', 'failure', 'stalled', 'complete', 'expired'];

// Sounds are gentle Pushover built-ins used as placeholders; the final sound set is
// still to be chosen with the user. Harsh sounds (siren, persistent, alien, echo)
// are deliberately avoided, even for critical events.
export const DEFAULT_CONFIG = Object.freeze({
  pushover: { token: '', user: '' },
  desktop: { enabled: true },
  dryRun: false,
  timings: {
    reAlertMinutes: 30,
    expireMinutes: 120,
    stallMinutes: 30,
    // Turns shorter than this skip the completion alert: the user is likely watching.
    minTurnSecondsForCompletion: 60,
    daemonTickSeconds: 30,
  },
  events: {
    critical: { priority: 1, sound: 'cosmic', urgency: 'critical' },
    question: { priority: 0, sound: 'magic', urgency: 'normal' },
    failure: { priority: 1, sound: 'falling', urgency: 'critical' },
    stalled: { priority: 0, sound: 'pianobar', urgency: 'normal' },
    complete: { priority: 0, sound: 'bike', urgency: 'normal' },
    expired: { priority: 1, sound: 'intermission', urgency: 'critical' },
  },
});

export function configDir(env = process.env) {
  if (env.ATTN_CONFIG_DIR) return env.ATTN_CONFIG_DIR;
  const base = env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(base, 'rezanova-agent-attention');
}

export function stateDir(env = process.env) {
  if (env.ATTN_STATE_DIR) return env.ATTN_STATE_DIR;
  const base = env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
  return path.join(base, 'rezanova-agent-attention');
}

export function configPath(env = process.env) {
  return path.join(configDir(env), 'config.json');
}

function mergeDeep(base, override) {
  if (!override || typeof override !== 'object' || Array.isArray(override)) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = base[key];
    out[key] = current && typeof current === 'object' && !Array.isArray(current)
      ? mergeDeep(current, value)
      : value;
  }
  return out;
}

export function resolveConfig(fileConfig = {}, env = process.env) {
  const config = mergeDeep(structuredClone(DEFAULT_CONFIG), fileConfig);
  if (env.ATTN_PUSHOVER_TOKEN) config.pushover.token = env.ATTN_PUSHOVER_TOKEN;
  if (env.ATTN_PUSHOVER_USER) config.pushover.user = env.ATTN_PUSHOVER_USER;
  if (env.ATTN_DRY_RUN === '1') config.dryRun = true;
  return config;
}

export function loadConfig(env = process.env) {
  let fileConfig = {};
  try {
    fileConfig = JSON.parse(fs.readFileSync(configPath(env), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Invalid config at ${configPath(env)}: ${error.message}`);
  }
  return resolveConfig(fileConfig, env);
}

export function writeDefaultConfig(env = process.env) {
  const file = configPath(env);
  if (fs.existsSync(file)) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, { mode: 0o600 });
  return true;
}

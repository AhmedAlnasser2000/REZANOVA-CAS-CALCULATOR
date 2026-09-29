import { formatAlert } from './classify.mjs';
import { sendDesktop } from './notify-desktop.mjs';
import { sendPushover } from './notify-pushover.mjs';
import { appendLog, withState } from './state.mjs';

export const defaultChannels = { pushover: sendPushover, desktop: sendDesktop };

// Reserves the next send slot, at least `spacingMs` after the previous alert from any
// agent or process, so alerts that fire together arrive one after another in order.
export function reserveAlertSlot(stateDir, spacingMs, now = Date.now()) {
  if (!(spacingMs > 0)) return now;
  return withState(stateDir, (state) => {
    const slot = state.lastAlertAt == null ? now : Math.max(now, state.lastAlertAt + spacingMs);
    state.lastAlertAt = slot;
    return slot;
  });
}

// Fans an event out to every channel. It never throws: a notification problem must
// not break the agent hook that reported the event.
export async function dispatch(event, {
  config, stateDir, channels = defaultChannels, daemonAlive = true, sleep = (ms) => new Promise((done) => setTimeout(done, ms)),
}) {
  const style = config.events?.[event.type] ?? {};
  const alert = { ...formatAlert(event, { daemonAlive }), priority: style.priority, sound: style.sound, urgency: style.urgency };
  appendLog(stateDir, 'events.log', `${event.type} ${event.agent} ${event.sessionId ?? '-'} ${alert.title}`);
  if (config.dryRun) {
    appendLog(stateDir, 'outbox.log', JSON.stringify(alert));
    return [{ channel: 'dry-run', sent: true, alert }];
  }
  try {
    const wait = reserveAlertSlot(stateDir, (config.timings?.alertSpacingSeconds ?? 0) * 1000) - Date.now();
    if (wait > 0) await sleep(wait);
  } catch (error) {
    // A busy lock only costs the spacing, never the alert.
    appendLog(stateDir, 'errors.log', `alert spacing: ${error.message}`);
  }
  const results = await Promise.allSettled(Object.values(channels).map((send) => send(alert, config)));
  return results.map((result) => {
    if (result.status === 'fulfilled') return result.value;
    appendLog(stateDir, 'errors.log', result.reason?.message ?? String(result.reason));
    return { error: result.reason?.message ?? String(result.reason) };
  });
}

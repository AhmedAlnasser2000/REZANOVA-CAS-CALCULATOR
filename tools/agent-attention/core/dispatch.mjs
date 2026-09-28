import { formatAlert } from './classify.mjs';
import { sendDesktop } from './notify-desktop.mjs';
import { sendPushover } from './notify-pushover.mjs';
import { appendLog } from './state.mjs';

export const defaultChannels = { pushover: sendPushover, desktop: sendDesktop };

// Fans an event out to every channel. It never throws: a notification problem must
// not break the agent hook that reported the event.
export async function dispatch(event, { config, stateDir, channels = defaultChannels, daemonAlive = true }) {
  const style = config.events?.[event.type] ?? {};
  const alert = { ...formatAlert(event, { daemonAlive }), priority: style.priority, sound: style.sound, urgency: style.urgency };
  appendLog(stateDir, 'events.log', `${event.type} ${event.agent} ${event.sessionId ?? '-'} ${alert.title}`);
  if (config.dryRun) {
    appendLog(stateDir, 'outbox.log', JSON.stringify(alert));
    return [{ channel: 'dry-run', sent: true, alert }];
  }
  const results = await Promise.allSettled(Object.values(channels).map((send) => send(alert, config)));
  return results.map((result) => {
    if (result.status === 'fulfilled') return result.value;
    appendLog(stateDir, 'errors.log', result.reason?.message ?? String(result.reason));
    return { error: result.reason?.message ?? String(result.reason) };
  });
}

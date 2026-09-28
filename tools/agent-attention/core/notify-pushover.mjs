const PUSHOVER_URL = 'https://api.pushover.net/1/messages.json';
const TIMEOUT_MS = 5_000;

export async function sendPushover({ title, message, priority, sound }, config, fetchImpl = globalThis.fetch) {
  const { token, user } = config.pushover ?? {};
  if (!token || !user) return { channel: 'pushover', skipped: 'no Pushover token/user configured' };
  const body = new URLSearchParams({
    token,
    user,
    title: title.slice(0, 250),
    message: message.slice(0, 1024),
    priority: String(priority ?? 0),
  });
  if (sound) body.set('sound', sound);
  const response = await fetchImpl(PUSHOVER_URL, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Pushover HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return { channel: 'pushover', sent: true };
}

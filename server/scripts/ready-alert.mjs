import { env } from 'node:process';

// Monitors /api/ready and calls a webhook (Telegram/Discord/Slack) on repeated failure.
// Run from cron every minute, e.g.:
// * * * * * cd /var/www/scout-app && ALERT_WEBHOOK_URL=https://api.telegram.org/bot.../sendMessage node server/scripts/ready-alert.mjs

const HEALTH_URL = env.HEALTH_URL || 'http://127.0.0.1:5000/api/ready';
const ALERT_WEBHOOK_URL = env.ALERT_WEBHOOK_URL;
const ALERT_CONSECUTIVE = Number(env.ALERT_CONSECUTIVE) || 2;
const STATE_FILE = env.ALERT_STATE_FILE || '/tmp/scout-ready-alert-state';

const fs = await import('node:fs/promises');

async function main() {
  let failed = true;
  let detail = 'unknown';
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(5000) });
    failed = !res.ok;
    detail = `status ${res.status}`;
  } catch (err) {
    detail = err.message || 'network error';
    failed = true;
  }

  let count = 0;
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const state = JSON.parse(raw);
    count = failed ? (state.count || 0) + 1 : 0;
  } catch {
    count = failed ? 1 : 0;
  }

  await fs.writeFile(STATE_FILE, JSON.stringify({ count, lastCheck: new Date().toISOString(), detail }));

  if (failed && count >= ALERT_CONSECUTIVE && ALERT_WEBHOOK_URL) {
    const body = JSON.stringify({
      text: `🚨 Scout App /api/ready failed ${count} times: ${detail}`,
    });
    await fetch(ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  }

  process.exit(failed ? (count >= ALERT_CONSECUTIVE ? 1 : 0) : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

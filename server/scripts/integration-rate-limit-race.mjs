process.env.SCOUT_NO_AUTOSTART = '1';
process.env.API_PUBLIC_RATE_MAX = '3';
process.env.API_RATE_WINDOW_MS = '1000';

import assert from 'node:assert/strict';
import prisma, { databaseReady } from '../src/db.js';

await databaseReady;

// Dynamic import so the rate-limit env values are read when index.js initialises.
const { server, startServer } = await import('../src/index.js');

async function request(base, route) {
  const response = await fetch(`${base}${route}`);
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { response, data };
}

try {
  await startServer(0);
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;

  const attempts = await Promise.all(
    Array.from({ length: 5 }, () => request(base, '/api/health'))
  );

  const ok = attempts.filter(a => a.response.status === 200);
  const limited = attempts.filter(a => a.response.status === 429);

  assert.equal(ok.length, 3, `expected 3 accepted public health requests, got ${ok.length}`);
  assert.equal(limited.length, 2, `expected 2 rate-limited public health requests, got ${limited.length}`);

  console.log('rate limit key concurrency test passed: 3 accepted, 2 blocked');
} finally {
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(() => resolve()));
  await prisma.$disconnect();
}

const baseUrl = process.env.HEALTH_URL || `http://127.0.0.1:${process.env.PORT || 5000}`;

const response = await fetch(`${baseUrl}/api/health`);
if (!response.ok) throw new Error(`health returned ${response.status}`);
const health = await response.json();
if (health.status !== 'ok') throw new Error('health status is not ok');

const ready = await fetch(`${baseUrl}/api/ready`);
if (!ready.ok) throw new Error(`readiness returned ${ready.status}`);
const readiness = await ready.json();
if (readiness.status !== 'ready' || readiness.checks?.database !== 'ok') throw new Error('database readiness failed');
if (JSON.stringify({ health, readiness }).match(/JWT_SECRET|DATABASE_URL|password|token/i)) throw new Error('health endpoint exposed sensitive data');

console.log('health/readiness checks passed');

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

export const options = {
  scenarios: {
    submitters: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '5m',
    },
    watchers: {
      executor: 'constant-vus',
      vus: 200,
      duration: '2m',
    },
  },
  thresholds: {
    'http_req_duration{scenario:submitters}': ['p(95)<1500'],
    'http_req_failed': ['rate<0.01'],
    'failed_score_total_checks': ['rate<0.01'],
  },
};

const failRate = new Rate('failed_score_total_checks');
const BASE = __ENV.BASE_URL || 'http://127.0.0.1:5000';

function loginTeam(username, password, deviceId) {
  const res = http.post(`${BASE}/api/auth/team/login`, JSON.stringify({ username, password, deviceId }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(res, { 'login status 200': (r) => r.status === 200 });
  return res.json('token');
}

export function setup() {
  return { jwt: loginTeam('team-load', 'LoadTest123!', 'load-device-1') };
}

export default function (data) {
  if (__VU <= 50) {
    // Submitters: start a competition and submit
    const token = data.jwt;
    const start = http.post(`${BASE}/api/quiz/start`, JSON.stringify({ competitionId: 'load-competition', entryCode: 'LOAD' }), {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    check(start, { 'quiz start 200': (r) => r.status === 200 });
    const sessionId = start.json('sessionId');

    sleep(1);

    const submit = http.post(`${BASE}/api/quiz/submit`, JSON.stringify({ sessionId }), {
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Idempotency-Key': `${__VU}-${__ITER}` },
    });
    const ok = check(submit, { 'submit 200': (r) => r.status === 200 });
    failRate.add(!ok);
  } else {
    // Watchers: poll leaderboard
    const token = data.jwt;
    const res = http.get(`${BASE}/api/leaderboard?page=1&limit=20`, { headers: { Authorization: `Bearer ${token}` } });
    check(res, { 'leaderboard 200': (r) => r.status === 200 });
    sleep(1);
  }
}

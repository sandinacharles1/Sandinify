import http from 'k6/http'; //import http. It allows us to make requests
import { check } from 'k6'; //import check. It allows us to check the response of the requests
import { Counter } from 'k6/metrics'; //import Counter. It allows us to count the number of requests that are rejected by the server

const BASE = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const JSON_HEADERS = { 'Content-Type': 'application/json' }; //headers for request. a header isthe infomation the is sent to the endpoint
const rejected = new Counter('rejected_429'); //create a counter for the number of requests that are rejected by the server

const DEFAULT_RATES = { limiter: 200, login: 20, signup: 20, me: 200, refresh: 50 };
const DEFAULT_TESTS = ['login', 'signup', 'me', 'refresh'];
const TESTS = (__ENV.TESTS || __ENV.TEST || DEFAULT_TESTS.join(','))
  .split(',')
  .map((test) => test.trim())
  .filter(Boolean)
  .filter((test, index, tests) => tests.indexOf(test) === index);

if (TESTS.length === 0) {
  throw new Error('Set TEST to one scenario or TESTS to a comma-separated list.');
}
if (TESTS.includes('limiter') && TESTS.length > 1) {
  throw new Error('Run the limiter scenario by itself; it intentionally generates 429 responses.');
}

const RATES = {};
for (const test of TESTS) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULT_RATES, test)) {
    throw new Error(`Unknown test "${test}". Choose from: ${Object.keys(DEFAULT_RATES).join(', ')}`);
  }

  const configuredRate = Number(__ENV[`RATE_${test.toUpperCase()}`] || DEFAULT_RATES[test]);
  if (!Number.isFinite(configuredRate) || configuredRate <= 0) {
    throw new Error(`RATE_${test.toUpperCase()} must be a positive number.`);
  }
  RATES[test] = configuredRate;
}

const scenarios = {};
for (const test of TESTS) {
  scenarios[test] = {
    executor: 'constant-arrival-rate',
    rate: RATES[test],
    timeUnit: '1s',
    duration: __ENV.DURATION || '30s',
    preAllocatedVUs: 50,
    maxVUs: 300,
    exec: test,
  };
}

export const options = {
  scenarios,
};
export function setup() {
  const username = 'loadtester' + Date.now();
  const creds = JSON.stringify({ username: username, password: 'pass1234' });
  const res = http.post(BASE + '/api/signup', creds, { headers: JSON_HEADERS });
  if (res.status !== 201) {
    throw new Error(`Test setup signup failed with HTTP ${res.status}`);
  }
  const body = res.json();
  return { username: username, accessToken: body.accessToken, refreshToken: body.refreshToken };
} //setup, create a user for the load test. This is run before the tests are run. It creates a user with a unique username and password and returns the access token and refresh token for that user.

export function limiter() {
  const res = http.get(BASE + '/api/me');
  if (res.status === 429) rejected.add(1);
} //limiter test. This test will send requests to the /api/me endpoint. If the response is 429, it will increment the rejected counter.

export function login(data) {
  const body = JSON.stringify({ username: data.username, password: 'pass1234' });
  const res = http.post(BASE + '/api/login', body, { headers: JSON_HEADERS });
  check(res, { 'login is 200': (r) => r.status === 200 });
}//login test. This test will send requests to the /api/login endpoint. It will check if the response is 200.

export function signup() {
  const name = 'u' + Date.now() + '_' + __VU + '_' + __ITER;
  const body = JSON.stringify({ username: name, password: 'pass1234' });
  const res = http.post(BASE + '/api/signup', body, { headers: JSON_HEADERS });
  check(res, { 'signup is 201': (r) => r.status === 201 });
}//signup test. This test will send requests to the /api/signup endpoint. It will check if the response is 201.

export function me(data) {
  const res = http.get(BASE + '/api/me', { headers: { Authorization: 'Bearer ' + data.accessToken } });
  check(res, { 'me is 200': (r) => r.status === 200 });
}//me test. This test will send requests to the /api/me endpoint. It will check if the response is 200.

export function refresh(data) {
  const body = JSON.stringify({ refreshToken: data.refreshToken });
  const res = http.post(BASE + '/api/refresh', body, { headers: JSON_HEADERS });
  check(res, { 'refresh is 200': (r) => r.status === 200 });
}//refresh test. This test will send requests to the /api/refresh endpoint. It will check if the response is 200.
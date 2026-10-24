import http from 'k6/http'; //import http. It allows us to make requests
import { check } from 'k6'; //import check. It allows us to check the response of the requests
import { Counter } from 'k6/metrics'; //import Counter. It allows us to count the number of requests that are rejected by the server

const BASE = 'http://localhost:8080'; //Where requests come from
const JSON_HEADERS = { 'Content-Type': 'application/json' }; //headers for request. a header isthe infomation the is sent to the endpoint
const rejected = new Counter('rejected_429'); //create a counter for the number of requests that are rejected by the server

const TEST = __ENV.TEST || 'login'; //This allows us to run different tests by seting the test variable in the command line. For example, to run the login test, we can run `k6 run --env TEST=login loadtest.js`. If no test is specified, it will default to the login test.
const RATES = { limiter: 200, login: 20, signup: 20, me: 200, refresh: 50 }; //rates for the different tests. This is the number of requests per second that we want to send to the server. We can change these rates to test different scenarios.

export const options = {
  scenarios: {
    [TEST]: {
      executor: 'constant-arrival-rate',
      rate: RATES[TEST],
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 300,
      exec: TEST,
    },
  },
}; // Configurations for load test. Scenario has multiple types of tests. WE have this so we can run differenrt tests by setting the TEST in cmdline
export function setup() {
  const username = 'loadtester' + Date.now();
  const creds = JSON.stringify({ username: username, password: 'pass1234' });
  const res = http.post(BASE + '/api/signup', creds, { headers: JSON_HEADERS });
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
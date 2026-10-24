import http from 'k6/http';
import { Counter } from 'k6/metrics';

const limited = new Counter('rate_limited');
http.setResponseCallback(http.expectedStatuses(401, 429));
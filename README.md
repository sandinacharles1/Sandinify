# Sandinify

![Sandinify Tests CI](https://github.com/sandinacharles1/sandinify/actions/workflows/ci.yml/badge.svg)

**Sandinify** is a distributed audio streaming and media processing backend built with **Java (Spring Boot)**, **Python**, **PostgreSQL**, **Redis**, **AWS S3**, and **Kubernetes**. It ingests raw audio files, transcodes them asynchronously into multi-bitrate HLS (HTTP Live Streaming) chunks via an FFmpeg worker pipeline, and serves authenticated streams with client-side throughput adaptation.

The system is instrumented with **OpenTelemetry** and **Jaeger** for distributed tracing, benchmarked with **k6** across multi-pod Kubernetes replicas, and protected by an atomic Redis/Lua token-bucket rate limiter.

---

## Table of Contents
- [Homepage Preview](#homepage-preview)
- [Sandinify User Authentication Section](#sandinify-user-authentication-section)
- [Core Capabilities](#core-capabilities)
- [Tech Stack](#tech-stack)
- [API Endpoints](#api-endpoints)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Design Decisions](#design-decisions)
  - [Distributed Rate Limiter (Token Bucket)](#distributed-rate-limiter-token-bucket)
  - [Split-State Authentication](#split-state-authentication)
- [Testing & Continuous Integration](#testing--continuous-integration)
- [Load Testing & Distributed Tracing](#load-testing--distributed-tracing)
- [Getting Started](#getting-started)
- [Multi-Instance Kubernetes Deployment & Benchmarks](#multi-instance-kubernetes-deployment--benchmarks)
  - [Request Flow Architecture](#request-flow-architecture)
  - [Infrastructure & Deployment Architecture](#infrastructure--deployment-architecture)
  - [Database Connection Pooling & Concurrency (HikariCP)](#database-connection-pooling--concurrency-hikaricp)
  - [Multi-Pod Load-Testing Benchmarks](#multi-pod-load-testing-benchmarks)
  - [Distributed Tracing & Bottleneck Isolation (OpenTelemetry)](#distributed-tracing--bottleneck-isolation-opentelemetry)
  - [Production Readiness Post-Mortems](#production-readiness-post-mortems)
- [Song Upload System Design](#song-upload-system-design)
  - [Current Upload Design](#current-upload-design)
  - [Extra Upload Design](#extra-upload-design)
  - [Feature Extraction Design](#feature-extraction-design)
  - [Data Model & Storage Layout](#data-model--storage-layout)
  - [Asynchronous Upload Flow](#asynchronous-upload-flow)
  - [Background Transcoding Worker (Python + FFmpeg)](#background-transcoding-worker-python--ffmpeg)
  - [Upload Verification, Post-Mortems & Known Limitations](#upload-verification-post-mortems--known-limitations)
- [Song Retrieval System Design](#song-retrieval-system-design)
- [Song Fetching & Adaptive HLS Streaming Design](#song-fetching--adaptive-hls-streaming-design)
- [Roadmap](#roadmap)

---

## Homepage Preview
![Homepage Preview](<!-- PASTE_YOUR_HOMEPAGE_IMAGE_URL_HERE -->)

## Sandinify User Authentication Section
![User Authentication Diagram](<!-- PASTE_YOUR_AUTH_DIAGRAM_URL_HERE -->)

A Spring Boot backend engineered with production scalability and observability practices: a Redis/Lua distributed rate limiter, stateless JWT access tokens paired with revocable hashed refresh tokens, integration testing in CI, and k6 load testing with OpenTelemetry distributed tracing.

---

## Core Capabilities
- **User Identity & Session Management:** Account registration, authentication, and protected `/api/me` identity resolution.
- **Split-State Token Auth:** Short-lived HMAC-SHA256 JWT access tokens (15m TTL) paired with database-backed, SHA-hashed revocable refresh tokens.
- **Distributed Rate Limiting:** Atomic token-bucket algorithm executed via Lua scripting in Redis, enforced at the servlet filter layer.
- **Asynchronous Audio Transcoding:** Decoupled Python/FFmpeg worker pipeline consuming jobs via Redis `BRPOPLPUSH` with crash recovery and dead-letter routing.
- **Authenticated Adaptive HLS Streaming:** Byte-streaming Java proxy serving multi-bitrate `.m3u8` playlists and `.ts` chunks from private AWS S3 storage to an EWMA-driven `hls.js` client.
- **End-to-End Observability:** OpenTelemetry JVM instrumentation exporting distributed traces to Jaeger across Kubernetes replicas.
- **Containerized & Orchestrated:** Single-command local stack via Docker Compose and multi-replica deployment via `kind` and NGINX Ingress.

---

## Tech Stack

| Area | Tools |
| :--- | :--- |
| **Backend API** | Java 25, Spring Boot, Spring Data JPA, Flyway |
| **Media Worker** | Python, FFmpeg / ffprobe, `boto3`, `psycopg` |
| **Database** | PostgreSQL 16, HikariCP |
| **Cache & Message Broker** | Redis, Lua |
| **Object Storage** | AWS S3 (Private Bucket) |
| **Auth & Cryptography** | JWT (`HMAC-SHA256`), Argon2id, SHA-256 refresh tokens |
| **Testing & CI** | JUnit 5, MockMvc, Mockito, Python `unittest`, `node:test`, GitHub Actions |
| **Load Testing & Observability** | Grafana k6, OpenTelemetry Java Agent, Jaeger v2 |
| **Infrastructure** | Docker, Docker Compose, Kubernetes (`kind`), F5 NGINX Ingress |

---

## API Endpoints

| Method | Endpoint | Description | Success | Errors |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/signup` | Register a new account and issue token pair | `201` | `400` blank fields, `409` username taken |
| `POST` | `/api/login` | Authenticate credentials and issue token pair | `200` | `401` invalid credentials |
| `GET` | `/api/me` | Resolve current authenticated user | `200` | `401` invalid or expired token |
| `POST` | `/api/refresh` | Exchange valid refresh token for new access token | `200` | `401` session expired or revoked |
| `POST` | `/api/logout` | Invalidate active refresh token in database | `200` | `401` invalid token |
| `POST` | `/api/songs/upload` | Ingest audio file, store in S3, enqueue transcoding job | `201` | `400` invalid payload, `503` queue unavailable |
| `GET` | `/api/songs` | List catalog metadata ordered newest-first | `200` | `401` unauthorized |
| `GET` | `/api/songs/{id}/hls/{*path}` | Stream authenticated HLS playlists and chunks from S3 | `200` | `400` invalid path, `404` missing object, `502` S3 error |

*All endpoints return `429 Too Many Requests` when client token buckets are exhausted.*

---

## System Architecture
```text
Client Request
   │
   ▼
RateLimitFilter ────▶ RateLimiterService ────▶ Redis (Atomic Lua Token Bucket)
   │
   ▼
JwtAuthFilter (Stateless HMAC-SHA256 verification on protected routes)
   │
   ├──▶ AuthController ────▶ Auth Services ────▶ Repositories ────▶ PostgreSQL
   │
   └──▶ SongUploadController ────▶ S3StorageService + SongRepository ────▶ AWS S3 + PostgreSQL
                                        │
                                        ▼
                                 Redis Queue (FIFO) ────▶ Python FFmpeg Worker ────▶ S3 (HLS Chunks)
```

---

## Project Structure

| File | Purpose |
| :--- | :--- |
| `RateLimiterService.java` | Executes atomic token-bucket refill and consumption via Lua in Redis |
| `RateLimitFilter.java` | Servlet filter enforcing IP-based rate limits prior to authentication |
| `auth/api/AuthController.java` | REST controller handling signup, login, session refresh, and logout |
| `songs/api/SongUploadController.java` | Handles multipart ingestion, metadata persistence, and authenticated HLS byte proxying |
| `songs/Song.java` / `SongRepository.java` | JPA entity and repository tracking track state (`PENDING` → `PROCESSING` → `READY`) |
| `User.java` / `UserRepository.java` | JPA entity and repository for user credentials |
| `RefreshToken*.java` | Persistence, hashing, validation, and revocation lifecycle for refresh tokens |
| `JwtService.java` / `JwtAuthFilter.java` | Generates and verifies signed `HS256` JWT access tokens |
| `backend/transcoding_worker/main.py` | Python worker probing source bitrates and transcoding adaptive HLS tiers via FFmpeg |
| `SandinifyApplicationTests.java` | Full-stack `MockMvc` integration test suite |
| `loadtest.js` | Parameterized k6 load-testing suite |

---

## Design Decisions

### Distributed Rate Limiter (Token Bucket)
Each client IP maps to a token bucket storing two values: remaining tokens and last refill timestamp. Refills are calculated lazily on request arrival, eliminating background timer overhead. Requests on an empty bucket fail fast with `429`.

* **Why Token Bucket:** Accommodates legitimate traffic bursts up to bucket capacity while enforcing a strict long-term average rate, avoiding the boundary-spike flaws of fixed-window counters.
* **Why Redis:** Centralizes rate-limit state in memory across horizontally scaled replicas, provides native TTL eviction for idle keys, and offloads high-frequency checks from PostgreSQL. **Trade-off:** Adds one network round-trip per request.
* **Why Lua for Atomicity:** Reading, refilling, decrementing, and persisting bucket state requires multiple operations. Executing the logic inside a single Redis Lua script guarantees atomic execution, eliminates race conditions between concurrent requests, avoids multi-command round-trips, and relies on Redis's single authoritative clock. **Trade-off:** Lua scripts are harder to unit-test outside Redis and must remain strictly bounded in execution time to avoid blocking Redis's single-threaded event loop.
* **Why Not JVM Locks:** `synchronized` or `ReentrantLock` only coordinate threads within a single JVM process; multi-replica deployments require external distributed state.
* **Failure Mode (Fail-Open):** If Redis becomes unreachable, `RateLimitFilter` logs the failure and permits traffic through so a cache outage does not cause a total service blackout.

### Split-State Authentication
Balances horizontal scalability with immediate session revocation:
* **Credential Security:** Passwords are hashed using **Argon2id**. `POST /api/login` returns uniform `401` responses for unknown usernames and incorrect passwords to prevent user enumeration.
* **Stateless Access Tokens (JWT):** Signed with `HMAC-SHA256` and scoped to a **15-minute** expiration (`sub`, `iat`, `exp` claims). `JwtAuthFilter` validates signatures cryptographically in memory without database I/O:
  ```text
  Signature = HMAC-SHA256(Base64URL(Header) + "." + Base64URL(Payload), SecretKey)
  ```
* **State-Backed Refresh Tokens:** Stored as non-reversible hashes in PostgreSQL. When an access token expires, the client transparently exchanges its refresh token at `POST /api/refresh`. Calling `POST /api/logout` immediately invalidates the database record, preventing further token renewals.

---

## Testing & Continuous Integration

### Integration & Unit Test Suites
`SandinifyApplicationTests` executes **12 full-stack `MockMvc` integration tests** covering registration, duplicate conflicts (`409`), payload validation (`400`), credential verification, enumeration resistance, tampered JWT rejection (`401`), token rotation, and post-logout revocation. Each test runs inside a `@Transactional` rollback boundary against an isolated test profile with a mocked rate limiter.

### GitHub Actions Pipeline (`.github/workflows/ci.yml`)
Every `push` and `pull_request` provisions a clean Ubuntu runner, configures Temurin Java 25 with Maven dependency caching, and runs `./mvnw test`.
* **CI Engineering Fixes:**
  1. Preserved Linux executable permissions (`git update-index --chmod=+x mvnw`) for cross-platform commits.
  2. Injected non-sensitive placeholder environment variables in CI so `@SpringBootTest` context initialization succeeds without exposing AWS credentials.
  3. Isolated CI persistence via `application-test.properties` using an in-memory H2 datasource (`@ActiveProfiles("test")`). **Trade-off:** H2 does not validate PostgreSQL-specific SQL dialects; production schema compatibility is verified separately via Flyway against PostgreSQL 16.

---

## Load Testing & Distributed Tracing
`loadtest.js` runs decoupled k6 scenarios across `signup`, `login`, `/me`, `refresh`, and `limiter` endpoints. Core service methods are annotated with OpenTelemetry's `@WithSpan` and exported via the OpenTelemetry Java Agent to Jaeger for span-level latency attribution.

### Single-Instance Baseline Results

| Scenario | Result |
| :--- | :--- |
| **Rate Limiter Burst** | 5,887 of 6,000 rapid-burst requests rejected with `429` once bucket capacity drained |
| **Login** | 100% check pass rate |
| **Signup** | 100% check pass rate |
| **`/me` (JWT Verification)** | 100% check pass rate |
| **Token Refresh** | 100% check pass rate |

### Main Showcase

| | |
| :---: | :---: |
| ![Image 1](<!-- PASTE_IMAGE_1_URL_HERE -->) | ![Image 2](<!-- PASTE_IMAGE_2_URL_HERE -->) |
| ![Image 3](<!-- PASTE_IMAGE_3_URL_HERE -->) | ![Image 4](<!-- PASTE_IMAGE_4_URL_HERE -->) |
| ![Image 5](<!-- PASTE_IMAGE_5_URL_HERE -->) | ![Image 6](<!-- PASTE_IMAGE_6_URL_HERE -->) |

---

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- k6 (optional, for running load tests)

### 1. Start Backend Stack (Spring Boot, PostgreSQL, Redis)
```bash
git clone https://github.com/sandinacharles1/sandinify.git
cd sandinify/backend
docker compose up --build
```
*The multi-stage Dockerfile compiles the application and bundles the OpenTelemetry Java Agent. Secrets are injected strictly via environment variables.*

### 2. Run Backend Tests
```bash
cd backend
./mvnw test
```

### 3. Run Frontend Client
```bash
cd frontend
npm ci
npm run dev
```

### 4. Execute Load Tests
```bash
cd backend
k6 run loadtest.js
```

---

## Multi-Instance Kubernetes Deployment & Benchmarks
To validate horizontal scaling, distributed rate-limit consistency, and connection pool contention under load, Sandinify was deployed onto a multi-replica local Kubernetes cluster using **`kind`** and an **F5 NGINX Ingress Controller**.

### Request Flow Architecture
```text
k6 / Browser (localhost:8081)
       │
       ▼
kind Node Port Mapping (Host 8081 ──▶ Node 80)
       │
       ▼
F5 NGINX Ingress Controller (Routes /api for host: localhost)
       │
       ▼
sandinify ClusterIP Service
       │
       ├──▶ App Pod 1 ──┐
       │                ├──▶ Redis (Shared Rate-Limit Buckets & Job Queue)
       └──▶ App Pod 2 ──┼──▶ PostgreSQL 16 (PersistentVolumeClaim)
                        └──▶ Jaeger v2.23.0 (OTLP HTTP Traces)
```

### Infrastructure & Deployment Architecture
* **Multi-Stage Containerization:** Built a two-stage `Dockerfile` (Maven + Java 25 builder stage → slim JRE runtime stage) with `.dockerignore` excluding build artifacts and local secrets. Externalized `SPRING_DATASOURCE_URL`, `SPRING_DATA_REDIS_HOST`, and `app.cors.allowed-origin` for environment portability.
* **Cluster & Ingress Configuration (`k8s/kind-config.yaml`):** Configured an `ingress-ready=true` control-plane node mapping host port `8081` to container port `80`, routing `/api` traffic through F5 NGINX Ingress to the internal `sandinify` Service.
* **Workload Orchestration & Scoped Secrets (`k8s/kind-workloads.yaml`, `k8s/apply-kind.ps1`):** Deployed PostgreSQL (backed by a `1Gi` `PersistentVolumeClaim`), Redis, Jaeger v2.23.0, and multi-replica backend Pods configured with liveness/readiness probes and dependency `initContainers`. Automated secret injection via PowerShell, isolating database credentials (`sandinify-db-secrets`) from application/AWS keys (`sandinify-app-secrets`) under least-privilege scoping.

### Database Connection Pooling & Concurrency (HikariCP)
Sandinify manages PostgreSQL connections via **HikariCP** (default pool size: 10 per instance):
* **Connection Reuse:** Pre-warms persistent TCP connections at startup, eliminating per-request TCP handshake and PostgreSQL authentication overhead.
* **Process-Per-Connection Contention:** Because PostgreSQL forks a dedicated OS process per connection, scaling to 3 replicas (`3 pods × 10 connections = 30 active connections`) on a single physical host causes OS scheduler context switching across shared CPU cores—directly impacting `p95` tail latency during CPU-bound workloads.

### Multi-Pod Load-Testing Benchmarks

#### 1. Cold-Start Contention vs. Tuned Steady-State (3 Replicas)
Initial multi-pod benchmarks exposed severe `p95` latency spikes (17.5s) caused by simultaneous JVM JIT compilation and connection pool saturation. Allowing pod warm-up and stabilizing arrival rates eliminated request drops:

| Metric | Initial 3-Pod Run (Cold / Contended) | Tuned 3-Pod Run (Steady State) | Improvement |
| :--- | :--- | :--- | :--- |
| **Target / Achieved RPS** | 40 RPS target → 26.6 RPS | 80 RPS target → 79.6 RPS | **3.0x sustained throughput** |
| **Dropped Iterations** | 82 dropped (VU starvation) | **0 dropped** | **100% reduction in drops** |
| **Median Latency (p50)** | 36.18 ms | **28.76 ms** | **-20.5% faster median** |
| **Tail Latency (p95)** | 17,498.26 ms (~17.5s stall) | **52.27 ms** | **-99.7% reduction in p95** |
| **Max Latency** | 19,614.93 ms | **182.38 ms** | **-99.1% reduction in max** |
| **HTTP Check Pass Rate** | 100% (of completed) | **100% (2,402 / 2,402)** | Zero functional errors |

#### 2. Topology Trade-Off: 1 Pod vs. 3 Pods at 80 RPS

| Metric | 1 Pod (`one-pod-80rps`) | 3 Pods (`three-pod-80rps`) | Delta (3 Pods vs. 1 Pod) |
| :--- | :--- | :--- | :--- |
| **Achieved Throughput** | 79.92 RPS (2,404 reqs) | 79.56 RPS (2,403 reqs) | -0.45% (Equivalent) |
| **Error Rate** | 0.0% | 0.0% | Identical (100% reliable) |
| **Median Latency (p50)** | 28.45 ms | 28.76 ms | +0.31 ms (+1.1%) |
| **Tail Latency (p95)** | 40.01 ms | 52.27 ms | +12.26 ms (+30.6%) |
| **Max Latency** | 58.42 ms | 182.38 ms | +123.96 ms (CPU context switching) |

* **Architectural Analysis:** On a single physical machine, 1 pod achieves tighter tail latency (40.01 ms vs. 52.27 ms `p95`) and higher peak throughput (159.5 RPS) because adding replicas multiplies JVM memory overhead and CPU context switching without adding hardware compute. However, the 3-pod topology validates **zero-downtime high availability** and proves that stateless JWT verification and atomic Redis rate limiting remain consistent across horizontally scaled nodes.

#### 3. Complete k6 Benchmark Matrix

| Topology | Test Profile | Achieved RPS | Total Requests | Error Rate | Median (p50) | Tail (p95) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1 Pod** | Steady Load (60 RPS) | 59.9 RPS | 1,803 | 0.0% | 28.55 ms | 46.65 ms |
| **1 Pod** | Steady Load (80 RPS) | 79.9 RPS | 2,404 | 0.0% | 28.45 ms | 40.01 ms |
| **1 Pod** | Peak Load (160 RPS) | 159.5 RPS | 4,805 | 0.0% | 31.53 ms | 74.16 ms |
| **3 Pods** | Steady Load (60 RPS) | 56.3 RPS | 1,804 | 0.0% | 28.91 ms | 50.01 ms |
| **3 Pods** | Steady Load (80 RPS) | 79.6 RPS | 2,403 | 0.0% | 28.76 ms | 52.27 ms |
| **1 vs. 3 Pods** | Rate Limiter Burst | 45.1 / 57.5 RPS | 302 each | 99.7% (`429`) | 4.45 / 4.74 ms | 8.64 / 572.86 ms |

### Distributed Tracing & Bottleneck Isolation (OpenTelemetry)
Grouping Jaeger traces by the `k8s.pod.name` resource attribute confirmed even Ingress load distribution across all 3 pod replicas. Inspecting parent-child trace spans (`302.7 ms` average across `/api/login`) isolated exact latency contributors:

| Execution Layer | `/api/login` Span | Avg Time (% Req) | `/api/signup` Span | Avg Time (% Req) |
| :--- | :--- | :--- | :--- | :--- |
| **Argon2 Cryptography** | `argon2.verify` | **236.0 ms (81.9%)** | `argon2.hash` | **140.7 ms (73.1%)** |
| **User Lookup** | `findByUsername` (`SELECT`) | 27.9 ms (5.9%) | Username-exists (`SELECT`) | 44.7 ms (7.6%) |
| **User Persistence** | — | — | Save new user (`INSERT`) | 13.8 ms (4.5%) |
| **Refresh Token DB I/O** | Create & save token | 14.4 ms (4.8%) | Create & save token | 8.1 ms (4.2%) |
| **Rate Limiter (Redis)** | `tryTake` + Redis Lua | 3.0 ms (1.8%) | Rate limiter + Redis Lua | 10.9 ms (2.9%) |
| **JWT Signing** | JWT creation | 2.7 ms (0.7%) | JWT creation | 1.8 ms (0.4%) |
| **Framework Overhead** | Spring / HTTP serialization | — (4.9%) | Spring / HTTP serialization | — (7.2%) |

* **Key Findings:** Memory-hard Argon2 cryptography accounts for **73%–82%** of total authentication latency by design, making auth endpoints strictly CPU-bound. Database I/O accounts for **10.7%–16.3%**, while distributed Redis rate limiting and JWT signing add **< 3.5%** combined overhead.

### Production Readiness Post-Mortems

| Issue | Root Cause | Resolution |
| :--- | :--- | :--- |
| **Multi-replica schema race condition** | Concurrent Pods booting with `ddl-auto=update` issued simultaneous `CREATE TABLE` statements against an empty database. | Migrated to **Flyway** (`V1__create_initial_schema.sql`) leveraging PostgreSQL advisory locks to serialize schema migrations; set Hibernate to `validate`. |
| **Flyway silent migration skip** | Raw `org.flywaydb` dependencies did not trigger Spring Boot 4 auto-configuration. | Replaced with `spring-boot-starter-flyway` + `flyway-database-postgresql` and verified `flyway_schema_history`. |
| **Stale image tags on rollout** | Reloading `:kind` images without changing Deployment manifest specs skipped Pod recreation. | Enforced `kubectl rollout restart deployment/sandinify` post-load to pull updated image digests. |
| **PostgreSQL PVC password desync** | Official Postgres images ignore `POSTGRES_PASSWORD` when mounting pre-initialized data volumes. | Updated `apply-kind.ps1` to execute `ALTER ROLE postgres WITH PASSWORD` over the container's local Unix socket without wiping volume data. |
| **NGINX Ingress CRD & routing failures** | F5 NGINX Ingress v5.7.1 failed readiness due to missing CRDs and rejected wildcard hosts. | Pinned `crds.yaml` in `install-kind-ingress.ps1` and bound Ingress rules explicitly to `host: localhost`. |
| **Jaeger v1 deprecation** | `jaegertracing/all-in-one:1.76.0` logged EOL warnings. | Upgraded to Jaeger v2.23.0 (`cr.jaegertracing.io/jaegertracing/jaeger:2.23.0`) and verified OTLP HTTP ingestion. |

---

## Song Upload System Design

### Current Upload Design
![Song Upload Architecture (1)](<!-- PASTE_UPLOAD_ARCH_1_URL_HERE -->)

### Extra Upload Design
![Song Upload Architecture (2)](<!-- PASTE_UPLOAD_ARCH_2_URL_HERE -->)

### Feature Extraction Design
![Song Upload Architecture](<!-- PASTE_FEATURE_EXTRACTION_URL_HERE -->)

*(Note: Audio frequency feature extraction training scripts in `song_upload/audio_analysis/` are currently decoupled from the live upload runtime.)*

### Data Model & Storage Layout
PostgreSQL serves as the single source of truth for track lifecycle state (`songs` table), while AWS S3 stores binary assets and Redis manages job queues.

| Column | Role |
| :--- | :--- |
| `id` | Primary key and S3 object prefix namespace |
| `title`, `artist_name` | Track display metadata |
| `genre`, `mood`, `tags`, `description` | Catalog attributes |
| `s3_key` | Source object key (`raw/{id}/original.mp3`) for worker ingestion and re-transcoding |
| `manifest_url` | Entry HLS master playlist path (`/api/songs/{id}/hls/master.m3u8`), `NULL` until `READY` |
| `status` | Lifecycle state machine: `PENDING` → `PROCESSING` → `READY` or `FAILED` |
| `failure_reason` | Truncated stack trace / stderr (first 500 chars) on worker failure |

**S3 Key Hierarchy (Private Bucket):**
```text
raw/{id}/original.mp3                   # Immutable source upload
processed/{id}/master.m3u8              # Adaptive bitrate master playlist
processed/{id}/96k/index.m3u8           # Variant media playlist
processed/{id}/96k/chunk_000.ts ...     # 4-second independent MPEG-TS segments
processed/{id}/160k/...
processed/{id}/320k/...
```

**Redis Queue Topology:**

| Redis List Key | Purpose |
| :--- | :--- |
| `queue:song-analysis` | Primary FIFO ingestion queue (`{"song_id": 2, "s3_key": "raw/2/original.mp3"}`) |
| `queue:song-analysis:processing` | In-flight lease list for crash recovery |
| `queue:song-analysis:dead` | Dead-letter queue (DLQ) isolating malformed payloads |

### Asynchronous Upload Flow
```text
Browser ──▶ Spring Boot API ──▶ (1) Insert DB Row (PENDING) ──▶ (2) Upload Raw File to S3
                            ──▶ (3) LPUSH Job to Redis ──────▶ (4) Return 201 Accepted
                                                                      │
                                      Python Worker ◀── BRPOPLPUSH ───┘
                                           │
                                           ▼
                                  FFmpeg Transcode ──▶ Upload HLS to S3 ──▶ Mark READY
```

1. **Request Validation (`SongUploadController`):** Validates multipart payload constraints (non-empty binary file, bounded string lengths), returning `400` on invalid input.
2. **Two-Phase DB & S3 Persistence (`S3StorageService`):** Inserts the `songs` row first with a temporary UUID key to generate the authoritative numeric `id`, uploads to `raw/{id}/original.ext`, and updates `s3_key`. Compensating rollback deletes the DB record if the S3 upload fails, preventing orphaned metadata.
3. **Non-Blocking Queue Handoff (`AnalysisQueue`):** Publishes the job JSON to `queue:song-analysis` and returns `201` immediately so heavy transcoding never blocks servlet threads. If Redis is unavailable, returns `503` while preserving the S3 object and `PENDING` row.
4. **Schema Evolution:** Managed incrementally via Flyway migrations (`V2__add_manifest_url_to_songs.sql`, `V3__add_description.sql`).

### Background Transcoding Worker (Python + FFmpeg)
Executed as an independent Kubernetes Deployment (`backend/transcoding_worker/main.py`) to isolate CPU-intensive FFmpeg processes from the JVM API:
* **Adaptive Tier Selection (`get_source_bitrate_kbps`, `select_tiers`):** Probes source audio via `ffprobe` and generates only bitrate tiers at or below the source bitrate (`96k`, `160k`, `320k`, minimum `96k`), preventing upsampling bloat.
* **Segmented HLS Encoding (`transcode`):** Invokes `ffmpeg` (`libmp3lame`, `44.1 kHz`, `-hls_time 4`, `-hls_playlist_type vod`, `independent_segments`) and generates `master.m3u8` with accurate `BANDWIDTH` and `CODECS` (`mp4a.40.34`) declarations.
* **At-Least-Once Reliability & Crash Recovery:**
  * Consumes jobs atomically using `BRPOPLPUSH` from `queue:song-analysis` to `queue:song-analysis:processing`, removing the item via `LREM` only after S3 upload and DB state transition succeed.
  * On startup, `recover_in_flight_jobs` flushes any orphaned jobs from `:processing` back to the main queue.
  * Idempotency guard (`set_processing`) skips tracks already marked `READY`. Malformed JSON payloads are routed to `queue:song-analysis:dead`.

### Upload Verification, Post-Mortems & Known Limitations
* **Test Coverage:** `SongRepositoryTest` verifies Flyway schema mapping against PostgreSQL; `SongUploadControllerTest` and `AnalysisQueueTest` validate compensating rollbacks and queue serialization; `test_main.py` (10 Python unit tests) validates tier selection, playlist generation, and Redis queue acknowledgments.
* **Key Post-Mortems:**
  * *Invalid Redis Command in Recovery:* Startup recovery initially issued `RPOPRPUSH` instead of `RPOPLPUSH`, causing a crash loop masked by unit test mocks. Resolved by fixing the command and asserting exact Redis command signatures in tests.
  * *S3 Bucket ACL Rejection:* Removed `ACL=public-read` from worker `put_object` calls after S3 `bucket-owner-enforced` policies rejected ACL headers.
* **Known Limitations:**
  * Row state transition from `PENDING` to `PROCESSING` is not guarded by `SELECT ... FOR UPDATE`; horizontal worker scaling requires atomic row claiming or distributed locks.
  * `subprocess.run` lacks a hard FFmpeg execution timeout, and no background sweeper exists yet to re-queue stale `PENDING`/`PROCESSING` rows.

---

## Song Retrieval System Design
`Homepage.jsx` queries `GET /api/songs` (authenticated via JWT), returning catalog metadata ordered newest-first (`findAllByOrderByCreatedAtDesc()`).
* **Control-Plane / Data-Plane Separation:** Separating lightweight JSON metadata retrieval (`GET /api/songs`) from heavy binary streaming (`GET /api/songs/{id}/hls/{*path}`) ensures instant catalog rendering while deferring audio bandwidth until playback starts. Internal storage keys (`s3_key`) and stack traces (`failure_reason`) are stripped from API responses.
* **Post-Mortems & Limitations:** Resolved stale Kubernetes pod deployments during development via explicit `kind load docker-image` + rollout restarts, and persisted session state across browser reloads via `/api/me` validation. Current retrieval lacks cursor/offset pagination and uploader ownership filtering.

---

## Song Fetching & Adaptive HLS Streaming Design

![Song Upload Architecture (3)](<!-- PASTE_UPLOAD_ARCH_3_URL_HERE -->)

### Authenticated HLS Byte Proxy (`GET /api/songs/{songId}/hls/{*assetPath}`)
* **Zero-Exposure S3 Proxy:** Rather than exposing a public S3 bucket or managing presigned URL expiration across multi-chunk playlists, Spring Boot authenticates the JWT and streams bytes directly from private S3 via `StreamingResponseBody`—preventing heap buffering of audio segments.
* **Path Traversal Hardening:** Enforces a strict allowlist regex (`master.m3u8` or `(96k|160k|320k)/(index.m3u8|chunk_<digits>.ts)`), rejecting malformed or traversal paths with `400 Bad Request`. Because HLS playlists use relative paths, `hls.js` resolves variant playlists and chunks seamlessly through the same authenticated route.

### Client-Side Throughput & Buffer Adaptation (`AdaptivePlayer.jsx`, `adaptivePlayback.js`)
* **Media Source Extensions (MSE):** Uses `hls.js` with custom `xhrSetup` header injection to attach Bearer JWTs to every playlist and `.ts` segment request (falling back to native HLS on Safari).
* **EWMA Bandwidth Estimation:** Initializes bitrate selection from `localStorage` throughput history (keyed by network class) or `navigator.connection` hints, applying a `0.8x` safety factor. After each `FRAG_BUFFERED` event, measured throughput is smoothed via an Exponentially Weighted Moving Average:
  ```text
  throughput_ewma = 0.3 * sample_bps + 0.7 * previous_ewma
  ```
* **Buffer Watermark Hysteresis:** Prevents stall events and quality oscillation (`maxBufferLength: 24s`, `backBufferLength: 0s`):

| Buffered Ahead | Action |
| :--- | :--- |
| **`≥ 20s`** | Calls `stopLoad()` to cap buffer at the 24s watermark (20s + one 4s chunk) |
| **`< 8s`** | Locks `autoLevelCapping` to lowest tier (`96k`) and resumes loading for rapid recovery |
| **`≥ 16s`** | Restores throughput-based quality ceiling and resumes normal adaptive switching |
| **`8s – 16s`** | Holds current ceiling (hysteresis band preventing rapid bitrate thrashing) |

* **Verification & Limitations:** Unit-tested via `node:test` (`adaptivePlayback.test.js`, 5 tests covering EWMA math, `0.8x` headroom selection, and network-key isolation). At production scale, routing chunks through a CDN with signed cookies/URLs would eliminate Java proxy hop latency.

---

## Roadmap
- **Audio Frequency Feature Extraction:** Integrate DSP spectral analysis pipeline (`song_upload/audio_analysis/`) into the transcoding worker to generate audio embeddings.
- **Semantic Book Matching:** Vector similarity search mapping track frequency/mood embeddings to thematic book recommendations.
- **Trending & Analytics:** Real-time playback tracking and top-tracks aggregation.
- **In-Browser DSP Editor:** Client-side Web Audio API track trimming and EQ manipulation.
- **Spotify Web Playback SDK Integration:** Fallback streaming for external catalog tracks.

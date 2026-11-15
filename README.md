# Adaptive API Gateway with Dynamic Rate Limiting

> M.Tech Dissertation Project — Shahid Razak Nadaf (2024TM93664)  
> BITS Pilani WILP | Software Engineering

An intelligent API Gateway that dynamically adjusts rate limits based on real-time backend health metrics. Fully containerised with Docker, deployable on Kubernetes, and automated through a Jenkins CI/CD pipeline.

---

## Project Overview

This project implements an **adaptive rate-limiting mechanism** for microservice architectures. Unlike traditional fixed-limit gateways, this system continuously monitors backend metrics (latency, error rate) and automatically adjusts rate limits to:

- Protect degraded services by reducing traffic when backends slow down
- Maximise throughput by increasing limits when backends are healthy
- Improve fairness by allocating capacity dynamically across clients

### Key Features

- **Three Rate Limiting Algorithms** — Fixed Window, Token Bucket, Adaptive (research contribution)
- **Real-time Metrics** — p50/p95/p99 latency, error rates, throughput per route
- **Adaptive Controller** — adjusts limits every 5 seconds based on backend health signals
- **System Resource Monitoring** — live CPU, memory, and disk usage with threshold alerts
- **Structured Log Feed** — gateway events (requests, 429s, adaptive adjustments) streamed to dashboard
- **Interactive Dashboard** — donut charts, mouse-over tooltips, area-fill time-series charts, live log panel
- **Containerised** — Dockerfiles for all 5 services; single-command startup with Docker Compose
- **Kubernetes-ready** — manifests for all services with probes, resource limits, and HPA
- **CI/CD Pipeline** — Jenkins Declarative Pipeline covering build → image → deploy

---

## Project Structure

```
Project/
├── gateway/                        # Node.js API Gateway (port 3000)
│   ├── src/
│   │   ├── config/routes.js        # Per-route config (env-var driven targets)
│   │   ├── metrics/
│   │   │   ├── collector.js        # MetricsCollector — public API
│   │   │   ├── store.js            # In-memory rolling window + log buffer
│   │   │   └── systemMonitor.js    # CPU / memory / disk poller
│   │   ├── middleware/rateLimiter/ # Fixed Window, Token Bucket, Adaptive
│   │   ├── proxy/handler.js        # Proxy with latency recording
│   │   └── routes/
│   │       ├── health.js           # GET /health
│   │       └── metrics.js          # GET /metrics, /metrics/system, /metrics/logs
│   └── Dockerfile
│
├── mock-services/
│   ├── steady/        (port 3001)  # Healthy — 50-100ms, <1% errors
│   ├── slow/          (port 3002)  # Degraded — 500-2000ms, ~10% errors
│   └── burst-target/  (port 3003)  # Capacity-limited — degrades at 50 concurrent
│
├── dashboard/                      # React + Vite monitoring UI (port 5173 / 80)
│   ├── src/
│   │   ├── components/
│   │   │   ├── MetricsChart.jsx        # Area + line chart with tooltip & brush
│   │   │   ├── RateLimitPanel.jsx      # Per-route rate limit status
│   │   │   ├── ServiceHealthGrid.jsx   # Per-route health cards
│   │   │   ├── LatencyPercentiles.jsx  # p50/p95/p99 bar chart
│   │   │   ├── SystemResources.jsx     # CPU/Memory/Disk donut charts
│   │   │   └── SystemLogs.jsx          # Live structured log feed
│   │   ├── services/api.js             # fetchMetrics, fetchSystemMetrics, fetchLogs
│   │   └── App.jsx
│   ├── nginx.conf                  # SPA nginx config (used in container)
│   └── Dockerfile                  # Two-stage: Vite build → nginx:alpine
│
├── load-tests/                     # k6 load testing scripts
│   ├── steady-load.js
│   ├── burst-load.js
│   └── slow-backend.js
│
├── k8s/                            # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── gateway/
│   ├── mock-services/
│   ├── dashboard/
│   └── hpa.yaml                    # HPA: gateway scales 2–5 replicas at 70% CPU
│
├── docker-compose.yml              # Multi-service orchestration
├── .env.example                    # Port / URL overrides
├── Jenkinsfile                     # CI/CD pipeline (5 stages)
└── README.md
```

---

## Prerequisites

| Tool | Purpose | Install |
|------|---------|---------|
| Node.js 20.x | Run services locally | [nodejs.org](https://nodejs.org) |
| Docker Desktop | Build and run containers | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| k6 | Load testing | `brew install k6` |
| Minikube | Local Kubernetes cluster | `brew install minikube` |
| kubectl | Kubernetes CLI | `brew install kubectl` |

> **Docker Desktop** includes both the Docker engine and `docker compose` — no extra installs needed. It is free for personal and educational use.

> **Enterprise note:** For production deployment in a commercial organisation, [Podman](https://podman.io) is the recommended free alternative. It is fully Docker-compatible — all Dockerfiles and `docker-compose.yml` in this project work with Podman without any changes.

---

## Option A — Run Locally (no containers)

Fastest for development and the algorithm demo.

```bash
# 1. Install all dependencies
cd gateway                    && npm install && cd ..
cd mock-services/steady       && npm install && cd ../..
cd mock-services/slow         && npm install && cd ../..
cd mock-services/burst-target && npm install && cd ../..
cd dashboard                  && npm install && cd ..

# 2. Start services — open 5 separate terminal tabs
cd mock-services/steady       && npm start    # Terminal 1 — port 3001
cd mock-services/slow         && npm start    # Terminal 2 — port 3002
cd mock-services/burst-target && npm start    # Terminal 3 — port 3003
cd gateway                    && npm start    # Terminal 4 — port 3000
cd dashboard                  && npm run dev  # Terminal 5 — port 5173
```

Open `http://localhost:5173`

---

## Option B — Run with Docker Compose

Single command to build images and start all 5 services as containers.

```bash
# Make sure Docker Desktop is running (whale icon in menu bar)

# Copy env template (optional — defaults work out of the box)
cp .env.example .env

# Build images and start all 5 services
docker compose up --build

# Run in background (detached)
docker compose up --build -d

# View logs
docker compose logs -f

# Stop everything
docker compose down
```

Dashboard: `http://localhost:5173`  
Gateway API: `http://localhost:3000`

---

## Option C — Deploy to Kubernetes (Minikube)

Demonstrates scalability and resilience — recommended for the final viva demo.

```bash
# 1. Make sure Docker Desktop is running

# 2. Start Minikube
minikube start

# 3. Point your shell at Minikube's internal Docker daemon
#    Images built here are directly available to Kubernetes — no push needed
eval $(minikube docker-env)

# 4. Build all images inside Minikube
docker build -t adaptive-gateway:latest         ./gateway
docker build -t steady-service:latest           ./mock-services/steady
docker build -t slow-service:latest             ./mock-services/slow
docker build -t burst-target-service:latest     ./mock-services/burst-target
docker build -t adaptive-dashboard:latest       ./dashboard

# 5. Deploy everything to the cluster
kubectl apply -f k8s/

# 6. Wait for pods to be ready
kubectl get pods -n adaptive-gateway -w

# 7. Open the dashboard in your browser
minikube service dashboard-svc -n adaptive-gateway

# 8. (Optional) Enable HPA — scales gateway from 2 to 5 replicas under load
minikube addons enable metrics-server
kubectl get hpa -n adaptive-gateway

# Teardown — clean slate for next demo run
kubectl delete namespace adaptive-gateway
```

---

## Option D — Jenkins CI/CD Pipeline

Automates the full build → image → deploy cycle.

```bash
# Run Jenkins as a Docker container
docker run -d -p 8080:8080 --name jenkins \
  -v jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts

# Open Jenkins at http://localhost:8080
# Create a new Pipeline job and point it to this repo's Jenkinsfile
```

**Pipeline stages:**

| Stage | What happens |
|-------|-------------|
| Checkout | `git clone` |
| Install | `npm ci` for gateway + dashboard (runs in parallel) |
| Build Images | `docker build` for all 5 services |
| Push Images | `docker push` to registry (set `SKIP_PUSH=true` to skip for local demos) |
| Deploy to K8s | `kubectl apply -f k8s/` + waits for rollout to complete |

**Parameters available in the Jenkins UI:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `REGISTRY` | `localhost:5000` | Container registry prefix |
| `IMAGE_TAG` | Build number | Tag applied to all images |
| `SKIP_PUSH` | `true` | Skip the push step (useful for local demos) |
| `DEPLOY_ENV` | `dev` | Target environment label |

---

## Key Endpoints

### Gateway (port 3000)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Gateway health + uptime |
| `GET /metrics` | All route metrics + rate limit status |
| `GET /metrics/system` | CPU, memory, disk usage + thresholds |
| `GET /metrics/logs` | Last 200 structured log entries |
| `GET /api/users` | Proxy → steady service |
| `GET /api/orders` | Proxy → slow service |
| `GET /api/products` | Proxy → burst-target service |

### Backend Services

| Service | Port | Latency | Error Rate |
|---------|------|---------|------------|
| Steady | 3001 | 50–100ms | < 1% |
| Slow | 3002 | 500–2000ms | ~10% |
| Burst-target | 3003 | 50–500ms* | ~3% + overload |

*Latency increases with concurrent load

---

## Dashboard Panels

| Panel | Description |
|-------|-------------|
| Stats bar | Total requests, errors, error rate, active routes |
| Rate Limits | Current req/s per route, algorithm, recent adaptive adjustments |
| Service Health | p50/p95/p99 latency + error rate per route, colour-coded by status |
| Latency Percentiles | Grouped bar chart comparing p50/p95/p99 across routes |
| Throughput chart | Area + line chart with mouse-over tooltip + zoom brush |
| p95 Latency chart | Time-series of p95 latency per route |
| Error Rate chart | Time-series of error % per route |
| System Resources | CPU / Memory / Disk donut charts with threshold alerts |
| System Logs | Live scrollable feed of INFO / WARN / ERROR events |

---

## Load Tests

```bash
cd load-tests

# Steady load — baseline fairness test
k6 run steady-load.js

# Burst traffic — tests Token Bucket / Adaptive burst handling
k6 run burst-load.js

# Slow backend — main adaptive protection scenario
k6 run slow-backend.js
```

Results are saved to `load-tests/results/`.

---

## Switching Rate Limiting Algorithm

Edit `gateway/src/config/routes.js`:

```javascript
algorithm: 'adaptive'   // 'fixed' | 'token' | 'adaptive'
```

Restart the gateway. No other changes needed.

---

## Environment Variables

| Variable | Default (local) | Docker Compose / K8s value |
|----------|----------------|---------------------------|
| `PORT` | `3000` | `3000` |
| `STEADY_URL` | `http://localhost:3001` | `http://steady:3001` |
| `SLOW_URL` | `http://localhost:3002` | `http://slow:3002` |
| `BURST_URL` | `http://localhost:3003` | `http://burst-target:3003` |
| `VITE_GATEWAY_URL` | `http://localhost:3000` | set at image build time via `--build-arg` |

---

## Architecture

```
              ┌──────────────────────────────┐
              │   k6 Load Generator          │
              └──────────────┬───────────────┘
                             │
                             ▼
              ┌──────────────────────────────────────┐
              │        API Gateway  (port 3000)       │
              │                                       │
              │  ┌─────────────────────────────────┐  │
              │  │ Rate Limiter                    │  │
              │  │  Fixed Window / Token Bucket /  │  │
              │  │  Adaptive ◄── MetricsStore      │  │
              │  └─────────────────────────────────┘  │
              │  ┌─────────────────────────────────┐  │
              │  │ Proxy Handler + Metrics Collector│  │
              │  └─────────────────────────────────┘  │
              │  ┌─────────────────────────────────┐  │
              │  │ SystemResourceMonitor           │  │
              │  │ (CPU / Memory / Disk)           │  │
              │  └─────────────────────────────────┘  │
              └──────┬──────────────┬────────┬────────┘
                     │              │        │
                     ▼              ▼        ▼
           ┌──────────────┐  ┌──────────┐  ┌──────────────┐
           │ Steady :3001 │  │ Slow:3002│  │ Burst : 3003 │
           └──────────────┘  └──────────┘  └──────────────┘
                     ▲              ▲        ▲
                     └──────────────┴────────┘
                                    │
                         ┌──────────┴──────────┐
                         │  Dashboard  :5173    │
                         │  (polls every 2–5s)  │
                         └─────────────────────┘
```

---

## Troubleshooting

**Docker daemon not running**  
Open Docker Desktop and wait for the whale icon to appear in the menu bar before running any `docker` commands.

**Gateway won't start**
```bash
lsof -i :3000       # find what's using port 3000
kill -9 <PID>
cd gateway && rm -rf node_modules && npm install
```

**Dashboard shows "Disconnected"**
1. Verify gateway is running: `curl http://localhost:3000/health`
2. Check the browser console for CORS errors
3. If running via Docker Compose, confirm `VITE_GATEWAY_URL=http://localhost:3000` in `.env`

**Kubernetes pods stuck in Pending**
```bash
kubectl describe pod -n adaptive-gateway   # check the Events section at the bottom
minikube addons enable metrics-server      # required for HPA to work
```

**Minikube images not found (ErrImageNeverPull)**  
You need to build images inside the Minikube daemon. Re-run `eval $(minikube docker-env)` in your current terminal, then rebuild.

**k6 tests fail**
```bash
k6 version                          # confirm k6 is installed
curl http://localhost:3000/health   # confirm gateway is running
```

---

## Dissertation Context

**Title:** Design and Implementation of an Adaptive API Gateway with Dynamic Rate Limiting for Microservice Architectures

**Research Question:** Can an API gateway that dynamically adjusts rate limits based on live backend health signals outperform a static rate limiter in throughput, latency, error rate, and fairness?

**Evaluation Matrix:** 3 algorithms × 3 scenarios × ≥5 runs each, with paired t-test / Mann-Whitney U statistical testing.

---

## Author

**Shahid Razak Nadaf** | 2024TM93664 | M.Tech Software Engineering | BITS Pilani WILP  
Supervisor: Danish Malik Nadaf | Organisation: TCS, Pune

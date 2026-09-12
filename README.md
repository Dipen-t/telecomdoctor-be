# Amrutam Telemedicine Backend

A production-grade, highly concurrent backend for a telemedicine consultation platform. Built with **Node.js**, **Fastify**, **Prisma (PostgreSQL)**, and **Redis**.

## 📦 Tech Stack

| Layer             | Technology                          |
| ----------------- | ----------------------------------- |
| Runtime           | Node.js + TypeScript                |
| Framework         | Fastify                             |
| Database          | PostgreSQL (via Prisma ORM)         |
| Cache / Rate Limit| Redis (ioredis)                     |
| Auth              | JWT + Argon2id + MFA                |
| Validation        | Zod                                 |
| Testing           | Vitest                              |
| CI/CD             | GitHub Actions                      |
| Container         | Docker (multi-stage, non-root)      |
| Observability     | Pino (structured logs) + Prometheus |

## 🚀 Quick Start

### Option 1: Docker (recommended)

```bash
cp .env.example .env
docker compose up --build
```

This boots PostgreSQL, Redis, and the API. Migrations run automatically on container startup.

### Option 2: Local Development

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

**Prerequisites:** PostgreSQL running on port `5433`, Redis on port `6380`.

## 🔗 Key URLs

| URL                              | Description                  |
| -------------------------------- | ---------------------------- |
| `http://localhost:3000/docs`     | OpenAPI / Swagger UI         |
| `http://localhost:3000/metrics`  | Prometheus metrics           |
| `http://localhost:3000/health`   | Health check                 |

## 🧪 Testing

```bash
npm run test           # Interactive watch mode
npm run test:run       # Single run (CI)
npm run lint           # ESLint
npm run typecheck      # TypeScript strict check
npm run build          # Production build
```

### Test Coverage

| Test Suite             | What It Proves                                                    |
| ---------------------- | ----------------------------------------------------------------- |
| `auth.test.ts`         | Registration, login, JWT issuance                                 |
| `bookings.test.ts`     | Booking creation, slot locking, idempotency                       |
| `stress.test.ts`       | 100 concurrent bookings → 1 success, 99 conflicts                |
| `security.test.ts`     | IDOR, RBAC bypass, privilege escalation, mass assignment          |
| `payments.test.ts`     | Payment creation, webhook processing                              |
| `prescriptions.test.ts`| Prescription creation with ownership validation                   |
| `worker-concurrency.test.ts` | Outbox worker atomic claiming via SKIP LOCKED              |
| `admin.test.ts`        | Analytics endpoint RBAC                                           |

## 🏗️ Key Engineering Decisions

### 1. Booking Concurrency (No Double-Booking)
PostgreSQL `SELECT ... FOR UPDATE` row-level lock inside an interactive transaction. 100 concurrent requests → exactly 1 success, 99 receive `409 Conflict`. Additionally, `Consultation.slotId` has a `@unique` database constraint as defense-in-depth.

### 2. Write Idempotency
All critical write endpoints require an `Idempotency-Key` header. The request body is SHA-256 hashed. Replaying the same key returns the cached response. Sending a different body with the same key returns `400 IDEMPOTENCY_MISMATCH`.

### 3. Transactional Outbox
Instead of calling external services (email, notifications) during the HTTP request, we write an `OutboxEvent` inside the same database transaction. A background worker polls with `SELECT ... FOR UPDATE SKIP LOCKED` and uses a `PENDING → PROCESSING → PROCESSED` state machine. Stale `PROCESSING` events (>5 min) are automatically swept for retry.

### 4. Fail-Fast Secrets
The server refuses to start if `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `DATABASE_URL`, or `REDIS_URL` are missing. No insecure fallback defaults.

### 5. Resilient Rate Limiting
Redis-backed rate limiting with fail-open degradation. If Redis is unavailable, the core PostgreSQL booking system remains fully operational.

### 6. Defense-in-Depth Security
- `@fastify/helmet` for security headers (HSTS, CSP, X-Content-Type-Options)
- Environment-driven CORS via `CORS_ORIGIN`
- RBAC middleware + resource ownership checks in business logic
- Adversarially tested against IDOR, privilege escalation, cross-resource access, and mass assignment

## 📁 Project Structure

```
src/
├── app/                  # Server bootstrap, config, env validation
├── modules/
│   ├── auth/             # Registration, login, MFA, JWT
│   ├── users/            # Profile management
│   ├── doctors/          # Doctor CRUD, search, filtering
│   ├── availability/     # Slot management, state machine
│   ├── bookings/         # Concurrent booking, idempotency
│   ├── prescriptions/    # Prescription CRUD with ownership
│   ├── payments/         # Payment initiation, webhook
│   ├── admin/            # Platform analytics
│   └── webhooks/         # LiveKit, payment gateway
├── middleware/            # Auth, RBAC, rate limit, idempotency, error handler
├── security/             # Password hashing, JWT, MFA
├── infrastructure/       # Prisma client, Redis client
├── workers/              # Outbox background worker
└── tests/                # Security adversarial tests
prisma/
├── schema.prisma         # Database schema
docs/                     # Architecture, security, domain docs (with Mermaid diagrams)
```

## 📖 Documentation

| Document | Contents |
| -------- | -------- |
| [Architecture](docs/01-architecture.md) | Tech stack, high-level architecture, modular monolith design |
| [Auth & Users](docs/02-auth-and-users.md) | Registration, login, MFA, authorization flows |
| [Doctors & Availability](docs/03-doctors-and-availability.md) | Doctor management, slot state machine |
| [Booking System](docs/04-booking-system.md) | Concurrency, idempotency, transactional outbox |
| [Consultation & Prescription](docs/05-consultation-and-prescription.md) | Lifecycle state machine, prescription creation |
| [Payments](docs/06-payments.md) | Payment flow, webhook processing |
| [Observability & Admin](docs/07-observability-and-admin.md) | Logging, metrics, admin analytics |
| [Security & Threat Model](docs/08-security-and-threat-model.md) | OWASP controls, threat matrix, data classification |
| [Infrastructure](docs/09-infrastructure-and-database.md) | Database design, Docker, CI/CD, testing strategy |

## 📄 License

This project was built as a take-home assessment for Amrutam.

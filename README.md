# HealthCare Booking API

A production-grade, highly concurrent backend for a healthcare booking platform. Built with **Fastify**, **Prisma (PostgreSQL)**, and **Redis**.

## 🚀 Key Engineering Decisions

1. **Booking Concurrency (No Double-Booking)**
   - When a patient books a slot, we execute a Postgres `SELECT ... FOR UPDATE` row-level lock inside an interactive transaction. This guarantees that if 100 users try to book the exact same slot concurrently, exactly 1 succeeds and 99 fail with a `409 Conflict`.
   
2. **Idempotency & Payload Mutation Protection**
   - Endpoints implement `Idempotency-Key` headers. 
   - A SHA-256 hash of the `request.body` is generated. If the same key is reused, the API returns the cached response.
   - If the same key is reused with a *different* payload, the API intercepts it and returns a `400 IDEMPOTENCY_MISMATCH`.

3. **Transactional Outbox Worker (Eventual Consistency)**
   - Instead of immediately triggering emails/webhooks (which can fail), we write `OutboxEvent` records in the exact same Postgres transaction as the booking.
   - A background worker polls this table. To prevent double-processing in multi-node environments, the worker claims events atomically using `FOR UPDATE SKIP LOCKED`.

4. **Resilient Rate Limiting (Redis Degradation)**
   - We use `@fastify/rate-limit` with `ioredis`. 
   - If Redis crashes, the limiter is configured to "fail-open" (`continueExceeding: true`). This ensures that a Redis outage degrades our abuse protection temporarily, but our **core PostgreSQL transactional booking system remains perfectly operational**.

5. **Strict RBAC & Resource Ownership**
   - Routes are protected by `@fastify/jwt`.
   - Security doesn't stop at the role (e.g. `PATIENT` or `DOCTOR`). The controllers enforce explicit resource ownership (e.g., Doctor A cannot write prescriptions for Doctor B's consultations).

6. **Observability**
   - Exposes standard Prometheus metrics at `GET /metrics`.
   - Pino logs include UUID request correlation IDs.

## 🛠️ Local Development & Docker Setup

You can spin up the entire stack using Docker:

```bash
docker compose up --build
```
This boots Postgres, Redis, and the Node API. The API container includes a healthcheck dependency on Postgres and automatically runs `npx prisma migrate deploy` before starting.

Alternatively, run locally:
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

## 🧪 Testing

The repository contains a robust integration testing suite powered by Vitest, including heavy concurrency stress tests.

```bash
npm run test
```

## 📚 API Documentation

Once the server is running, visit the interactive OpenAPI/Swagger dashboard:
`GET http://localhost:3000/docs`

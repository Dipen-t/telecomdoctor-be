# 5-Minute Senior Engineer Demo Script

## 1. Introduction (30 seconds)
"Hi, I'm presenting the HealthCare Booking API. Instead of just showing you basic CRUD endpoints, I want to focus on how this system handles production-grade stressors: concurrency, network retries, and infrastructure failures."

## 2. Booking Concurrency (1 minute)
"Let's look at the core Booking flow. In a healthcare app, double-booking is catastrophic.
*(Show `src/modules/bookings/bookings.service.ts`)*
When a user books, we don't just check if the slot is available. We wrap the check in a Prisma `$transaction` and use a raw `SELECT ... FOR UPDATE` query. This acquires a Postgres row-level lock.
*(Show `stress.test.ts`)*
We wrote a stress test that fires 100 concurrent requests at the exact same millisecond. Because of the lock, exactly 1 succeeds, and 99 receive a 409 Conflict. The database enforces this perfectly."

## 3. Idempotency & Payload Attacks (1 minute)
"In mobile networks, clients retry dropped requests.
*(Show `src/middleware/idempotency.ts`)*
We require an `Idempotency-Key` header. When the booking succeeds, we save the 201 response body in Postgres. If the client retries, we return the cached response. 
Crucially, we also compute a SHA-256 hash of the request body. If a malicious client tries to reuse a successful key but mutates the payload (e.g., changing the doctor ID), we intercept the mismatch and return a 400 Bad Request."

## 4. The Transactional Outbox (1 minute)
"When a booking is created, we need to send emails. Doing this synchronously is slow and dangerous.
*(Show `outbox.worker.ts`)*
Instead, we save an `OutboxEvent` in the *exact same transaction* as the booking. A background worker polls these events. 
To ensure this scales to multiple worker nodes, our worker uses Postgres `FOR UPDATE SKIP LOCKED`. This atomically claims 10 rows and hides them from other polling workers, entirely preventing double-processing."

## 5. Resilience to Redis Outages (30 seconds)
"We use Redis for rate limiting. But what happens if Redis crashes?
*(Show `src/middleware/rate-limiter.ts`)*
We explicitly configured the Fastify rate limiter to 'fail-open' (`skipOnError: true`, `continueExceeding: true`). We accept the tradeoff of temporarily degraded abuse protection to ensure that the core transactional Postgres system stays alive and functional. A cache outage will not take down the booking system."

## 6. Closing (30 seconds)
"Finally, you can find the complete CI setup in `.github/workflows/ci.yml`, the Prometheus metrics at `/metrics`, and the OpenAPI docs at `/docs`. Everything boots cleanly via `docker compose up --build`. Are there any specific architectural decisions you'd like to dive deeper into?"

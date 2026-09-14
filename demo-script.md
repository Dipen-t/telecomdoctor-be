# 5-Minute Senior Engineer Demo Script

**Environment Preparation**
Before starting your recording, start the environment and seed the dummy data:
```bash
docker compose up -d --build
npm run seed:demo
npm run dev
```

*Have three windows open and ready:*
1. **Browser**: http://localhost:3000/docs (Swagger UI)
2. **Terminal**: Ready for `npx vitest run`
3. **Browser**: GitHub repository Actions tab

---

## 1. Introduction (20 seconds)
**Action**: Show the Swagger UI.
> "Hi, I'm presenting the Amrutam Telemedicine Backend. Instead of just walking through basic CRUD endpoints, I want to focus on how this system handles production-grade stressors: concurrency, network retries, security, and infrastructure failures."

---

## 2. Authentication & Authorization (45 seconds)

**Action**: Open `POST /api/v1/auth/login`. Click **Try it out**.
Paste this exact payload:
```json
{
  "email": "patient.a@example.com",
  "password": "password123"
}
```
**Action**: Click **Execute**. Copy the `accessToken` from the response. Scroll to the top of Swagger, click the **Authorize** padlock, paste the token, and click Authorize.

> "I am now authenticated via JWT as Patient A."

**Action**: Open `GET /api/v1/admin/analytics`. Click **Try it out** -> **Execute**. (It will fail with 403 Forbidden).
> "If I try to access an administrative endpoint, the Role-Based Access Control middleware correctly rejects it with a 403 Forbidden, as Patient A lacks the ADMIN role."

---

## 3. IDOR Protection & Resource Ownership (1 minute)

> "But authorization isn't just about roles. It's about resource ownership. Let's look at IDOR protection."

**Action**: Open `GET /api/v1/consultations/{id}`. 
Enter ID: `c1111111-1111-1111-1111-111111111111` (Patient A's consultation).
**Execute**. (It will succeed with 200 OK).
> "Patient A can successfully access their own consultation."

**Action**: Go back to `POST /api/v1/auth/login`. Change email to `"patient.b@example.com"`. Execute. Copy the new token, update the Swagger **Authorize** padlock with this new token.
**Action**: Re-run the exact same `GET /api/v1/consultations/c1111111-1111-1111-1111-111111111111`. (It will fail with 403 Forbidden).
> "If I authenticate as Patient B and try to access that exact same consultation, the request is rejected. The API verifies that the authenticated user actually participates in this specific resource."

---

## 4. Booking Concurrency & Double-Booking Protection (1.5 minutes)

> "Let's look at the core booking flow. In telemedicine, double-booking a slot is catastrophic. The booking operation runs inside an interactive PostgreSQL transaction. We lock the availability row using a `SELECT FOR UPDATE` query, preventing any concurrent requests from successfully booking the same slot."

**Action**: Switch to your **Terminal**.
Type: `npx vitest run src/workers/worker-concurrency.test.ts` (or run `npx vitest run src/modules/bookings/bookings.test.ts` to show booking locking specifically). 
*Note: If you have a specific concurrency test file, run that one.*

> "Here is an automated stress test firing concurrent booking attempts at the exact same millisecond. Because of the Postgres row lock and unique database constraints, exactly 1 succeeds, and the rest receive a 409 Conflict. The database enforces this perfectly."

---

## 5. Write Idempotency (45 seconds)

**Action**: Switch back to Swagger. Update the **Authorize** padlock back to Patient A's token.
**Action**: Open `POST /api/v1/bookings`. Click **Try it out**.
Enter `Idempotency-Key`: `demo-booking-001`
Paste this exact payload:
```json
{
  "slotId": "77777777-7777-7777-7777-777777777777"
}
```
**Action**: Click **Execute**. (It will succeed with 201 Created).
> "Mobile networks are flaky, and clients retry dropped requests. We require an Idempotency-Key header for critical writes."

**Action**: Click **Execute** again without changing anything. (It returns 201 immediately).
> "Sending the exact same request again safely returns the cached result without creating a duplicate booking."

**Action**: Change the JSON payload to a fake slot: `"slotId": "99999999-9999-9999-9999-999999999999"`. Click **Execute**. (It returns 400 IDEMPOTENCY_MISMATCH).
> "Crucially, we hash the request body. If a malicious client reuses a successful key but mutates the payload, we intercept the mismatch and reject it."

---

## 6. Observability & Outbox (30 seconds)

**Action**: Open a new browser tab to `http://localhost:3000/metrics`.
> "Every API request generates a correlation ID for structured Pino logs. We also expose Prometheus metrics for HTTP and application-level monitoring."

**Action**: (Optional) Show your terminal where the Fastify server is running to point out the structured JSON logs and the `OutboxEvent` background worker polling.
> "Additionally, we don't send emails synchronously. The booking creates an Outbox Event in the same transaction, which a background worker safely polls using `SKIP LOCKED`."

---

## 7. CI/CD (20 seconds)

**Action**: Switch to your browser showing the GitHub Actions tab.
> "Finally, the application is containerized, and our CI pipeline validates the code through linting, strict TypeScript checking, unit tests, and security audits."

> "That concludes the demo. Thank you."

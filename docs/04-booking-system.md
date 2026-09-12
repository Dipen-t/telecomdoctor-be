# 1. Booking System

## Booking Sequence Diagram

```mermaid
sequenceDiagram
    actor Patient
    participant API
    participant Auth
    participant Idempotency as Idempotency Middleware
    participant BookingService
    participant DB as PostgreSQL
    participant Worker as Outbox Worker

    Patient->>API: POST /bookings (Idempotency-Key header)
    API->>Auth: Authenticate + Authorize (PATIENT)
    Auth-->>API: Validated
    API->>Idempotency: Check idempotency key
    Idempotency->>DB: Lookup key + SHA-256 hash
    Idempotency-->>API: New request

    API->>BookingService: Process booking
    BookingService->>DB: BEGIN TRANSACTION
    DB->>DB: SELECT slot FOR UPDATE (row lock)
    DB->>DB: Verify slot status = AVAILABLE
    DB->>DB: UPDATE slot SET status = BOOKED
    DB->>DB: INSERT Consultation
    DB->>DB: INSERT OutboxEvent
    DB->>DB: INSERT IdempotencyKey + response
    BookingService->>DB: COMMIT

    BookingService-->>API: Success
    API-->>Patient: 201 Created

    Note over DB,Worker: Asynchronous
    Worker->>DB: Poll OutboxEvent (SKIP LOCKED)
    Worker->>Worker: Send notification email
    Worker->>DB: UPDATE status = PROCESSED
```

Endpoint:

```http
POST /api/v1/bookings
```

Required header:

```http
Idempotency-Key: <unique-key>
```

---

# 2. Booking Concurrency

This is a critical correctness requirement.

## Race Condition Prevention

```mermaid
sequenceDiagram
    participant PatientA as Patient A
    participant PatientB as Patient B
    participant DB as PostgreSQL

    PatientA->>DB: BEGIN TRANSACTION
    PatientB->>DB: BEGIN TRANSACTION
    PatientA->>DB: SELECT slot FOR UPDATE (acquires lock)
    PatientB->>DB: SELECT slot FOR UPDATE (BLOCKED - waiting)
    PatientA->>DB: UPDATE slot → BOOKED
    PatientA->>DB: INSERT Consultation
    PatientA->>DB: COMMIT (releases lock)
    Note over PatientB,DB: Patient B's lock acquired
    PatientB->>DB: SELECT slot → status = BOOKED
    PatientB->>DB: ROLLBACK
    PatientB-->>PatientB: 409 Conflict
```

Defense in depth:

```text
PostgreSQL transaction
+
SELECT ... FOR UPDATE (row-level lock)
+
Consultation.slotId @unique (database constraint)
```

---

# 3. Idempotency

## Idempotency Flow

```mermaid
flowchart TD
    A[Incoming Request] --> B{Idempotency-Key header?}
    B -->|No| C[400 Bad Request]
    B -->|Yes| D[SHA-256 hash request body]
    D --> E{Key exists in DB?}
    E -->|No| F[Process request normally]
    F --> G[Store key + hash + response]
    E -->|Yes| H{Body hash matches?}
    H -->|Yes| I[Return cached response]
    H -->|No| J[400 IDEMPOTENCY_MISMATCH]
```

```mermaid
erDiagram
    IDEMPOTENCY_KEY {
        uuid id PK
        string key
        string userId
        string requestHash
        int responseStatus
        json responseBody
        datetime createdAt
        datetime expiresAt
    }
```

Different payload with same key:

```text
→ 400 IDEMPOTENCY_MISMATCH
```

This protects against retries from clients/load balancers.

---
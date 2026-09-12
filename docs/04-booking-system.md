# 1. Booking System

Endpoint:

```http
POST /api/v1/bookings
```

Required header:

```http
Idempotency-Key: <unique-key>
```

Flow:

```text
Request
 ↓
Rate limit
 ↓
Authenticate
 ↓
Authorize
 ↓
Validate
 ↓
Check idempotency
 ↓
BEGIN TRANSACTION
 ↓
Lock slot
 ↓
Verify availability
 ↓
Create consultation
 ↓
Mark slot BOOKED
 ↓
Create outbox event
 ↓
Save idempotency response
 ↓
COMMIT
 ↓
Return response
```

---

---

# 2. Booking Concurrency

This is a critical correctness requirement.

Scenario:

```text
Patient A ──┐
            ├── Slot 123
Patient B ──┘
```

Both requests arrive simultaneously.

Expected:

```text
A → SUCCESS
B → CONFLICT
```

Never:

```text
A → SUCCESS
B → SUCCESS
```

Implementation:

```text
PostgreSQL transaction
+
SELECT ... FOR UPDATE
+
unique constraints
```

The assignment explicitly asks for concurrency handling and transaction management. 

---

---

# 3. Idempotency

Table:

```text
idempotency_keys

id
key
user_id
request_hash
response_status
response_body
created_at
expires_at
```

Behavior:

```text
First request
     ↓
Process
     ↓
Store result

Same key
     ↓
Return stored result
```

Different payload with same key:

```text
→ 409 Conflict
```

This protects against retries from clients/load balancers.

---
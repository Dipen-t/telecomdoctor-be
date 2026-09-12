# 1. Doctor Management

Endpoints:

```text
GET    /api/v1/doctors
GET    /api/v1/doctors/:id
POST   /api/v1/doctors
PATCH  /api/v1/doctors/:id
```

Doctor profile:

```text
doctor
├── user_id
├── specialty
├── qualification
├── experience
├── consultation_fee
├── status
└── timestamps
```

---

---

# 2. Availability Management

Endpoints:

```text
POST   /api/v1/doctors/:id/availability
GET    /api/v1/doctors/:id/availability
DELETE /api/v1/availability/:id
```

Slot:

```text
availability_slot
├── id
├── doctor_id
├── start_time
├── end_time
├── status
└── timestamps
```

Possible states:

```text
AVAILABLE
BOOKED
BLOCKED
CANCELLED
```

Implementation decision.

---

---

# 3. Search

Endpoint:

```http
GET /api/v1/doctors
```

Filters:

```text
specialty
availability
status
fee range
page
limit
```

Example:

```text
GET /doctors?
specialty=cardiology
&available=true
&page=1
&limit=20
```

Performance strategy:

```text
PostgreSQL indexes
+
pagination
+
selective Redis caching
```

---
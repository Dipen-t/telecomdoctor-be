# 1. Consultation Lifecycle

Consultation states:

```text
SCHEDULED
    ↓
IN_PROGRESS
    ↓
COMPLETED
```

Possible terminal alternatives:

```text
CANCELLED
NO_SHOW
```

Endpoints:

```text
GET   /api/v1/consultations
GET   /api/v1/consultations/:id
PATCH /api/v1/consultations/:id/status
```

State transitions should be validated.

For example:

```text
COMPLETED → SCHEDULED
```

should be rejected.

---

---

# 2. Prescription System

Endpoint:

```http
POST /api/v1/consultations/:id/prescriptions
```

Only the appropriate doctor should be able to create a prescription.

Data:

```text
prescription
├── id
├── consultation_id
├── doctor_id
├── notes
└── timestamps

prescription_items
├── id
├── prescription_id
├── medicine
├── dosage
├── frequency
├── duration
└── instructions
```

---
# 1. Consultation Lifecycle

## Entity Relationship Diagram

```mermaid
erDiagram
    AVAILABILITY_SLOT {
        uuid id PK
        uuid doctorId FK
        datetime startTime
        datetime endTime
        enum status
    }
    CONSULTATION {
        uuid id PK
        uuid slotId FK UK
        uuid patientId
        uuid doctorId
        enum status
        string meetingRoomId
        datetime createdAt
    }
    PRESCRIPTION {
        uuid id PK
        uuid consultationId FK UK
        uuid doctorId FK
        string notes
        datetime createdAt
    }
    PRESCRIPTION_ITEM {
        uuid id PK
        uuid prescriptionId FK
        string medicine
        string dosage
        string frequency
        string duration
        string instructions
    }

    AVAILABILITY_SLOT ||--o| CONSULTATION : results_in
    CONSULTATION ||--o| PRESCRIPTION : has
    PRESCRIPTION ||--o{ PRESCRIPTION_ITEM : contains
```

## State Machine

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED : Booking created
    SCHEDULED --> IN_PROGRESS : Doctor starts consultation
    IN_PROGRESS --> COMPLETED : Doctor completes
    SCHEDULED --> CANCELLED : Patient/Doctor cancels
    SCHEDULED --> NO_SHOW : Patient does not join
```

### Valid Transitions

```mermaid
flowchart LR
    A[SCHEDULED] --> B[IN_PROGRESS]
    B --> C[COMPLETED]
    A --> D[CANCELLED]
    A --> E[NO_SHOW]
```

Invalid transitions (rejected by the system):

```text
COMPLETED → SCHEDULED    ❌
CANCELLED → IN_PROGRESS  ❌
NO_SHOW   → SCHEDULED    ❌
```

Endpoints:

```text
GET   /api/v1/consultations
GET   /api/v1/consultations/:id
PATCH /api/v1/consultations/:id/status
```

---

# 2. Prescription System

## Prescription Creation Sequence

```mermaid
sequenceDiagram
    actor Doctor
    participant API
    participant Auth
    participant Service as PrescriptionService
    participant DB as PostgreSQL

    Doctor->>API: POST /consultations/:id/prescriptions
    API->>Auth: Authenticate + Authorize (DOCTOR)
    Auth-->>API: Validated
    API->>Service: Create prescription
    Service->>DB: Verify consultation exists
    Service->>DB: Verify doctor owns consultation
    Service->>DB: Verify consultation status = COMPLETED
    Service->>DB: BEGIN TRANSACTION
    DB->>DB: INSERT Prescription
    DB->>DB: INSERT PrescriptionItems[]
    DB->>DB: INSERT AuditLog
    Service->>DB: COMMIT
    Service-->>API: Prescription created
    API-->>Doctor: 201 Created
```

Only the assigned doctor can create a prescription. Resource ownership is verified in the business logic.

---
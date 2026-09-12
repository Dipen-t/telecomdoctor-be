# 1. Doctor Management

## Entity Relationship Diagram

```mermaid
erDiagram
    USER {
        uuid id PK
        string email
        enum role
    }
    DOCTOR {
        uuid id PK
        uuid userId
        string specialty
        string qualification
        int experience
        decimal consultationFee
        enum status
        datetime createdAt
    }
    AVAILABILITY_SLOT {
        uuid id PK
        uuid doctorId
        datetime startTime
        datetime endTime
        enum status
        datetime createdAt
    }

    USER ||--o| DOCTOR : is
    DOCTOR ||--o{ AVAILABILITY_SLOT : manages
```

Endpoints:

```text
GET    /api/v1/doctors
GET    /api/v1/doctors/:id
POST   /api/v1/doctors         (ADMIN only)
PATCH  /api/v1/doctors/:id
```

---

# 2. Availability Management

## Slot State Machine

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE : Doctor creates slot
    AVAILABLE --> BOOKED : Patient books
    AVAILABLE --> BLOCKED : Doctor blocks
    AVAILABLE --> CANCELLED : Doctor cancels
    BOOKED --> CANCELLED : Cancellation
    BLOCKED --> AVAILABLE : Doctor unblocks
```

## Create Availability Sequence

```mermaid
sequenceDiagram
    actor Doctor
    participant API
    participant Auth
    participant DB as PostgreSQL

    Doctor->>API: POST /doctors/:id/availability
    API->>Auth: Authenticate + Authorize (DOCTOR)
    Auth-->>API: Validated
    API->>API: Validate: startTime < endTime
    API->>DB: Check for overlapping slots
    DB-->>API: No overlap
    API->>DB: INSERT AvailabilitySlot (AVAILABLE)
    DB-->>API: Created
    API-->>Doctor: 201 Created
```

Endpoints:

```text
POST   /api/v1/doctors/:id/availability
GET    /api/v1/doctors/:id/availability
DELETE /api/v1/availability/:id
```

---

# 3. Search & Filtering

```mermaid
flowchart TD
    A[GET /api/v1/doctors] --> B[Apply Filters]
    B --> C{specialty?}
    C -->|Yes| D[WHERE specialty = X]
    B --> E{available?}
    E -->|Yes| F[JOIN availability_slots]
    B --> G{fee range?}
    G -->|Yes| H[WHERE fee BETWEEN min AND max]
    D & F & H --> I[Paginate Results]
    I --> J[Return Page]
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
# 1. User Lifecycle

## Entity Relationship Diagram

```mermaid
erDiagram
    USER {
        uuid id PK
        string email
        string password
        enum role
        boolean mfaEnabled
        datetime createdAt
        datetime updatedAt
    }
    PROFILE {
        uuid id PK
        uuid userId
        string firstName
        string lastName
        string phone
        datetime createdAt
    }
    AUDIT_LOG {
        uuid id PK
        uuid actorId
        string action
        string resourceType
        string resourceId
        json metadata
        datetime createdAt
    }

    USER ||--o| PROFILE : has
    USER ||--o{ AUDIT_LOG : triggers
```

## Registration

```http
POST /api/v1/auth/register
```

```mermaid
sequenceDiagram
    actor Client
    participant API
    participant Validator as Zod Validator
    participant DB as PostgreSQL

    Client->>API: POST /auth/register
    API->>Validator: Validate input
    Validator-->>API: Valid
    API->>DB: Check duplicate email
    DB-->>API: No duplicate
    API->>DB: BEGIN TRANSACTION
    API->>DB: Hash password (Argon2id)
    API->>DB: INSERT User + Profile
    API->>DB: INSERT AuditLog (USER_REGISTERED)
    API->>DB: COMMIT
    API-->>Client: 201 Created
```

## Login

```http
POST /api/v1/auth/login
```

```mermaid
sequenceDiagram
    actor Client
    participant API
    participant Redis
    participant DB as PostgreSQL

    Client->>API: POST /auth/login
    API->>Redis: Check rate limit
    Redis-->>API: Allowed
    API->>DB: Find user by email
    DB-->>API: User found
    API->>API: Verify password (Argon2id)
    API->>API: Check MFA status

    alt MFA Enabled
        API-->>Client: 200 MFA Challenge Required
        Client->>API: POST /auth/mfa/verify
        API->>Redis: Verify MFA code
    end

    API->>API: Generate Access Token (JWT)
    API->>API: Generate Refresh Token
    API->>DB: INSERT AuditLog (USER_LOGIN)
    API-->>Client: 200 { accessToken, refreshToken }
```

## Token Model

```mermaid
flowchart LR
    A[Access Token] -->|15 min TTL| B[Short-lived]
    C[Refresh Token] -->|7 day TTL| D[Longer-lived]
    B --> E[Contains userId + role]
    D --> F[Revocable]
```

---

# 2. MFA

MFA is mandatory at the requirement level.

```mermaid
flowchart TD
    A[Password Valid] --> B{MFA Enabled?}
    B -->|No| C[Issue Tokens]
    B -->|Yes| D[Generate Challenge]
    D --> E[Store in Redis with TTL]
    E --> F[Return Challenge ID]
    F --> G[Client Submits Code]
    G --> H{Code Valid?}
    H -->|Yes| C
    H -->|No| I[401 Unauthorized]
```

Redis stores short-lived MFA challenge state:

```text
mfa:challenge:<id>
```

with an expiration time. Never store permanent sensitive authentication information in Redis.

---

# 3. Authorization

```mermaid
flowchart TD
    A[Incoming Request] --> B{Authenticated?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D{Role Authorized?}
    D -->|No| E[403 Forbidden]
    D -->|Yes| F{Resource Owner?}
    F -->|No| G[403 Forbidden]
    F -->|Yes| H{Business Rules Pass?}
    H -->|No| I[400/409 Error]
    H -->|Yes| J[Process Request]
```

Example:

```text
PATIENT
  ↓
GET /consultations/:id
  ↓
Is authenticated?
  ↓
Is patient?
  ↓
Does consultation belong to patient?
  ↓
Allow
```

This prevents the common vulnerability:

> "User has permission to read consultations, therefore they can read every consultation."

---
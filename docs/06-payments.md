# 1. Payments

The assignment specifies a `payments` table but doesn't define a complete payment-provider workflow.

Therefore we implement the **payment domain**, not build a massive payment integration.

## Entity Relationship Diagram

```mermaid
erDiagram
    CONSULTATION {
        uuid id PK
        uuid patientId
        uuid doctorId
        enum status
    }
    PAYMENT {
        uuid id PK
        uuid consultationId
        decimal amount
        string currency
        enum status
        string providerReference
        datetime createdAt
        datetime updatedAt
    }

    CONSULTATION ||--o| PAYMENT : requires
```

## Payment State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING : Payment initiated
    PENDING --> SUCCESS : Provider confirms
    PENDING --> FAILED : Provider rejects
    SUCCESS --> REFUNDED : Admin refunds
```

## Payment Webhook Flow

```mermaid
sequenceDiagram
    actor Gateway as Payment Gateway
    participant API as Webhook Endpoint
    participant Service as PaymentService
    participant DB as PostgreSQL

    Gateway->>API: POST /webhooks/payments
    API->>API: Verify webhook signature
    API->>Service: Process payment event
    Service->>DB: Find payment by providerReference
    Service->>DB: UPDATE payment status
    Service->>DB: INSERT AuditLog
    Service-->>API: Processed
    API-->>Gateway: 200 OK
```

Payment writes are also idempotent via the `Idempotency-Key` header.

---
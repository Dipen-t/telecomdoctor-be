# 1. Audit System

Audit logging is mandatory.

## Audit ERD

```mermaid
erDiagram
    USER {
        uuid id PK
        string email
        enum role
    }
    AUDIT_LOG {
        uuid id PK
        uuid actorId
        string action
        string resourceType
        string resourceId
        string requestId
        string ipAddress
        json metadata
        datetime createdAt
    }

    USER ||--o{ AUDIT_LOG : triggers
```

## Audit Events

```mermaid
flowchart LR
    A[USER_LOGIN] --> Z[AuditLog]
    B[USER_LOGIN_FAILED] --> Z
    C[BOOKING_CREATED] --> Z
    D[BOOKING_CANCELLED] --> Z
    E[CONSULTATION_ACCESSED] --> Z
    F[PRESCRIPTION_CREATED] --> Z
    G[PAYMENT_CREATED] --> Z
    H[ADMIN_ACTION] --> Z
```

Sensitive medical content should not be dumped into application logs.

---

# 2. Admin Analytics

Endpoint:

```http
GET /api/v1/admin/analytics/overview
```

## Admin Dashboard Data Flow

```mermaid
flowchart TD
    A[Admin Request] --> B{Authenticate}
    B --> C{Authorize ADMIN role}
    C --> D[Query PostgreSQL]
    D --> E[Total Consultations]
    D --> F[Completed Consultations]
    D --> G[Active Doctors]
    D --> H[Revenue Aggregation]
    E & F & G & H --> I[Return Analytics Response]
```

Expensive analytics should be precomputed, cached, or processed asynchronously rather than repeatedly scanning large transactional tables.

---

# 3. Observability

## Observability Architecture

```mermaid
flowchart TD
    subgraph Application
        A[Fastify API]
        B[Pino Logger]
        C[prom-client]
    end

    subgraph Outputs
        D[stdout - JSON logs]
        E[GET /metrics]
    end

    subgraph Monitoring
        F[Log Aggregator]
        G[Prometheus]
        H[Grafana Dashboards]
    end

    A --> B --> D --> F
    A --> C --> E --> G --> H
```

### Logs

Structured JSON via Pino:

```json
{
  "level": "info",
  "event": "booking.created",
  "requestId": "uuid-correlation-id",
  "userId": "...",
  "bookingId": "..."
}
```

No passwords, tokens, prescriptions or unnecessary medical data.

### Metrics

```text
http_requests_total
http_request_duration_seconds
booking_success_total
booking_failure_total
auth_failure_total
rate_limit_total
```

### Request Correlation

Every request is stamped with a unique UUID correlation ID, enabling trace reconstruction across structured log entries.

---
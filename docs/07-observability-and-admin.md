# 1. Audit System

Audit logging is mandatory. 

Model:

```text
audit_logs

id
actor_id
action
resource_type
resource_id
request_id
ip_address
metadata
created_at
```

Examples:

```text
USER_LOGIN
USER_LOGIN_FAILED
BOOKING_CREATED
BOOKING_CANCELLED
CONSULTATION_ACCESSED
PRESCRIPTION_CREATED
PAYMENT_CREATED
ADMIN_ACTION
```

Sensitive medical content should not be dumped into application logs.

---

---

# 2. Admin Analytics

Endpoint:

```http
GET /api/v1/admin/analytics/overview
```

Metrics:

```text
Total consultations
Completed consultations
Cancelled consultations
Active doctors
Active patients
Bookings
Revenue
```

Expensive analytics should be:

```text
precomputed
or
cached
or
processed asynchronously
```

rather than repeatedly scanning large transactional tables.

---

---

# 3. Observability

Required:

```text
Metrics
Logs
Traces
```



### Logs

Structured JSON:

```json
{
  "level": "info",
  "event": "booking.created",
  "requestId": "...",
  "traceId": "...",
  "userId": "...",
  "bookingId": "..."
}
```

No passwords, tokens, prescriptions or unnecessary medical data.

### Metrics

```text
http_requests_total
http_request_duration
http_errors_total

booking_success_total
booking_failure_total

db_query_duration
db_connection_pool_usage

queue_depth
queue_failures

auth_failure_total
rate_limit_total
```

### Traces

```text
HTTP Request
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
PostgreSQL
```

---
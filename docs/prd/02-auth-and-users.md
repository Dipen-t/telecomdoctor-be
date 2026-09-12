# 1. User Lifecycle

## Registration

```http
POST /api/v1/auth/register
```

Flow:

```text
Request
 ↓
Validation
 ↓
Check duplicate
 ↓
Hash password
 ↓
Create User
 ↓
Create Profile
 ↓
Audit event
 ↓
Response
```

## Login

```http
POST /api/v1/auth/login
```

Flow:

```text
Credentials
 ↓
Validation
 ↓
Rate-limit check
 ↓
User lookup
 ↓
Password verification
 ↓
MFA verification
 ↓
Issue access token
 ↓
Issue refresh token
 ↓
Audit
```

## Token model

Access token:

* Short-lived
* Contains user identity/authorization claims

Refresh token:

* Longer-lived
* Revocable
* Stored securely

---

---

# 2. MFA

MFA is mandatory at the requirement level. 

Implementation:

```text
Password valid
      ↓
MFA enabled?
      ↓
     YES
      ↓
Challenge
      ↓
Verify
      ↓
Issue session
```

Redis can store short-lived MFA challenge state:

```text
mfa:challenge:<id>
```

with an expiration time.

Never store permanent sensitive authentication information in Redis.

---

---

# 3. Authorization

Every protected request goes through:

```text
Authentication
      ↓
Role authorization
      ↓
Resource ownership
      ↓
Business rules
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
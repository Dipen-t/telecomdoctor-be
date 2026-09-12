# 1. Security Architecture

Security requirements include:

* OWASP mitigation
* Attack surface analysis
* Data classification
* Encryption
* Key rotation
* Audit logs
* Dependency scanning 

### Security layers

```text
Internet
   ↓
Rate limiting
   ↓
Security headers
   ↓
Authentication
   ↓
Authorization
   ↓
Input validation
   ↓
Business authorization
   ↓
Database
```

---

---

# 2. Data Classification

Implementation decision:

### Public

```text
General doctor profile
Public specialties
```

### Internal

```text
Operational metadata
Analytics
```

### Confidential

```text
User profile
Contact information
Payments
```

### Highly Sensitive

```text
Consultations
Prescriptions
Medical information
```

Highly sensitive information receives stricter access controls and should never be casually exposed through logs.

---

---

# 3. Encryption

### In transit

HTTPS/TLS.

### At rest

Database/storage encryption provided by the deployment environment.

### Application-level encryption

Only where necessary for particularly sensitive fields.

Encryption keys must:

* Never be committed
* Come from environment/secret management
* Support rotation

---

---

# 4. Threat Model

We should document threats such as:

| Threat                 | Mitigation                      |
| ---------------------- | ------------------------------- |
| Credential stuffing    | Rate limiting + MFA             |
| Brute-force login      | Rate limiting                   |
| SQL injection          | Prisma/parameterized queries    |
| IDOR                   | Ownership checks                |
| Privilege escalation   | RBAC                            |
| Token theft            | Short-lived access tokens       |
| Duplicate booking      | Idempotency                     |
| Double booking         | DB transaction + locking        |
| Sensitive data leakage | Access control + logging policy |
| DoS                    | Rate limiting + request limits  |
| Malicious dependency   | Dependency scanning             |
| Secret leakage         | Environment/secret management   |

---

---

# 5. OWASP Security Controls

We'll explicitly address common OWASP risks:

```text
Broken Access Control
Cryptographic Failures
Injection
Security Misconfiguration
Authentication Failures
Logging/Monitoring Failures
Vulnerable Components
```

The security document should map each threat to an actual mitigation.

---
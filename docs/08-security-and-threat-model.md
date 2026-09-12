# 1. Security Architecture

## Defense-in-Depth Layers

```mermaid
flowchart TD
    A[Internet] --> B[Rate Limiting]
    B --> C[Security Headers - Helmet]
    C --> D[Authentication - JWT]
    D --> E[Role Authorization - RBAC]
    E --> F[Input Validation - Zod]
    F --> G[Resource Ownership Check]
    G --> H[Business Logic]
    H --> I[(PostgreSQL)]

    style B fill:#ff6b6b
    style C fill:#ff6b6b
    style D fill:#ffa07a
    style E fill:#ffa07a
    style F fill:#87ceeb
    style G fill:#87ceeb
```

Security requirements include:

* OWASP mitigation
* Attack surface analysis
* Data classification
* Encryption
* Key rotation
* Audit logs
* Dependency scanning

---

# 2. Data Classification

```mermaid
flowchart TD
    subgraph Public
        A[Doctor profiles]
        B[Specialties]
    end

    subgraph Internal
        C[Operational metadata]
        D[Analytics]
    end

    subgraph Confidential
        E[User profiles]
        F[Contact information]
        G[Payments]
    end

    subgraph Highly_Sensitive["Highly Sensitive"]
        H[Consultations]
        I[Prescriptions]
        J[Medical information]
    end
```

Highly sensitive information receives stricter access controls and should never be casually exposed through logs.

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

# 4. Threat Model

```mermaid
flowchart LR
    subgraph Threats
        T1[Credential Stuffing]
        T2[Brute Force]
        T3[SQL Injection]
        T4[IDOR / BOLA]
        T5[Privilege Escalation]
        T6[Token Theft]
        T7[Double Booking]
        T8[Data Leakage]
        T9[DoS]
        T10[Malicious Dependency]
    end

    subgraph Mitigations
        M1[Rate Limiting + MFA]
        M2[Rate Limiting]
        M3[Prisma / Parameterized Queries]
        M4[Ownership Checks]
        M5[RBAC]
        M6[Short-lived Access Tokens]
        M7[DB Transaction + Locking]
        M8[Access Control + Log Policy]
        M9[Rate Limiting + Request Limits]
        M10[npm audit in CI]
    end

    T1 --> M1
    T2 --> M2
    T3 --> M3
    T4 --> M4
    T5 --> M5
    T6 --> M6
    T7 --> M7
    T8 --> M8
    T9 --> M9
    T10 --> M10
```

| Threat                 | Mitigation                      | Tested |
| ---------------------- | ------------------------------- | ------ |
| Credential stuffing    | Rate limiting + MFA             | ✅     |
| Brute-force login      | Rate limiting                   | ✅     |
| SQL injection          | Prisma/parameterized queries    | ✅     |
| IDOR                   | Ownership checks                | ✅     |
| Privilege escalation   | RBAC                            | ✅     |
| Token theft            | Short-lived access tokens       | ✅     |
| Duplicate booking      | Idempotency                     | ✅     |
| Double booking         | DB transaction + locking        | ✅     |
| Sensitive data leakage | Access control + logging policy | ✅     |
| DoS                    | Rate limiting + request limits  | ✅     |
| Malicious dependency   | npm audit in CI                 | ✅     |
| Secret leakage         | Environment/secret management   | ✅     |

---

# 5. OWASP Security Controls

```mermaid
flowchart TD
    A[OWASP Top 10] --> B[Broken Access Control]
    A --> C[Cryptographic Failures]
    A --> D[Injection]
    A --> E[Security Misconfiguration]
    A --> F[Authentication Failures]
    A --> G[Logging/Monitoring Failures]
    A --> H[Vulnerable Components]

    B --> B1["RBAC + Resource Ownership + Adversarial Tests"]
    C --> C1["Argon2id + JWT + TLS"]
    D --> D1["Prisma ORM + Zod Validation"]
    E --> E1["Helmet + Fail-fast Secrets + CORS"]
    F --> F1["Rate Limiting + MFA + Token Rotation"]
    G --> G1["Pino Structured Logs + Audit Trail"]
    H --> H1["npm audit --audit-level=high in CI"]
```

Authorization controls were adversarially tested against IDOR, privilege escalation, cross-resource access, and mass-assignment scenarios via dedicated test suites (`security.test.ts`).

---
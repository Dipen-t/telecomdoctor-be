# 1. Payments

The assignment specifies a `payments` table but doesn't define a complete payment-provider workflow. 

Therefore we'll implement the **payment domain**, not build a massive payment integration.

Model:

```text
payment
├── id
├── consultation_id
├── amount
├── currency
├── status
├── provider_reference
└── timestamps
```

Statuses:

```text
PENDING
SUCCESS
FAILED
REFUNDED
```

Payment writes should also be idempotent.

---
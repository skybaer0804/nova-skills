---
name: agent-ap2
description: Use when an AI agent needs to authorize and execute payments autonomously — when implementing spending limits, merchant restrictions, cryptographic approval proof, or audit trails for agentic purchases that require non-repudiation.
created: 2026-05-05
updated: 2026-05-05
---

# Agent AP2 (Agent Payments Protocol)

## Overview
AP2 provides cryptographic delegation and audit trails to ensure that when an agent executes a payment, it operates only within guardrails pre-configured by a human. If UCP is "what to order," AP2 is "proof that the payment was authorized."

**Before using this skill, verify that AP2 is needed via `agent-protocol-design`.**
**AP2 must always be used together with UCP (`agent-ucp`).**

## 3-Step Audit Trail

```
Admin               Agent                       Vendor
  │  IntentMandate    │                             │
  │  (set guardrails) │                             │
  │──────────────────►│                             │
  │                   │  PaymentMandate             │
  │                   │  (create specific payment   │
  │                   │   authorization)            │
  │◄──────────────────│                             │
  │  Sign (approve)   │                             │
  │──────────────────►│                             │
  │                   │  UCP complete + attach Mandate  │
  │                   │────────────────────────────►│
  │                   │  PaymentReceipt             │
  │                   │◄────────────────────────────│
```

## Core Concepts

| Concept | Description |
|---------|-------------|
| **IntentMandate** | Guardrails set by the admin (allowed merchants, limits, expiry) |
| **PaymentMandate** | Specific payment authorization created by the agent (amount bound, cryptographically signed) |
| **PaymentReceipt** | Final transaction record + audit trail (must be persisted permanently) |

## Python — Full AP2 Flow

```python
# pip install git+https://github.com/google-agentic-commerce/AP2.git@main
# verify module paths and type names against current AP2 SDK docs
# (current SDK uses ap2.sdk.* modules, not ap2.types.*)
from ap2.types.mandate import IntentMandate, PaymentMandate, PaymentMandateContents
from ap2.types.payment_receipt import PaymentReceipt, Success
from ap2.types.common import PaymentItem, PaymentCurrencyAmount
import datetime

# Step 1: Admin sets IntentMandate (once before agent runs)
intent = IntentMandate(
    natural_language_description="10 lbs salmon, 3 bottles olive oil",
    merchants=["Example Wholesale", "Fresh Seafood Co"],  # allowed merchants
    total_amount_limit=PaymentCurrencyAmount(currency="USD", value=500.00),
    requires_refundability=True,
    user_cart_confirmation_required=False,
    intent_expiry=datetime.datetime(2026, 12, 31).isoformat(),
)

# Step 2: Agent creates PaymentMandate (after UCP checkout)
mandate = PaymentMandate(
    payment_mandate_contents=PaymentMandateContents(
        payment_mandate_id="mandate-abc123",
        intent_mandate_id=intent.intent_mandate_id,
        payment_details_total=PaymentItem(
            label="10 lbs Salmon + 3 bottles Olive Oil",
            amount=PaymentCurrencyAmount(currency="USD", value=294.00),
        ),
        merchant_agent="Example Wholesale",
        line_items=[
            PaymentItem(label="Salmon 10 lbs", amount=PaymentCurrencyAmount(currency="USD", value=240.00)),
            PaymentItem(label="Olive Oil x3",  amount=PaymentCurrencyAmount(currency="USD", value=54.00)),
        ],
    )
)

# Step 3: Admin signs (real environment: JWT / biometric / hardware key)
mandate.user_authorization = sign_mandate(mandate)  # varies by implementation

# Step 4: Attach mandate in header when calling UCP checkout-sessions/{id}/complete
# AP2-Payment-Mandate: <serialized mandate>

# Step 5: Save PaymentReceipt (audit trail — must be persisted permanently)
receipt = PaymentReceipt(
    payment_mandate_id="mandate-abc123",
    payment_id="PAY-001",
    amount=PaymentCurrencyAmount(currency="USD", value=294.00),
    payment_status=Success(merchant_confirmation_id="ORD-A1B2C3"),
)
db.save(receipt)  # must persist permanently
```

## IntentMandate vs PaymentMandate

| | IntentMandate | PaymentMandate |
|--|--------------|----------------|
| Creator | Admin (human) | Agent (automated) |
| Timing | Before agent runs | Immediately before purchase |
| Content | Guardrails (allowed scope) | Specific amount/merchant |
| Signed by | Admin | Admin (mandate approval) |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Creating PaymentMandate without IntentMandate | IntentMandate is the guardrail — must be created first |
| Not saving PaymentReceipt | Core of the audit trail — must be persisted permanently |
| Using AP2 without UCP | AP2 is used for payment authorization after UCP checkout completes |
| Sending mandate without `user_authorization` signature | Mandate must be signed before sending |
| Attempting payment after IntentMandate expiry | Check `intent_expiry` and renew before proceeding |

## Official Docs
Edge cases: https://ap2-protocol.org/
Samples: https://github.com/google-agentic-commerce/AP2

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

# Step 3: Admin signs — THIS IS THE SECURITY-CRITICAL CORE, NOT A STUB.
# user_authorization MUST be a cryptographic signature over a canonical
# serialization of payment_mandate_contents (amount + merchant + ids),
# produced with an admin-held key the agent cannot access
# (passkey/WebAuthn, hardware key, or a JWT signed by the admin's private key).
# A non-crypto "approved: true" marker provides ZERO non-repudiation.
mandate.user_authorization = sign_mandate(mandate)  # must implement the contract above

# Step 4: Attach mandate in header when calling UCP checkout-sessions/{id}/complete
# AP2-Payment-Mandate: <serialized mandate>

# Step 4.5: Verifier (merchant/PSP) MUST validate BEFORE charging:
#   - signature verifies against the admin's PUBLIC key
#   - signed contents match the amount/merchant actually being charged
#   - mandate not expired and within the IntentMandate guardrails
# Reject (do not charge) on any failure. No verification = no non-repudiation.

# Step 5: Save PaymentReceipt (audit trail — must be persisted permanently)
receipt = PaymentReceipt(
    payment_mandate_id="mandate-abc123",
    payment_id="PAY-001",
    amount=PaymentCurrencyAmount(currency="USD", value=294.00),
    payment_status=Success(merchant_confirmation_id="ORD-A1B2C3"),
)
db.save(receipt)  # must persist permanently
```

## Signing & Verification (SDK-agnostic reference)

`sign_mandate` and the verifier are the security core — implement them with real
asymmetric crypto, not a marker. Example with Ed25519 over a canonical JSON
serialization. The admin private key must live where the agent cannot read it
(HSM / passkey / KMS); the snippet uses a local key only to show the contract.

```python
import json
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey, Ed25519PublicKey,
)
from cryptography.exceptions import InvalidSignature

def canonical_bytes(contents: dict) -> bytes:
    # Deterministic: sort keys, no whitespace — verifier must reproduce identically
    return json.dumps(contents, sort_keys=True, separators=(",", ":")).encode()

# Admin side — sign the bound payment fields
def sign_mandate(contents: dict, admin_key: Ed25519PrivateKey) -> bytes:
    return admin_key.sign(canonical_bytes(contents))

# Merchant/PSP side — verify BEFORE charging
def verify_mandate(contents: dict, signature: bytes,
                   admin_pubkey: Ed25519PublicKey,
                   charge_amount, charge_merchant) -> bool:
    try:
        admin_pubkey.verify(signature, canonical_bytes(contents))
    except InvalidSignature:
        return False
    # Re-bind: signed values must match what is actually being charged
    return (contents["payment_details_total"] == charge_amount
            and contents["merchant_agent"] == charge_merchant)
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
| Implementing `sign_mandate` as a stub / plaintext "approved" marker | It is the cryptographic core — sign canonical mandate bytes with an admin-held key the agent cannot forge |
| Signature does not cover amount + merchant | A signature omitting the charged values lets a compromised agent alter them undetected — bind all payment fields |
| Merchant accepts the mandate without verifying the signature | Verify against the admin public key and re-bind the verified amount/merchant before charging |

## Official Docs
Edge cases: https://ap2-protocol.org/
Samples: https://github.com/google-agentic-commerce/AP2

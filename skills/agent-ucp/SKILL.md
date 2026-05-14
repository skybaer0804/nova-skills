---
name: agent-ucp
description: Use when an AI agent needs to perform e-commerce transactions across vendors — when building agents that browse catalogs, create checkout sessions, or place orders using a standardized protocol regardless of the vendor's specific API.
created: 2026-05-05
updated: 2026-05-05
---

# Agent UCP (Universal Commerce Protocol)

## Overview
UCP defines the e-commerce lifecycle (discovery → checkout → order) as a modular standard. Transactions are possible using the same schema regardless of the transport method — REST, MCP, A2A, or others.

**Before using this skill, verify that UCP is needed via `agent-protocol-design`.**
**If payment is required, always use `agent-ap2` together.**

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Discovery Profile** | `/.well-known/ucp` — declares the capabilities supported by the vendor |
| **CheckoutSession** | The unit of an order — includes line items, currency, and shipping information |
| **LineItem** | An individual product within an order (ID, quantity) |
| **Idempotency-Key** | UUID header to prevent duplicate orders (required) |

```
Agent
  │  GET /.well-known/ucp           ← Check vendor capabilities
  │  POST /checkout-sessions        ← Create checkout session
  │  POST /checkout-sessions/{id}/complete  ← Complete order
  ▼
Vendor server
```

## Python — UCP Checkout

```python
# pip install ucp-sdk httpx
import httpx
import uuid
from ucp_sdk.models.discovery.profile_schema import UcpDiscoveryProfile
from ucp_sdk.models.schemas.shopping.checkout_create_req import CheckoutCreateRequest
from ucp_sdk.models.schemas.shopping.types.line_item_create_req import LineItemCreateRequest
from ucp_sdk.models.schemas.shopping.types.item_create_req import ItemCreateRequest

async def place_order(vendor_url: str, item_id: str, quantity: int) -> dict:
    async with httpx.AsyncClient() as c:
        # Step 1: Check vendor UCP capabilities
        profile = UcpDiscoveryProfile.model_validate(
            (await c.get(f"{vendor_url}/.well-known/ucp")).json()
        )
        print(f"Vendor capabilities: {profile.capabilities}")

        # Step 2: Create checkout session
        checkout_req = CheckoutCreateRequest(
            currency="USD",
            line_items=[
                LineItemCreateRequest(
                    quantity=quantity,
                    item=ItemCreateRequest(id=item_id),
                )
            ],
        )

        headers = {
            "UCP-Agent": 'profile="https://my-agent.example/agent"',
            "Idempotency-Key": str(uuid.uuid4()),  # Required — prevents duplicate orders
        }

        checkout = (await c.post(
            f"{vendor_url}/checkout-sessions",
            json=checkout_req.model_dump(exclude_none=True),
            headers=headers,
        )).json()

        # Step 3: Complete order
        result = (await c.post(
            f"{vendor_url}/checkout-sessions/{checkout['id']}/complete",
            headers={**headers, "Idempotency-Key": str(uuid.uuid4())},
        )).json()

        return result
```

## TypeScript — UCP Checkout (Next.js API Route)

```typescript
// app/api/order/route.ts
export async function POST(req: Request) {
  const { vendorUrl, itemId, quantity } = await req.json()

  // Step 1: Check vendor profile
  const profile = await fetch(`${vendorUrl}/.well-known/ucp`).then(r => r.json())
  console.log('Vendor capabilities:', profile.capabilities)

  // Step 2: Create checkout
  const checkout = await fetch(`${vendorUrl}/checkout-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'UCP-Agent': 'profile="https://my-agent.example/agent"',
      'Idempotency-Key': crypto.randomUUID(),  // Required
    },
    body: JSON.stringify({
      currency: 'USD',
      line_items: [{ quantity, item: { id: itemId } }],
    }),
  }).then(r => r.json())

  // Step 3: Complete order
  const order = await fetch(`${vendorUrl}/checkout-sessions/${checkout.id}/complete`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  }).then(r => r.json())

  return Response.json(order)
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Missing `Idempotency-Key` header | UUID is required on every order request |
| Placing order without checking `/.well-known/ucp` | Always verify vendor capabilities first |
| Processing payment without AP2 | Use `agent-ap2` together when payment is required |
| Reusing the same `Idempotency-Key` | Generate a new UUID for each request |

## Official Docs
Edge cases: https://ucp.dev/
Samples: https://github.com/Universal-Commerce-Protocol/samples

---
name: agent-ucp
description: Use when an AI agent needs to perform e-commerce transactions across vendors — when building agents that browse catalogs, create checkout sessions, or place orders using a standardized protocol regardless of the vendor's specific API.
created: 2026-05-05
updated: 2026-05-05
---

# Agent UCP (Universal Commerce Protocol)

## Overview
UCP는 전자상거래 수명주기(탐색 → 체크아웃 → 주문)를 모듈식 표준으로 정의한다. REST, MCP, A2A 등 어떤 전송 방식을 써도 동일한 스키마로 거래가 가능하다.

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 UCP가 필요한지 확인하라.**
**결제가 필요하면 반드시 `agent-ap2`를 함께 사용하라.**

## Core Concepts

| 개념 | 설명 |
|------|------|
| **Discovery Profile** | `/.well-known/ucp` — 공급업체가 지원하는 기능 선언 |
| **CheckoutSession** | 주문의 단위 — 라인 아이템, 통화, 배송 정보 포함 |
| **LineItem** | 주문 내 개별 상품 (ID, 수량) |
| **Idempotency-Key** | 중복 주문 방지용 UUID 헤더 (필수) |

```
에이전트
  │  GET /.well-known/ucp           ← 공급업체 기능 확인
  │  POST /checkout-sessions        ← 체크아웃 세션 생성
  │  POST /checkout-sessions/{id}/complete  ← 주문 완료
  ▼
공급업체 서버
```

## Python — UCP 체크아웃

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
        # Step 1: 공급업체 UCP 기능 확인
        profile = UcpDiscoveryProfile.model_validate(
            (await c.get(f"{vendor_url}/.well-known/ucp")).json()
        )
        print(f"Vendor capabilities: {profile.capabilities}")

        # Step 2: 체크아웃 세션 생성
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
            "Idempotency-Key": str(uuid.uuid4()),  # 필수 — 중복 주문 방지
        }

        checkout = (await c.post(
            f"{vendor_url}/checkout-sessions",
            json=checkout_req.model_dump(exclude_none=True),
            headers=headers,
        )).json()

        # Step 3: 주문 완료
        result = (await c.post(
            f"{vendor_url}/checkout-sessions/{checkout['id']}/complete",
            headers={**headers, "Idempotency-Key": str(uuid.uuid4())},
        )).json()

        return result
```

## TypeScript — UCP 체크아웃 (Next.js API Route)

```typescript
// app/api/order/route.ts
export async function POST(req: Request) {
  const { vendorUrl, itemId, quantity } = await req.json()

  // Step 1: 공급업체 프로필 확인
  const profile = await fetch(`${vendorUrl}/.well-known/ucp`).then(r => r.json())
  console.log('Vendor capabilities:', profile.capabilities)

  // Step 2: 체크아웃 생성
  const checkout = await fetch(`${vendorUrl}/checkout-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'UCP-Agent': 'profile="https://my-agent.example/agent"',
      'Idempotency-Key': crypto.randomUUID(),  // 필수
    },
    body: JSON.stringify({
      currency: 'USD',
      line_items: [{ quantity, item: { id: itemId } }],
    }),
  }).then(r => r.json())

  // Step 3: 주문 완료
  const order = await fetch(`${vendorUrl}/checkout-sessions/${checkout.id}/complete`, {
    method: 'POST',
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  }).then(r => r.json())

  return Response.json(order)
}
```

## Common Mistakes

| 실수 | 수정 |
|------|------|
| `Idempotency-Key` 헤더 누락 | 모든 주문 요청에 UUID 필수 |
| `/.well-known/ucp` 확인 없이 주문 | 먼저 공급업체 기능 확인 |
| AP2 없이 결제 처리 | 결제 필요 시 `agent-ap2` 함께 사용 |
| 같은 `Idempotency-Key` 재사용 | 요청마다 새 UUID 생성 |

## Official Docs
엣지 케이스: https://ucp.dev/
샘플: https://github.com/Universal-Commerce-Protocol/samples

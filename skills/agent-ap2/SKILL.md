---
name: agent-ap2
description: Use when an AI agent needs to authorize and execute payments autonomously — when implementing spending limits, merchant restrictions, cryptographic approval proof, or audit trails for agentic purchases that require non-repudiation.
---

# Agent AP2 (Agent Payments Protocol)

## Overview
AP2는 에이전트가 결제를 실행할 때 사람이 사전 설정한 가드레일 안에서만 동작하도록 암호화된 위임장과 감사 추적을 제공한다. UCP가 "무엇을 주문할지"라면 AP2는 "그 결제가 승인되었음을 증명한다."

**이 스킬을 쓰기 전에 `agent-protocol-design`으로 AP2가 필요한지 확인하라.**
**AP2는 반드시 UCP(`agent-ucp`)와 함께 사용한다.**

## 3단계 감사 추적

```
관리자              에이전트                    공급업체
  │  IntentMandate    │                             │
  │  (가드레일 설정)   │                             │
  │──────────────────►│                             │
  │                   │  PaymentMandate             │
  │                   │  (구체적 결제 권한 생성)      │
  │◄──────────────────│                             │
  │  서명 (승인)       │                             │
  │──────────────────►│                             │
  │                   │  UCP 완료 + Mandate 첨부    │
  │                   │────────────────────────────►│
  │                   │  PaymentReceipt             │
  │                   │◄────────────────────────────│
```

## Core Concepts

| 개념 | 설명 |
|------|------|
| **IntentMandate** | 관리자가 설정하는 가드레일 (허용 가맹점, 한도, 만료일) |
| **PaymentMandate** | 에이전트가 생성하는 구체적 결제 권한 (금액 바인딩, 암호화 서명) |
| **PaymentReceipt** | 최종 거래 기록 + 감사 추적 (영구 저장 필수) |

## Python — AP2 전체 흐름

```python
# pip install ap2-sdk
from ap2.types.mandate import IntentMandate, PaymentMandate, PaymentMandateContents
from ap2.types.payment_receipt import PaymentReceipt, Success
from ap2.types.common import PaymentItem, PaymentCurrencyAmount
import datetime

# Step 1: 관리자가 IntentMandate 설정 (에이전트 실행 전 1회)
intent = IntentMandate(
    natural_language_description="10 lbs salmon, 3 bottles olive oil",
    merchants=["Example Wholesale", "Fresh Seafood Co"],  # 허용 가맹점
    total_amount_limit=PaymentCurrencyAmount(currency="USD", value=500.00),
    requires_refundability=True,
    user_cart_confirmation_required=False,
    intent_expiry=datetime.datetime(2026, 12, 31).isoformat(),
)

# Step 2: 에이전트가 PaymentMandate 생성 (UCP 체크아웃 후)
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

# Step 3: 관리자 서명 (실제 환경: JWT / 생체 인증 / 하드웨어 키)
mandate.user_authorization = sign_mandate(mandate)  # 구현체에 따라 다름

# Step 4: UCP checkout-sessions/{id}/complete 호출 시 mandate 헤더에 첨부
# AP2-Payment-Mandate: <serialized mandate>

# Step 5: PaymentReceipt 저장 (감사 추적 — 영구 저장 필수)
receipt = PaymentReceipt(
    payment_mandate_id="mandate-abc123",
    payment_id="PAY-001",
    amount=PaymentCurrencyAmount(currency="USD", value=294.00),
    payment_status=Success(merchant_confirmation_id="ORD-A1B2C3"),
)
db.save(receipt)  # 반드시 영구 저장
```

## IntentMandate vs PaymentMandate

| | IntentMandate | PaymentMandate |
|--|--------------|----------------|
| 생성자 | 관리자 (사람) | 에이전트 (자동) |
| 시점 | 에이전트 실행 전 | 구매 직전 |
| 내용 | 가드레일 (허용 범위) | 구체적 금액/가맹점 |
| 서명 | 관리자 | 관리자 (mandate 승인) |

## Common Mistakes

| 실수 | 수정 |
|------|------|
| IntentMandate 없이 PaymentMandate 생성 | IntentMandate가 가드레일 — 반드시 먼저 생성 |
| PaymentReceipt 미저장 | 감사 추적의 핵심 — 반드시 영구 저장 |
| UCP 없이 AP2 단독 사용 | AP2는 UCP 체크아웃 완료 후 결제 승인에 사용 |
| `user_authorization` 서명 없이 전송 | mandate는 반드시 서명 후 전송 |
| IntentMandate 만료 후 결제 시도 | `intent_expiry` 확인 후 갱신 |

## Official Docs
엣지 케이스: https://ap2-protocol.org/
샘플: https://github.com/google-agentic-commerce/AP2

# nova-skills — Superpowers Plugin 적용 설계

**날짜:** 2026-05-03  
**범위:** plugin.json 보강 / CLAUDE.md 추가 / nextjs-tdd 신규 스킬 / 기존 8개 SKILL.md CSO 개선  
**작업 방식:** 영역별 분리 커밋 → GitHub push → 플러그인 업데이트

---

## 1. plugin.json 보강

`version`: 1.1.0 → 1.2.0 (minor bump: 신규 스킬 추가 포함)

추가 필드:
- `homepage`: "https://github.com/skybaer0804/nova-skills"
- `repository`: "https://github.com/skybaer0804/nova-skills"
- `license`: "MIT"
- `keywords`: ["skills", "nextjs", "react", "frontend", "tdd", "accessibility", "performance"]
- `description`: 기존보다 구체적인 스킬 목록 포함

`.claude-plugin/plugin.json`과 `package.json` 버전 일치 유지.

---

## 2. CLAUDE.md (컨트리뷰터 가이드)

개인 플러그인 성격에 맞춘 스킬 품질 가이드. 구성:

### 2.1 AI 에이전트 지침
스킬 수정 전 반드시 읽어야 할 규칙. 스킬 내용은 에이전트 행동을 형성하는 코드이므로 신중하게 다룰 것.

### 2.2 스킬 작성 TDD 규칙 (필수)
superpowers `writing-skills` 방법론 적용:
- **RED**: 스킬 없이 시나리오 실행 → 에이전트 기본 행동(베이스라인) 기록
- **GREEN**: 베이스라인 실패를 해결하는 최소 스킬 작성 → 시나리오 재실행 통과 확인
- **REFACTOR**: 새로운 합리화/허점 발견 시 보완 → 재테스트

테스트 없이 스킬 작성 또는 수정 금지. 이 규칙은 단순한 추가/수정에도 예외 없이 적용.

### 2.3 허용하지 않는 변경
- 테스트(베이스라인 확인) 없는 스킬 수정
- Next.js 프론트엔드와 무관한 범용 스킬 (superpowers에 기여하거나 별도 플러그인으로 분리)
- 프로젝트별 특수 설정 (CLAUDE.md에 넣거나 프로젝트 로컬 스킬로 관리)

### 2.4 스킬 품질 기준 (CSO)
- frontmatter `name`, `description` 필수
- `description`은 "Use when..."으로 시작, 트리거 조건만 기술 (워크플로우 요약 금지)
- 에러 메시지, 증상, 도구명 키워드 본문에 포함
- 코드 예시는 하나의 우수한 예시만 (다국어 중복 금지)

---

## 3. nextjs-tdd 신규 스킬

**파일:** `skills/nextjs-tdd/SKILL.md`

**스택:** Vitest + React Testing Library

**커버 범위:**

| 영역 | 내용 |
|------|------|
| 설정 | `vitest.config.ts`, `@testing-library/jest-dom`, `jsdom` 환경 |
| Server Component | async 렌더 테스트 패턴 (`renderToString` 또는 RSC 모킹) |
| Client Component | `render` + `userEvent` 인터랙션 패턴 |
| Hook | `renderHook` 패턴 |
| TDD 사이클 | RED-GREEN-REFACTOR를 Next.js 컴포넌트에 적용하는 구체적 흐름 |
| Common Mistakes | Server Component를 Client로 잘못 테스트, `act` 누락, async 처리 오류 등 |

**description (CSO):**
```
Use when writing or fixing tests for Next.js components, hooks, or server actions —
before writing implementation code (TDD), or when tests are failing, missing, or flaky.
```

---

## 4. 기존 8개 SKILL.md CSO 개선

**공통 개선 원칙:**
- description: 워크플로우 요약 제거, 트리거 조건/증상 키워드만 남김
- 본문: 에러 메시지·증상·도구명 키워드 보강
- Quick Reference 테이블 유지 또는 보완

**스킬별 주요 개선:**

| 스킬 | 개선 포인트 |
|------|------------|
| nextjs-accessibility-review | description에 "WCAG", "a11y", "screen reader" 키워드 보강 |
| nextjs-component-design | description 트리거 조건 구체화 (Server/Client 결정 시점 명시) |
| nextjs-state-design | "prop drilling", "stale data", "re-render" 증상 키워드 추가 |
| nextjs-design-token-consistency | 전체 검토 후 CSO 적용 |
| nextjs-performance-review | 전체 검토 후 CSO 적용 |
| nextjs-error-boundary | description에 "crash", "runtime error", "error.tsx" 키워드 보강 |
| nextjs-error-logging | description에 "Sentry", "instrumentation.ts", "digest" 키워드 보강 |
| nextjs-user-logging | description에 "analytics", "Core Web Vitals", "sendBeacon" 키워드 보강 |

---

## 5. ~/.claude/skills/ 동기화

nova-skills plugin과 `~/.claude/skills/` 개인 스킬 디렉토리를 동기화:
- 기존 5개 스킬: 개선된 내용으로 업데이트
- 누락 3개 추가: `nextjs-error-boundary`, `nextjs-error-logging`, `nextjs-user-logging`
- 신규 1개 추가: `nextjs-tdd`

---

## 실행 순서 (방법 2 — 영역별 분리 커밋)

1. **Commit 1**: `plugin.json` + `package.json` 버전/메타데이터 보강
2. **Commit 2**: `CLAUDE.md` 추가
3. **Commit 3**: `skills/nextjs-tdd/SKILL.md` 신규 스킬 추가
4. **Commit 4**: 기존 8개 `SKILL.md` CSO 개선
5. **Push** → GitHub remote
6. **Plugin 업데이트** → Claude Code에서 플러그인 갱신
7. **~/.claude/skills/ 동기화**

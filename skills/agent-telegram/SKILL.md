---
name: agent-telegram
description: Use when setting up Telegram ↔ Claude Code integration — bidirectional remote control, notifications, approvals, or file delivery from a local Claude Code session or AI agent process.
created: 2026-05-14
updated: 2026-05-15
---

# Agent Telegram Integration

두 가지 방식이 있다. 목적에 따라 선택한다.

| | **Channels (권장)** | **HTTP Bridge** |
|---|---|---|
| 대상 | Claude Code 실행 중인 맥북 | 에이전트 프로세스 (Node/Python 등) |
| 방향 | 양방향 (명령 ↔ 응답) | 양방향 (notify / approve / receive) |
| 응답 주체 | Claude Code 자체 | 에이전트 코드가 직접 처리 |
| 요구사항 | Bun, Claude Code 실행 중 | Node.js ≥ 20.6, PM2 |
| 권한 | `--dangerously-skip-permissions` 권장 | 해당 없음 |

---

## Approach A — Claude Code Channels (권장)

텔레그램 메시지가 `<channel>` 태그로 Claude Code 세션에 직접 주입된다. Claude가 읽고 도구를 써서 응답한 뒤 `reply` 도구로 텔레그램으로 전송한다.

```
텔레그램 메시지
    ↓
telegram plugin (Bun, MCP 서버)
    ↓  <channel> 태그 주입
Claude Code 세션 (--channels)
    ↓  reply 도구 호출
텔레그램 응답
```

### 설치 (한 번만)

**1. Bun 설치**

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc
```

**2. 플러그인 설치**

```bash
claude plugins install telegram@claude-plugins-official
```

**3. 봇 토큰 설정**

`~/.claude/channels/telegram/.env` 생성:

```bash
mkdir -p ~/.claude/channels/telegram
echo "TELEGRAM_BOT_TOKEN=<BotFather에서_받은_토큰>" > ~/.claude/channels/telegram/.env
chmod 600 ~/.claude/channels/telegram/.env
```

**4. 접근 제어 설정**

`~/.claude/channels/telegram/access.json` 생성:

```json
{
  "dmPolicy": "allowlist",
  "allowFrom": ["<본인_텔레그램_숫자_ID>"],
  "groups": {},
  "ackReaction": "👀",
  "replyToMode": "first",
  "textChunkLimit": 4096,
  "chunkMode": "newline"
}
```

> 본인 텔레그램 ID 확인: `@userinfobot` 에 `/start` 전송
>
> `dmPolicy: "allowlist"` 로 설정해야 등록된 사람만 접근 가능. `pairing`은 임시 상태 — 등록 후 반드시 `allowlist`로 전환.

**5. 플러그인 bun 의존성 설치**

```bash
cd ~/.claude/plugins/cache/claude-plugins-official/telegram/0.0.6
bun install
```

### 실행

```bash
# 직접 실행
claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions

# alias로 등록 (권장)
# ~/.zshrc 에 추가:
alias claude-tg='claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions'
alias claude-dsp='claude --dangerously-skip-permissions'
```

`--dangerously-skip-permissions` 는 원격에서 파일 수정·터미널 실행 등을 허용할 때 필수. 본인만 접근 가능한 allowlist 설정이 전제.

### 채널 동의 프롬프트 스킵

`~/.claude/settings.json` 에 `channelsEnabled: true` 를 추가하면 `--channels` 실행 시 나오는 실험 기능 동의 프롬프트가 자동으로 스킵된다:

```json
{
  "channelsEnabled": true,
  "skipDangerousModePermissionPrompt": true
}
```

### 재부팅 후 자동 시작 (tmux + LaunchAgent)

**전제:** `channelsEnabled: true` 가 `~/.claude/settings.json` 에 설정되어 있어야 한다. 없으면 부팅 시 동의 프롬프트에서 멈춘다.

**시작 스크립트** `~/bin/start-claude-tg.sh`:

```bash
#!/bin/zsh
source ~/.zshrc

if /opt/homebrew/bin/tmux has-session -t claude-tg 2>/dev/null; then
  exit 0
fi

/opt/homebrew/bin/tmux new-session -d -s claude-tg \
  'cd ~ && source ~/.zshrc && claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions'
```

```bash
chmod +x ~/bin/start-claude-tg.sh
```

**LaunchAgent** `~/Library/LaunchAgents/com.<username>.claude-tg.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.<username>.claude-tg</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/zsh</string>
        <string>/Users/<username>/bin/start-claude-tg.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/claude-tg.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/claude-tg.log</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.<username>.claude-tg.plist
```

**세션 확인 및 접속:**

```bash
tmux attach -t claude-tg   # 세션 화면 보기
# 나올 때: Ctrl+B → D (세션 유지)
```

**macOS 파일 접근 권한 (TCC):** LaunchAgent를 통해 tmux가 실행될 때 macOS가 파일 접근 허용 여부를 묻는 다이얼로그를 띄울 수 있다. 이 다이얼로그는 **한 번만 허용하면 이후 재부팅 시에는 나타나지 않는다.** 자동으로 처리하려면:

> **시스템 설정 → 개인 정보 보호 및 보안 → 전체 디스크 접근 권한**  
> → `Terminal.app` + `/opt/homebrew/bin/tmux` 추가

### 컨텍스트 공유 (CLAUDE.md)

LaunchAgent로 시작된 claude-tg 세션은 왜 자신이 시작됐는지 알지 못한다. `~/CLAUDE.md` 를 만들어두면 홈 디렉토리에서 시작하는 모든 Claude 세션이 이를 자동으로 읽는다:

```markdown
# Claude Code - Home Session Context

이 세션은 Telegram 채널 봇 (claude-tg)으로 자동 시작됩니다.
- 실행 명령: `claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions`
- LaunchAgent: `~/Library/LaunchAgents/com.<username>.claude-tg.plist`
- 역할: Telegram 채널 메시지를 받아 처리
```

### 접근 제어 관리

```
# Claude Code 세션 안에서 실행
/telegram:access                         # 현재 상태 확인
/telegram:access allow 412587349         # 사용자 추가
/telegram:access remove 412587349        # 사용자 제거
/telegram:access policy allowlist        # 등록된 사람만 허용 (잠금)
/telegram:access policy pairing          # 신규 페어링 허용 (임시)
```

### Common Mistakes (Channels)

| 실수 | 수정 |
|------|------|
| Bun 미설치 상태에서 플러그인 실행 | `curl -fsSL https://bun.sh/install \| bash` |
| 같은 토큰으로 bot-server.mjs(PM2)와 동시 실행 | PM2 브릿지 먼저 중지: `pm2 stop telegram-bridge` |
| `dmPolicy: "pairing"` 방치 | 등록 완료 후 반드시 `allowlist`로 전환 |
| `--dangerously-skip-permissions` 없이 실행 | 원격 명령 실행 시 권한 프롬프트에 막힘 |
| LaunchAgent가 `/` 디렉토리에서 Claude 시작 | 스크립트에서 `cd ~` 선행 필수 |
| LaunchAgent 부팅 시 채널 동의 프롬프트에서 멈춤 | `~/.claude/settings.json`에 `channelsEnabled: true` 추가 |
| tmux send-keys로 동의 프롬프트 자동 승인 시도 | `channelsEnabled: true`로 대체 — send-keys는 타이밍 문제로 불안정 |
| macOS 파일 접근 다이얼로그가 매 부팅마다 뜸 | 시스템 설정 → 전체 디스크 접근 권한에 `Terminal.app` + `tmux` 추가 |

---

## Approach B — HTTP Bridge (에이전트 코드 통합)

AI 에이전트 프로세스(Node.js, Python 등)가 HTTP로 알림·승인·파일을 텔레그램으로 보내는 방식.

### 아키텍처

```
에이전트 프로세스
    │  POST /send       → 텔레그램 알림
    │  POST /approve    → 승인 버튼 요청
    │  POST /send-photo → 스크린샷 전송
    │  POST /send-file  → 파일 전송
    ▼
bot-server.mjs (sidecar, PM2 관리)
    ↕  grammY long-polling
텔레그램
```

### 설치

```bash
# bot-server.mjs를 프로젝트에 복사
cp <nova-skills>/skills/agent-telegram/bot-server.mjs ./bot-server.mjs
npm install grammy

# .env 생성
cat >> .env <<'EOF'
BOT_TOKEN=<토큰>
AUTHORIZED_USER_ID=<본인_ID>
EOF
echo '.env' >> .gitignore

# 첫 연결 — 봇에게 /start 전송해 Chat ID 등록
node --env-file=.env bot-server.mjs
# 터미널에 "chat ID registered" 출력 확인 후 Ctrl-C

# PM2 등록
pm2 start bot-server.mjs --name telegram-bridge --env-file .env --restart-delay 5000
pm2 save
```

### 에이전트에서 사용

**알림 전송**

```js
async function notify(text, options = {}) {
  try {
    await fetch('http://127.0.0.1:9877/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, options }),
    });
  } catch (err) {
    console.warn('Telegram bridge unavailable:', err.message);
  }
}

await notify('✅ 빌드 완료');
await notify('<b>에러</b>\n<code>Cannot find module</code>');
```

**대화형 승인**

```js
try {
  const res = await fetch('http://127.0.0.1:9877/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: '⚠️ DB 마이그레이션을 실행할까요?',
      request_id: 'migration-001',
      timeout_ms: 300_000,
    }),
  });
  const { approved } = await res.json();
  if (approved) { /* 실행 */ } else { /* 취소 */ }
} catch (err) {
  console.warn('Approval unavailable, defaulting to cancel:', err.message);
}
```

**스크린샷 / 파일**

```js
import { resolve } from 'path';

await fetch('http://127.0.0.1:9877/send-photo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ file_path: resolve('tmp/screenshot.png'), caption: '캡처' }),
});
```

### Common Mistakes (HTTP Bridge)

| 실수 | 수정 |
|------|------|
| PM2 없이 직접 실행 | PM2로 관리해야 자동 재시작 |
| Node.js < 20.6 | `node --version` 확인, 20.6+ 필요 |
| AUTHORIZED_USER_ID 미설정 | 누구나 봇에 명령 가능 |
| `/send-photo` 에 상대 경로 | `path.resolve()` 로 절대 경로 변환 |
| HTML 꺾쇠 문자 미이스케이프 | `<` → `&lt;`, `>` → `&gt;` |
| `.env` git 커밋 | `.gitignore` 에 `.env`, `.telegram-chat-id` 추가 |
| `/approve` fetch에 try/catch 없음 | 봇 재시작 시 ECONNREFUSED 발생 |

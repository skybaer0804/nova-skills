---
name: agent-telegram
description: Use when setting up Telegram ↔ Claude Code integration — bidirectional remote control, notifications, approvals, or file delivery from a local Claude Code session or AI agent process.
created: 2026-05-14
updated: 2026-05-16
---

# Agent Telegram Integration

There are two approaches. Choose based on your use case.

| | **Channels (recommended)** | **HTTP Bridge** |
|---|---|---|
| Target | Mac running Claude Code | Agent process (Node/Python, etc.) |
| Direction | Bidirectional (command ↔ response) | Bidirectional (notify / approve / receive) |
| Responder | Claude Code itself | Agent code handles it directly |
| Requirements | macOS, Bun, Claude Code | Node.js ≥ 20.6, PM2 |
| Permissions | `--dangerously-skip-permissions` recommended | N/A |

---

## Approach A — Claude Code Channels (recommended)

Telegram messages are injected directly into the Claude Code session via `<channel>` tags. Claude reads them, uses tools to respond, then sends the response back via the `reply` tool.

```
Telegram message
    ↓
telegram plugin (Bun, MCP server)
    ↓  <channel> tag injection
Claude Code session (--channels)
    ↓  reply tool call
Telegram response
```

### Setup: run the deterministic installer — do NOT hand-roll

Provisioning is a deterministic, idempotent, self-verifying installer. **Do not
hand-execute the individual steps** (writing the start script, plist, patching
`settings.json`/`~/.claude.json`, warming caches by hand). Hand-rolled setups
reliably miss the workspace **trust dialog**, the crash **watchdog**, npx
**cold-start** failures, the version-matched browser, and Intel-vs-Apple-Silicon
paths — and are not re-runnable or verifiable.

```bash
git clone https://github.com/skybaer0804/claude-tg-bootstrap
cd claude-tg-bootstrap
./install.sh            # idempotent + self-verifying; safe to re-run
./install.sh --dry-run  # preview, mutates nothing
./install.sh --check    # verification only (PASS/FAIL gate)
```

Override defaults (session name, LaunchAgent label, watchdog interval, plugin
set) by copying `config.example.sh` → `config.sh` first.

**What the installer guarantees (and a hand-roll typically misses):**

| Guarantee | Why a hand-roll fails without it |
|-----------|----------------------------------|
| `~/.claude.json` workspace trust **pre-accepted** | Fresh LaunchAgent session blocks on the trust dialog at boot with nobody to answer |
| LaunchAgent `RunAtLoad` **+ `StartInterval` watchdog** (`bootout`/`bootstrap`, not deprecated `load`) | Bot dies → stays dead until reboot |
| `channelsEnabled` + `skipDangerousModePermissionPrompt` in `settings.json` | Stalls at the channel/dangerous-mode consent prompt |
| Plugins + Bun deps; `npx` caches warmed (`@playwright/mcp`, `@upstash/context7-mcp`) | First boot shows "N MCP servers failed" (npx cold-start timeout) |
| Version-matched Chromium in the shared Playwright cache | Browser tools fail on first use |
| Homebrew prefix autodetected (Apple Silicon **and** Intel) | Hardcoded `/opt/homebrew` breaks on Intel Macs |
| `verify.sh` PASS/FAIL gate + `./uninstall.sh` rollback | No way to confirm the setup or undo it |

### Manual steps (security boundary — cannot be automated)

The installer guides these but cannot perform them:

1. **Bot token** — installer prompts once, or set `TELEGRAM_BOT_TOKEN` and pass `--yes`. Get it from [@BotFather](https://t.me/BotFather).
2. **Telegram pairing** — send `/start` to your bot, then in a Claude session run `/telegram:access policy allowlist`. (Auto-approving a pairing from an inbound message is the exact shape of a prompt-injection attack — never automate it.)
3. **Claude login** — run `claude` once and authenticate if not already logged in.

Then `./install.sh --check` should report all checks PASS.

### Rollback

```bash
./uninstall.sh          # launchctl bootout, kill session, restore *.bak-*
./uninstall.sh --purge  # also remove start script + plist
```

### Access control management

```
# Run inside a Claude Code session
/telegram:access                  # Check current status
/telegram:access allow 412587349  # Add a user
/telegram:access remove 412587349 # Remove a user
/telegram:access policy allowlist # Only registered users (locked)
/telegram:access policy pairing   # Allow new pairings (temporary)
```

### Common Mistakes (Channels)

| Mistake | Fix |
|---------|-----|
| Hand-rolling the start script / plist / JSON patches instead of the installer | Run `./install.sh` — hand-rolls drift and miss trust/watchdog/npx/Chromium |
| Boot stalls at the **workspace trust dialog** | `hasTrustDialogAccepted` not set — re-run `./install.sh` (installer pre-accepts it) |
| Boot stalls at the channel consent prompt | `channelsEnabled: true` missing in `~/.claude/settings.json` |
| Bot dies and stays dead until reboot | LaunchAgent has only `RunAtLoad`, no `StartInterval` watchdog — re-run `./install.sh` |
| `KeepAlive` used as the watchdog | Wrong: the start script spawns a detached tmux session and exits, so launchd loop-respawns it. Use `StartInterval` + an idempotent `has-session`-guarded script |
| "N MCP servers failed" on first boot | `npx` cold-start timeout — installer warms the caches; re-run if seen |
| Following docs that say `launchctl load` | Deprecated — the installer uses `bootout`/`bootstrap` |
| Hardcoded `/opt/homebrew/bin/tmux` on an Intel Mac | Installer autodetects via `brew --prefix` |
| `PLAYWRIGHT_BROWSERS_PATH=0` when pre-installing Chromium | Installs into the npx dir the MCP never reads; let the installer use the shared cache |
| Running without `--dangerously-skip-permissions` | Remote commands blocked by permission prompts (allowlist must be in place first) |
| Running `bot-server.mjs` (PM2) with the same token simultaneously | Telegram long-polling conflict — stop one: `pm2 stop telegram-bridge` |
| Leaving `dmPolicy: "pairing"` in place | After registration, switch to `allowlist` |

---

## Approach B — HTTP Bridge (agent code integration)

An AI agent process (Node.js, Python, etc.) sends notifications, approvals, and files to Telegram via HTTP.

### Architecture

```
Agent process
    │  POST /send       → Telegram notification
    │  POST /approve    → Approval button request
    │  POST /send-photo → Screenshot delivery
    │  POST /send-file  → File delivery
    ▼
bot-server.mjs (sidecar, managed by PM2)
    ↕  grammY long-polling
Telegram
```

### Setup

```bash
# Copy bot-server.mjs to your project
cp <nova-skills>/skills/agent-telegram/bot-server.mjs ./bot-server.mjs
npm install grammy

# Create .env
cat >> .env <<'EOF'
BOT_TOKEN=<token>
AUTHORIZED_USER_ID=<your_id>
EOF
echo '.env' >> .gitignore

# Initial connection — send /start to the bot to register Chat ID
node --env-file=.env bot-server.mjs
# Confirm "chat ID registered" output in terminal, then Ctrl-C

# Register with PM2
pm2 start bot-server.mjs --name telegram-bridge --env-file .env --restart-delay 5000
pm2 save
```

### Usage from agent code

**Send notification**

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

await notify('✅ Build complete');
await notify('<b>Error</b>\n<code>Cannot find module</code>');
```

**Interactive approval**

```js
try {
  const res = await fetch('http://127.0.0.1:9877/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: '⚠️ Run DB migration?',
      request_id: 'migration-001',
      timeout_ms: 300_000,
    }),
  });
  const { approved } = await res.json();
  if (approved) { /* execute */ } else { /* cancel */ }
} catch (err) {
  console.warn('Approval unavailable, defaulting to cancel:', err.message);
}
```

**Screenshot / file**

```js
import { resolve } from 'path';

await fetch('http://127.0.0.1:9877/send-photo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ file_path: resolve('tmp/screenshot.png'), caption: 'Screenshot' }),
});
```

### Common Mistakes (HTTP Bridge)

| Mistake | Fix |
|---------|-----|
| Running directly without PM2 | Must use PM2 for automatic restarts |
| Node.js < 20.6 | Check with `node --version`; requires 20.6+ |
| AUTHORIZED_USER_ID not set | Anyone can send commands to the bot |
| Relative path in `/send-photo` | Convert to absolute path with `path.resolve()` |
| Unescaped HTML angle brackets | `<` → `&lt;`, `>` → `&gt;` |
| Committing `.env` to git | Add `.env`, `.telegram-chat-id` to `.gitignore` |
| No try/catch on `/approve` fetch | Will throw ECONNREFUSED when bot restarts |

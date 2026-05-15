---
name: agent-telegram
description: Use when setting up Telegram ↔ Claude Code integration — bidirectional remote control, notifications, approvals, or file delivery from a local Claude Code session or AI agent process.
created: 2026-05-14
updated: 2026-05-15
---

# Agent Telegram Integration

There are two approaches. Choose based on your use case.

| | **Channels (recommended)** | **HTTP Bridge** |
|---|---|---|
| Target | MacBook running Claude Code | Agent process (Node/Python, etc.) |
| Direction | Bidirectional (command ↔ response) | Bidirectional (notify / approve / receive) |
| Responder | Claude Code itself | Agent code handles it directly |
| Requirements | Bun, Claude Code running | Node.js ≥ 20.6, PM2 |
| Permissions | `--dangerously-skip-permissions` recommended | N/A |

---

## Approach A — Claude Code Channels (recommended)

Telegram messages are injected directly into the Claude Code session via `<channel>` tags. Claude reads them, uses tools to respond, then sends the response back to Telegram via the `reply` tool.

```
Telegram message
    ↓
telegram plugin (Bun, MCP server)
    ↓  <channel> tag injection
Claude Code session (--channels)
    ↓  reply tool call
Telegram response
```

### Setup (one-time)

**1. Install Bun**

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.zshrc
```

**2. Install the plugin**

```bash
claude plugins install telegram@claude-plugins-official
```

**3. Set the bot token**

Create `~/.claude/channels/telegram/.env`:

```bash
mkdir -p ~/.claude/channels/telegram
echo "TELEGRAM_BOT_TOKEN=<token_from_BotFather>" > ~/.claude/channels/telegram/.env
chmod 600 ~/.claude/channels/telegram/.env
```

**4. Configure access control**

Create `~/.claude/channels/telegram/access.json`:

```json
{
  "dmPolicy": "allowlist",
  "allowFrom": ["<your_telegram_numeric_id>"],
  "groups": {},
  "ackReaction": "👀",
  "replyToMode": "first",
  "textChunkLimit": 4096,
  "chunkMode": "newline"
}
```

> To find your Telegram ID: send `/start` to `@userinfobot`
>
> Set `dmPolicy: "allowlist"` so only registered users can access. `pairing` is a temporary state — always switch to `allowlist` after registration.

**5. Install plugin bun dependencies**

```bash
cd ~/.claude/plugins/cache/claude-plugins-official/telegram/0.0.6
bun install
```

### Running

```bash
# Run directly
claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions

# Register as alias (recommended) — pick your own alias name
# Add to ~/.zshrc:
alias claude-bridge='claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions'
```

`--dangerously-skip-permissions` is required to allow remote file edits and terminal execution. This assumes allowlist access control is in place.

### Skip channel consent prompt

Adding `channelsEnabled: true` to `~/.claude/settings.json` automatically skips the experimental feature consent prompt that appears when running with `--channels`:

```json
{
  "channelsEnabled": true,
  "skipDangerousModePermissionPrompt": true
}
```

### Auto-start after reboot (tmux + LaunchAgent)

**Prerequisite:** `channelsEnabled: true` must be set in `~/.claude/settings.json`. Without it, the process will stall at the consent prompt on boot.

**Start script** `~/bin/start-claude-bridge.sh`:

```bash
#!/bin/zsh
source ~/.zshrc

if /opt/homebrew/bin/tmux has-session -t claude-bridge 2>/dev/null; then
  exit 0
fi

/opt/homebrew/bin/tmux new-session -d -s claude-bridge \
  'cd ~ && source ~/.zshrc && claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions'
```

```bash
chmod +x ~/bin/start-claude-bridge.sh
```

**LaunchAgent** `~/Library/LaunchAgents/com.example.claude-bridge.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.example.claude-bridge</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/zsh</string>
        <string>/Users/<username>/bin/start-claude-bridge.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/claude-bridge.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/claude-bridge.log</string>
</dict>
</plist>
```

```bash
launchctl load ~/Library/LaunchAgents/com.example.claude-bridge.plist
```

**Viewing and attaching to the session:**

```bash
tmux attach -t claude-bridge   # View session
# To detach: Ctrl+B → D (session stays alive)
```

**macOS file access permissions (TCC):** When tmux is launched via LaunchAgent, macOS may show a dialog asking whether to allow file access. **You only need to allow it once — it will not appear again after subsequent reboots.** To handle this automatically:

> **System Settings → Privacy & Security → Full Disk Access**  
> → Add `Terminal.app` + `/opt/homebrew/bin/tmux`

### Context sharing (CLAUDE.md)

A session started by LaunchAgent has no inherent knowledge of why it was launched. Document its purpose (start command, LaunchAgent label, role) in your project `CLAUDE.md` or `~/CLAUDE.md` so every session started from that directory reads it automatically.

### Access Control Management

```
# Run inside a Claude Code session
/telegram:access                         # Check current status
/telegram:access allow 412587349         # Add a user
/telegram:access remove 412587349        # Remove a user
/telegram:access policy allowlist        # Allow only registered users (locked)
/telegram:access policy pairing          # Allow new pairings (temporary)
```

### Common Mistakes (Channels)

| Mistake | Fix |
|---------|-----|
| Running the plugin without Bun installed | `curl -fsSL https://bun.sh/install \| bash` |
| Running bot-server.mjs (PM2) simultaneously with the same token | Stop the PM2 bridge first: `pm2 stop telegram-bridge` |
| Leaving `dmPolicy: "pairing"` in place | After registration, always switch to `allowlist` |
| Running without `--dangerously-skip-permissions` | Remote commands will be blocked by permission prompts |
| LaunchAgent starts Claude from `/` directory | Must `cd ~` first in the start script |
| LaunchAgent stalls at channel consent prompt on boot | Add `channelsEnabled: true` to `~/.claude/settings.json` |
| Trying to auto-approve consent prompt via tmux send-keys | Replace with `channelsEnabled: true` — send-keys is unreliable due to timing issues |
| macOS file access dialog appears on every reboot | Add `Terminal.app` + `tmux` to System Settings → Full Disk Access |

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

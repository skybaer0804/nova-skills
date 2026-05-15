#!/usr/bin/env node
// AI Agent Telegram Bridge — sidecar process
// Requirements: Node.js >= 20.6 (--env-file support), grammy installed
// Usage: BOT_TOKEN=xxx node bot-server.mjs
//        OR: node --env-file=.env bot-server.mjs  (Node >= 20.6)
// Env vars:
//   BOT_TOKEN          (required) — from BotFather
//   AUTHORIZED_USER_ID (strongly recommended) — your Telegram user ID
//   BOT_PORT           (default 9877) — local HTTP bridge port

import { Bot, InlineKeyboard, InputFile } from 'grammy';
import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve as resolvePath } from 'path';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) { console.error('[telegram] BOT_TOKEN not set — add it to .env'); process.exit(1); }

const PORT = Number(process.env.BOT_PORT ?? 9877);
const CHAT_ID_FILE = resolvePath('.telegram-chat-id');
const AUTHORIZED_USER = process.env.AUTHORIZED_USER_ID;

let chatId = existsSync(CHAT_ID_FILE) ? readFileSync(CHAT_ID_FILE, 'utf-8').trim() : null;

// requestId → { resolve, timeout }
const pendingApprovals = new Map();

// ── Bot ────────────────────────────────────────────────────────────────────────
const bot = new Bot(BOT_TOKEN);

if (AUTHORIZED_USER) {
  bot.use((ctx, next) => {
    if (String(ctx.from?.id) !== String(AUTHORIZED_USER)) return;
    return next();
  });
} else {
  console.warn('[telegram] ⚠️ AUTHORIZED_USER_ID not set — anyone can control this bot');
}

bot.command('start', async ctx => {
  chatId = String(ctx.chat.id);
  writeFileSync(CHAT_ID_FILE, chatId);
  await ctx.reply(
    `✅ Connected!\nChat ID: <code>${chatId}</code>\nAgent notifications will be delivered here.`,
    { parse_mode: 'HTML' }
  );
  console.log(`[telegram] chat ID registered: ${chatId}`);
});

bot.command('status', async ctx => {
  await ctx.reply(`🟢 Bridge running | Port: ${PORT} | Chat ID: ${chatId ?? 'unregistered'}`);
});

bot.on('callback_query:data', async ctx => {
  const [action, requestId] = (ctx.callbackQuery.data ?? '').split(':');
  await ctx.answerCallbackQuery();
  const pending = pendingApprovals.get(requestId);
  if (!pending) {
    await ctx.editMessageText('⚠️ This request has expired.');
    return;
  }
  clearTimeout(pending.timeout);
  pendingApprovals.delete(requestId);
  await ctx.editMessageText(action === 'approve' ? '✅ Approved' : '❌ Rejected');
  pending.resolve(action === 'approve');
});

bot.catch(err => console.error('[telegram] bot error:', err.message));

// Heartbeat — warn on silent polling failure (no update in 2 min)
// NOTE: fires even when healthy but quiet; treat as a diagnostic signal, not an alert.
let lastActivity = Date.now();
bot.use((ctx, next) => { lastActivity = Date.now(); return next(); });
setInterval(() => {
  if (Date.now() - lastActivity > 120_000)
    console.warn('[telegram] ⚠️ No updates for 2 min (normal for a quiet bot — if messages stop flowing, pm2 restart)');
}, 60_000);

// ── HTTP bridge (agent → bot) ──────────────────────────────────────────────────
const server = createServer((req, res) => {
  if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
  const ct = req.headers['content-type'] ?? '';
  if (!ct.includes('application/json')) {
    res.writeHead(415, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Content-Type must be application/json' }));
    return;
  }
  let body = '';
  req.on('data', c => (body += c));
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const target = chatId;

      if (req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, chatId }));
        return;
      }

      if (!target) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Chat ID unregistered — send /start to the bot first' }));
        return;
      }

      let result;
      switch (req.url) {
        case '/send': {
          const text = String(data.text ?? '');
          // Always chunk: Telegram max 4096 chars per message
          const chunks = text.match(/[\s\S]{1,4000}/g) ?? ['(empty message)'];
          for (const chunk of chunks)
            await bot.api.sendMessage(target, chunk, { parse_mode: 'HTML', ...data.options });
          result = { ok: true, chunks: chunks.length };
          break;
        }
        case '/send-photo': {
          // Use InputFile for local paths — handles spaces and special chars correctly
          const abs = resolvePath(data.file_path);
          result = await bot.api.sendPhoto(target, new InputFile(abs), { caption: data.caption });
          break;
        }
        case '/send-file': {
          const abs = resolvePath(data.file_path);
          result = await bot.api.sendDocument(target, new InputFile(abs), { caption: data.caption });
          break;
        }
        case '/approve': {
          const requestId = data.request_id ?? String(Date.now());
          const timeoutMs = data.timeout_ms ?? 300_000;
          const keyboard = new InlineKeyboard()
            .text('✅ Approve', `approve:${requestId}`)
            .text('❌ Reject', `reject:${requestId}`);
          await bot.api.sendMessage(target, data.prompt ?? 'Approval required.', { reply_markup: keyboard });
          const approved = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              pendingApprovals.delete(requestId);
              reject(new Error(`Approval timeout (${timeoutMs}ms)`));
            }, timeoutMs);
            pendingApprovals.set(requestId, { resolve, timeout });
          });
          result = { approved };
          break;
        }
        default:
          res.writeHead(404); res.end(); return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, '127.0.0.1', () =>
  console.log(`[telegram] bridge listening on 127.0.0.1:${PORT}`)
);

// ── Polling with reconnect loop ────────────────────────────────────────────────
async function startWithReconnect() {
  while (true) {
    try {
      console.log('[telegram] polling started…');
      await bot.start({
        onStart: info =>
          console.log(`[telegram] bot running: @${info.username} — if this is the first time, send /start`),
      });
    } catch (err) {
      console.error(`[telegram] polling stopped (${err.message}) — restarting in 5s`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

startWithReconnect();

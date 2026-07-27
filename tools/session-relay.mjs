#!/usr/bin/env node
/**
 * Study session relay (HTTP + SSE) — participant ↔ facilitator.
 *
 *   node tools/session-relay.mjs
 *
 * Main (participant):  merlin-hifi.html?session=maya
 * Facilitator:         merlin-hifi.html?session=maya&role=watch
 * Hub:                 study.html
 */
import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 8769);
const STALE_MS = 8000;
const rooms = new Map();

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function getRoom(id) {
  if (!rooms.has(id)) {
    rooms.set(id, {
      state: null,
      clients: new Set(),
      presence: { participant: 0, watch: 0 }
    });
  }
  return rooms.get(id);
}

function presenceSnapshot(room) {
  const now = Date.now();
  return {
    participant: now - room.presence.participant < STALE_MS,
    watch: now - room.presence.watch < STALE_MS,
    participantAgo: room.presence.participant ? now - room.presence.participant : null,
    watchAgo: room.presence.watch ? now - room.presence.watch : null
  };
}

function envelope(room) {
  return {
    ...(room.state || { screen: null }),
    presence: presenceSnapshot(room)
  };
}

function broadcast(id) {
  const room = getRoom(id);
  const data = `data: ${JSON.stringify(envelope(room))}\n\n`;
  for (const client of room.clients) {
    try { client.write(data); } catch (_) { room.clients.delete(client); }
  }
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      rooms: [...rooms.entries()].map(([id, r]) => ({
        id,
        presence: presenceSnapshot(r),
        screen: r.state?.screen || null
      })),
      hint: 'POST /r/:id  GET /r/:id  GET /r/:id/stream  POST /r/:id/ping'
    }));
    return;
  }

  if (parts[0] === 'r' && parts[1]) {
    const id = parts[1].toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
    if (!id) {
      res.writeHead(400); res.end('bad id'); return;
    }
    const room = getRoom(id);

    // Lightweight presence ping (no state overwrite)
    if (req.method === 'POST' && parts[2] === 'ping') {
      try {
        const raw = await readBody(req);
        const body = JSON.parse(raw || '{}');
        const role = body.role === 'watch' ? 'watch' : 'participant';
        room.presence[role] = Date.now();
        broadcast(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, presence: presenceSnapshot(room) }));
      } catch (e) {
        res.writeHead(400); res.end(String(e.message || e));
      }
      return;
    }

    if (req.method === 'POST' && parts.length === 2) {
      try {
        const raw = await readBody(req);
        const state = JSON.parse(raw || '{}');
        const role = state.role === 'watch' ? 'watch' : 'participant';
        room.presence[role] = Date.now();
        state.session = id;
        state.role = role;
        state.ts = state.ts || Date.now();
        room.state = state;
        broadcast(id);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, presence: presenceSnapshot(room) }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(String(e.message || e));
      }
      return;
    }

    if (req.method === 'GET' && parts.length === 2) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(envelope(room)));
      return;
    }

    if (req.method === 'GET' && parts[2] === 'stream') {
      const role = url.searchParams.get('role') === 'watch' ? 'watch' : 'participant';
      room.presence[role] = Date.now();
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.write(': connected\n\n');
      res.write(`data: ${JSON.stringify(envelope(room))}\n\n`);
      room.clients.add(res);
      const ping = setInterval(() => {
        try {
          room.presence[role] = Date.now();
          res.write(`data: ${JSON.stringify(envelope(room))}\n\n`);
        } catch (_) {
          clearInterval(ping);
        }
      }, 3000);
      req.on('close', () => {
        clearInterval(ping);
        room.clients.delete(res);
      });
      return;
    }
  }

  res.writeHead(404); res.end('not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Study session relay on http://0.0.0.0:${PORT}`);
  console.log('Main: ?session=NAME   Facilitator: ?session=NAME&role=watch');
});

#!/usr/bin/env node
/**
 * One command for studies: static site + live session relay.
 *
 *   node tools/serve-study.mjs
 *
 * Then open http://localhost:8767/study.html
 * Phone on same Wi‑Fi: http://YOUR-LAN-IP:8767/study.html
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8767);
const STALE_MS = 8000;
const rooms = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.map': 'application/json'
};

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
    rooms.set(id, { state: null, clients: new Set(), presence: { participant: 0, watch: 0 } });
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
  return { ...(room.state || { screen: null }), presence: presenceSnapshot(room) };
}

function broadcast(id) {
  const room = getRoom(id);
  const data = `data: ${JSON.stringify(envelope(room))}\n\n`;
  for (const client of room.clients) {
    try { client.write(data); } catch (_) { room.clients.delete(client); }
  }
}

async function handleRelay(req, res, url) {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return true; }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      rooms: [...rooms.entries()].map(([id, r]) => ({
        id, presence: presenceSnapshot(r), screen: r.state?.screen || null
      }))
    }));
    return true;
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'r' || !parts[1]) return false;

  const id = parts[1].toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 32);
  if (!id) { res.writeHead(400); res.end('bad id'); return true; }
  const room = getRoom(id);

  if (req.method === 'POST' && parts[2] === 'ping') {
    const body = JSON.parse((await readBody(req)) || '{}');
    const role = body.role === 'watch' ? 'watch' : 'participant';
    room.presence[role] = Date.now();
    broadcast(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, presence: presenceSnapshot(room) }));
    return true;
  }

  if (req.method === 'POST' && parts.length === 2) {
    const state = JSON.parse((await readBody(req)) || '{}');
    const role = state.role === 'watch' ? 'watch' : 'participant';
    room.presence[role] = Date.now();
    state.session = id;
    state.role = role;
    state.ts = state.ts || Date.now();
    room.state = state;
    broadcast(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, presence: presenceSnapshot(room) }));
    return true;
  }

  if (req.method === 'GET' && parts.length === 2) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(envelope(room)));
    return true;
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
      } catch (_) { clearInterval(ping); }
    }, 3000);
    req.on('close', () => { clearInterval(ping); room.clients.delete(res); });
    return true;
  }

  return false;
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const rel = decoded === '/' ? '/study.html' : decoded;
  const full = path.normalize(path.join(ROOT, rel));
  if (!full.startsWith(ROOT)) return null;
  return full;
}

function lanUrls() {
  const out = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(`http://${net.address}:${PORT}`);
    }
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (await handleRelay(req, res, url)) return;

    let file = safePath(url.pathname);
    if (!file) { res.writeHead(403); res.end('forbidden'); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404); res.end('not found'); return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    res.writeHead(500); res.end(String(e.message || e));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\nMerle study server on http://localhost:${PORT}`);
  console.log(`Hub:  http://localhost:${PORT}/study.html`);
  for (const u of lanUrls()) console.log(`LAN:  ${u}/study.html`);
  console.log(`\nMain link example:        …/merlin-hifi.html?session=maya`);
  console.log(`Facilitator link example: …/merlin-hifi.html?session=maya&role=watch\n`);
});

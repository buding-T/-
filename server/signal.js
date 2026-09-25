// WebRTC 信令服务器
// 职责：房间号匹配、在房主与房客之间中转 SDP/ICE，不参与任何游戏逻辑。
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8080);
// 去除容易混淆的字符（0/O、1/I 等）
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ2345679';
/** @type {Map<string, {host: import('ws').WebSocket, guest: import('ws').WebSocket | null}>} */
const rooms = new Map();

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function genCode() {
  let code;
  do {
    code = Array.from(
      { length: 4 },
      () => CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0],
    ).join('');
  } while (rooms.has(code));
  return code;
}

const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET' && req.url === '/health') {
    res.end('ok');
    return;
  }
  res.statusCode = 404;
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  if (req.url !== '/ws') {
    ws.close(1008, 'bad path');
    return;
  }
  ws.roomCode = null;
  ws.role = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.t) {
      case 'create': {
        if (ws.roomCode) return;
        const code = genCode();
        rooms.set(code, { host: ws, guest: null });
        ws.roomCode = code;
        ws.role = 'host';
        send(ws, { t: 'created', code });
        console.log(`[room] created ${code} (rooms: ${rooms.size})`);
        break;
      }
      case 'join': {
        if (ws.roomCode) return;
        const code = String(msg.code || '').toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          send(ws, { t: 'error', message: '房间不存在' });
          return;
        }
        if (room.guest) {
          send(ws, { t: 'error', message: '房间已满' });
          return;
        }
        room.guest = ws;
        ws.roomCode = code;
        ws.role = 'guest';
        send(ws, { t: 'joined', code });
        send(room.host, { t: 'guest-joined' });
        console.log(`[room] guest joined ${code}`);
        break;
      }
      case 'signal': {
        const room = rooms.get(ws.roomCode);
        if (!room) return;
        const target = room.host === ws ? room.guest : room.host;
        send(target, { t: 'signal', payload: msg.payload });
        break;
      }
      default:
        break;
    }
  });

  ws.on('close', () => {
    const code = ws.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    if (ws.role === 'host') {
      if (room.guest) send(room.guest, { t: 'host-left' });
      rooms.delete(code);
      console.log(`[room] closed ${code} (host left)`);
    } else if (room.host) {
      room.guest = null;
      send(room.host, { t: 'guest-left' });
      console.log(`[room] guest left ${code}`);
    }
  });

  ws.on('error', () => {});
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`signaling server listening on ws://0.0.0.0:${PORT}/ws`);
});

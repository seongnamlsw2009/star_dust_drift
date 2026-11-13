// 테스트용: Upstash REST API 흉내 (API가 쓰는 명령만)
import http from 'node:http';

export function startFakeRedis() {
  const db = new Map();
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      if (req.headers.authorization !== 'Bearer test-token') { res.writeHead(401); res.end('{"error":"unauthorized"}'); return; }
      const [cmd, k, v, ...opt] = JSON.parse(body);
      let result = null;
      switch (cmd.toUpperCase()) {
        case 'GET': result = db.has(k) ? db.get(k) : null; break;
        case 'SET':
          if (opt.includes('NX') && db.has(k)) result = null;
          else { db.set(k, v); result = 'OK'; }
          break;
        case 'DEL': result = db.delete(k) ? 1 : 0; break;
        case 'INCR': result = (+(db.get(k) || 0)) + 1; db.set(k, String(result)); break;
        case 'EXPIRE': result = db.has(k) ? 1 : 0; break;
        default: res.writeHead(400); res.end(JSON.stringify({ error: 'unknown ' + cmd })); return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result }));
    });
  });
  return new Promise(r => server.listen(0, '127.0.0.1', () => {
    process.env.KV_REST_API_URL = `http://127.0.0.1:${server.address().port}`;
    process.env.KV_REST_API_TOKEN = 'test-token';
    r({ db, close: () => server.close() });
  }));
}

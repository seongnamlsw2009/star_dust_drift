import { redis } from './redis.js';

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
export const fail = (status, error) => json({ error }, status);

// 본문을 JSON으로 읽는다. 크기 제한을 넘거나 형식이 틀리면 null.
export async function readJson(request, maxBytes) {
  const text = await request.text();
  if (Buffer.byteLength(text) > maxBytes) return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch { return null; }
}

export function clientIp(request) {
  const f = request.headers.get('x-forwarded-for') || '';
  return f.split(',')[0].trim() || 'unknown';
}

// 고정 창 방식의 간단한 요청 횟수 제한. 한도를 넘으면 true.
export async function rateLimited(bucket, limit, windowSec) {
  const k = `rl:${bucket}`;
  const n = await redis('INCR', k);
  if (n === 1) await redis('EXPIRE', k, windowSec);
  return n > limit;
}

// 예기치 못한 오류를 500으로 바꿔 준다.
export function handle(fn) {
  return async request => {
    try { return await fn(request); }
    catch (e) { console.error(e); return fail(500, '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'); }
  };
}

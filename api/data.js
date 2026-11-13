import { redis } from '../lib/redis.js';
import { sessionUser } from '../lib/auth.js';
import { json, fail, readJson, handle } from '../lib/http.js';

const MAX_BYTES = 64 * 1024;
const UNAUTH = '로그인이 필요합니다.';

// GET /api/data → { data, updatedAt }
export const GET = handle(async request => {
  const key = await sessionUser(request);
  if (!key) return fail(401, UNAUTH);
  const saved = await redis('GET', `data:${key}`);
  const { data = null, updatedAt = 0 } = saved ? JSON.parse(saved) : {};
  return json({ data, updatedAt });
});

// PUT /api/data { data } → { updatedAt }
export const PUT = handle(async request => {
  const key = await sessionUser(request);
  if (!key) return fail(401, UNAUTH);
  const body = await readJson(request, MAX_BYTES);
  const data = body && body.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(400, '플레이 데이터 형식이 올바르지 않습니다.');
  const updatedAt = Date.now();
  await redis('SET', `data:${key}`, JSON.stringify({ data, updatedAt }));
  return json({ updatedAt });
});

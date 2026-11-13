import { redis } from '../lib/redis.js';
import { normalizeName, nameKey, validPassword, hashPassword, verifyPassword, createSession } from '../lib/auth.js';
import { json, fail, readJson, clientIp, rateLimited, handle } from '../lib/http.js';

const BAD = '닉네임 또는 비밀번호가 올바르지 않습니다.';

// POST /api/login { name, password } → { token, name, data, updatedAt }
export const POST = handle(async request => {
  const body = await readJson(request, 2048);
  if (!body) return fail(400, '잘못된 요청입니다.');
  const name = normalizeName(body.name);
  if (!name || !validPassword(body.password)) return fail(401, BAD);
  const key = nameKey(name);
  if (await rateLimited(`login:${clientIp(request)}`, 30, 600) ||
      await rateLimited(`login:${key}`, 10, 600)) {
    return fail(429, '로그인 시도가 너무 많습니다. 10분 후 다시 시도해 주세요.');
  }

  const raw = await redis('GET', `user:${key}`);
  if (!raw) { await hashPassword(body.password); return fail(401, BAD); } // 응답 시간으로 가입 여부가 드러나지 않도록
  const user = JSON.parse(raw);
  if (!(await verifyPassword(body.password, user.salt, user.hash))) return fail(401, BAD);

  const token = await createSession(key);
  const saved = await redis('GET', `data:${key}`);
  const { data = null, updatedAt = 0 } = saved ? JSON.parse(saved) : {};
  return json({ token, name: user.name, data, updatedAt });
});

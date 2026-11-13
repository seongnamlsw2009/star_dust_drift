import { redis } from '../lib/redis.js';
import { normalizeName, nameKey, validPassword, hashPassword, createSession } from '../lib/auth.js';
import { json, fail, readJson, clientIp, rateLimited, handle } from '../lib/http.js';

// POST /api/register { name, password } → { token, name, data: null }
export const POST = handle(async request => {
  const body = await readJson(request, 2048);
  if (!body) return fail(400, '잘못된 요청입니다.');
  const name = normalizeName(body.name);
  if (!name) return fail(400, '닉네임은 한글·영문·숫자·밑줄로 2~12자여야 합니다.');
  if (!validPassword(body.password)) return fail(400, '비밀번호는 6~64자여야 합니다.');
  if (await rateLimited(`reg:${clientIp(request)}`, 5, 3600)) return fail(429, '가입 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.');

  const key = nameKey(name);
  const { salt, hash } = await hashPassword(body.password);
  const user = JSON.stringify({ name, salt, hash, createdAt: Date.now() });
  const ok = await redis('SET', `user:${key}`, user, 'NX');
  if (ok !== 'OK') return fail(409, '이미 사용 중인 닉네임입니다.');

  const token = await createSession(key);
  return json({ token, name, data: null, updatedAt: 0 }, 201);
});

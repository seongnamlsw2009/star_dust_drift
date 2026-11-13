import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { redis } from './redis.js';

const scrypt = promisify(scryptCb);
export const SESSION_TTL = 60 * 60 * 24 * 30; // 30일
const NAME_RE = /^[가-힣A-Za-z0-9_]{2,12}$/u;

export function normalizeName(name) {
  if (typeof name !== 'string') return null;
  const n = name.normalize('NFC').trim();
  return NAME_RE.test(n) ? n : null;
}
export const nameKey = n => n.toLowerCase();

export function validPassword(pw) {
  return typeof pw === 'string' && pw.length >= 6 && pw.length <= 64;
}

export async function hashPassword(pw, salt = randomBytes(16)) {
  const hash = await scrypt(pw, salt, 64);
  return { salt: salt.toString('base64'), hash: hash.toString('base64') };
}

export async function verifyPassword(pw, saltB64, hashB64) {
  const hash = await scrypt(pw, Buffer.from(saltB64, 'base64'), 64);
  const expected = Buffer.from(hashB64, 'base64');
  return expected.length === hash.length && timingSafeEqual(hash, expected);
}

const tokenId = token => createHash('sha256').update(token).digest('hex');

export async function createSession(key) {
  const token = randomBytes(32).toString('base64url');
  await redis('SET', `sess:${tokenId(token)}`, key, 'EX', SESSION_TTL);
  return token;
}

function bearer(request) {
  const h = request.headers.get('authorization') || '';
  const m = /^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(h);
  return m ? m[1] : null;
}

// 세션 토큰으로 사용자 키를 찾는다. 사용할 때마다 만료를 연장한다.
export async function sessionUser(request) {
  const token = bearer(request);
  if (!token) return null;
  const id = `sess:${tokenId(token)}`;
  const key = await redis('GET', id);
  if (!key) return null;
  await redis('EXPIRE', id, SESSION_TTL);
  return key;
}

export async function deleteSession(request) {
  const token = bearer(request);
  if (token) await redis('DEL', `sess:${tokenId(token)}`);
}

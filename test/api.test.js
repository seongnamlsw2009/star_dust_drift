import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startFakeRedis } from './fake-redis.js';

let fake, register, login, logout, data;
before(async () => {
  fake = await startFakeRedis();
  register = (await import('../api/register.js')).POST;
  login = (await import('../api/login.js')).POST;
  logout = (await import('../api/logout.js')).POST;
  data = await import('../api/data.js');
});
after(() => fake.close());

let ipN = 0;
const req = (method, body, token, ip = '10.0.0.' + (++ipN)) => new Request('http://x/api', {
  method,
  headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip, ...(token ? { Authorization: 'Bearer ' + token } : {}) },
  body: body === undefined ? undefined : JSON.stringify(body)
});
const call = async (fn, ...a) => { const r = await fn(req(...a)); return { status: r.status, body: await r.json() }; };

test('가입 → 저장 → 다른 기기에서 로그인해 불러오기', async () => {
  const reg = await call(register, 'POST', { name: '노바', password: 'secret1' });
  assert.equal(reg.status, 201);
  assert.equal(reg.body.name, '노바');
  const save = { best: { normal: 1234 }, ships: { astra: { earned: 3, nodes: ['a1'], passives: [] } } };
  const put = await call(data.PUT, 'PUT', { data: save }, reg.body.token);
  assert.equal(put.status, 200);
  assert.ok(put.body.updatedAt > 0);

  const li = await call(login, 'POST', { name: '노바', password: 'secret1' });
  assert.equal(li.status, 200);
  assert.deepEqual(li.body.data, save);
  assert.notEqual(li.body.token, reg.body.token);
  const get = await call(data.GET, 'GET', undefined, li.body.token);
  assert.deepEqual(get.body.data, save);
  // 비밀번호는 평문으로 저장되지 않는다
  assert.ok(!fake.db.get('user:노바').includes('secret1'));
});

test('닉네임은 대소문자를 구분하지 않고 중복 가입을 막는다', async () => {
  assert.equal((await call(register, 'POST', { name: 'Pilot', password: 'pw1234' })).status, 201);
  assert.equal((await call(register, 'POST', { name: 'pilot', password: 'pw1234' })).status, 409);
  assert.equal((await call(login, 'POST', { name: 'PILOT', password: 'pw1234' })).status, 200);
});

test('잘못된 입력과 비밀번호를 거절한다', async () => {
  assert.equal((await call(register, 'POST', { name: 'a', password: 'pw1234' })).status, 400);
  assert.equal((await call(register, 'POST', { name: 'bad name!', password: 'pw1234' })).status, 400);
  assert.equal((await call(register, 'POST', { name: 'shortpw', password: '123' })).status, 400);
  await call(register, 'POST', { name: 'wrongpw', password: 'right12' });
  const bad = await call(login, 'POST', { name: 'wrongpw', password: 'wrong12' });
  assert.equal(bad.status, 401);
  const none = await call(login, 'POST', { name: 'nobody', password: 'wrong12' });
  assert.equal(none.status, 401);
  assert.equal(bad.body.error, none.body.error); // 가입 여부가 드러나지 않는다
});

test('토큰 없이 또는 로그아웃 후에는 데이터에 접근할 수 없다', async () => {
  assert.equal((await call(data.GET, 'GET')).status, 401);
  assert.equal((await call(data.GET, 'GET', undefined, 'x'.repeat(43))).status, 401);
  const r = await call(register, 'POST', { name: 'leaver', password: 'pw1234' });
  assert.equal((await call(data.GET, 'GET', undefined, r.body.token)).status, 200);
  await call(logout, 'POST', undefined, r.body.token);
  assert.equal((await call(data.GET, 'GET', undefined, r.body.token)).status, 401);
});

test('잘못된 데이터와 너무 큰 데이터를 거절한다', async () => {
  const r = await call(register, 'POST', { name: 'bigdata', password: 'pw1234' });
  assert.equal((await call(data.PUT, 'PUT', { data: [1, 2] }, r.body.token)).status, 400);
  assert.equal((await call(data.PUT, 'PUT', { data: { x: 'y'.repeat(70000) } }, r.body.token)).status, 400);
});

test('같은 닉네임으로 로그인 실패가 반복되면 막는다', async () => {
  await call(register, 'POST', { name: 'target', password: 'pw1234' });
  let last;
  for (let i = 0; i < 11; i++) last = await call(login, 'POST', { name: 'target', password: 'nope12' });
  assert.equal(last.status, 429);
});

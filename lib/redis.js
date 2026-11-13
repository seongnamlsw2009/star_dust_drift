// Upstash Redis REST 클라이언트 (의존성 없이 fetch 사용)
// Vercel Marketplace의 Upstash 연동은 KV_REST_API_* 또는 UPSTASH_REDIS_REST_* 환경 변수를 넣어 준다.
function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis 환경 변수(KV_REST_API_URL / KV_REST_API_TOKEN)가 설정되지 않았습니다.');
  return { url: url.replace(/\/+$/, ''), token };
}

export async function redis(...cmd) {
  const { url, token } = config();
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd.map(String))
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error('Redis 오류: ' + (json.error || res.status));
  return json.result;
}

import { deleteSession } from '../lib/auth.js';
import { json, handle } from '../lib/http.js';

// POST /api/logout (Authorization: Bearer <token>)
export const POST = handle(async request => {
  await deleteSession(request);
  return json({ ok: true });
});

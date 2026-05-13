/// <reference types="@cloudflare/workers-types" />
import { readCookie, verifySession, COOKIE } from '../../_lib/session';

interface Env {
  SESSION_SECRET: string;
  ADMIN_PASSWORD: string;
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  const sec = env.SESSION_SECRET || env.ADMIN_PASSWORD || '';
  if (!sec) return Response.json({ ok: false }, { status: 503 });
  const tok = readCookie(request, COOKIE);
  if (!tok) return Response.json({ ok: false }, { status: 401 });
  const ok = await verifySession(sec, tok);
  if (!ok) return Response.json({ ok: false }, { status: 401 });
  return Response.json({ ok: true });
}

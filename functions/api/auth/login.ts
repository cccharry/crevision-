/// <reference types="@cloudflare/workers-types" />
import { buildSetCookie } from '../../_lib/session';

interface Env {
  CMS_KV: KVNamespace;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  const pwd = env.ADMIN_PASSWORD ?? '';
  const sec = env.SESSION_SECRET || pwd;
  if (!pwd) {
    return Response.json({ error: 'ADMIN_PASSWORD not configured' }, { status: 503 });
  }
  let body: { password?: string } = {};
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const password = body.password ?? '';
  if (password.length !== pwd.length || password !== pwd) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const setCookie = await buildSetCookie(sec, request);
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': setCookie } });
}

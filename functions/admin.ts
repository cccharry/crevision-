/// <reference types="@cloudflare/workers-types" />
/**
 * /admin：边缘重定向，不返回后台 HTML，避免未登录时先闪现内页再被前端 JS 踢走。
 * 未登录：301 → /auth/login/?next=/admin/projects/
 * 已登录：302 → /admin/projects/
 */
import { readCookie, verifySession, COOKIE } from './_lib/session';

interface Env {
  SESSION_SECRET: string;
  ADMIN_PASSWORD: string;
}

const LOGIN = '/auth/login/?next=/admin/projects/';

export async function onRequest(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;
  const m = request.method;
  if (m !== 'GET' && m !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const sec = env.SESSION_SECRET || env.ADMIN_PASSWORD || '';
  const url = new URL(request.url);
  const origin = url.origin;

  if (!sec) {
    return Response.redirect(new URL(LOGIN, origin).toString(), 302);
  }

  const tok = readCookie(request, COOKIE);
  if (!tok) {
    return Response.redirect(new URL(LOGIN, origin).toString(), 301);
  }

  const ok = await verifySession(sec, tok);
  if (!ok) {
    return Response.redirect(new URL(LOGIN, origin).toString(), 301);
  }

  return Response.redirect(new URL('/admin/projects/', origin).toString(), 302);
}

import { clearSessionCookie } from '../../_lib/session';

export async function onRequestPost(): Promise<Response> {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
}

export async function onRequestGet(): Promise<Response> {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/auth/login',
      'Set-Cookie': clearSessionCookie(),
    },
  });
}

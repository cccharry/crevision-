/// <reference types="@cloudflare/workers-types" />
import { readCookie, verifySession, COOKIE } from '../../_lib/session';
import { readPayload, writePayload } from '../../_lib/payload';

interface Env {
  CMS_KV: KVNamespace;
  ADMIN_PASSWORD: string;
  SESSION_SECRET: string;
}

async function requireAuth(request: Request, env: Env): Promise<Response | null> {
  const sec = env.SESSION_SECRET || env.ADMIN_PASSWORD || '';
  if (!sec) return Response.json({ error: 'SESSION_SECRET / ADMIN_PASSWORD not set' }, { status: 503 });
  const tok = readCookie(request, COOKIE);
  if (!tok || !(await verifySession(sec, tok))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function onRequestGet(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  const deny = await requireAuth(request, env);
  if (deny) return deny;
  const row = await readPayload(env.CMS_KV);
  if (!row) {
    return Response.json({
      projects: [],
      whoWeAre: { en: '', zh: '' },
      updatedAt: null,
    });
  }
  let projects: unknown[] = [];
  let whoWeAre: { en?: string; zh?: string } = {};
  try {
    projects = JSON.parse(row.projectsJson) as unknown[];
  } catch {
    projects = [];
  }
  try {
    whoWeAre = JSON.parse(row.whoWeAreJson) as { en?: string; zh?: string };
  } catch {
    whoWeAre = {};
  }
  return Response.json({
    projects,
    whoWeAre,
    updatedAt: row.updatedAt,
  });
}

export async function onRequestPut(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;
  const deny = await requireAuth(request, env);
  if (deny) return deny;
  let body: { projects?: unknown; whoWeAre?: unknown } = {};
  try {
    body = (await request.json()) as { projects?: unknown; whoWeAre?: unknown };
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!Array.isArray(body.projects)) {
    return Response.json({ error: 'projects must be an array' }, { status: 400 });
  }
  const who = body.whoWeAre && typeof body.whoWeAre === 'object' ? body.whoWeAre : { en: '', zh: '' };
  await writePayload(env.CMS_KV, {
    projectsJson: JSON.stringify(body.projects),
    whoWeAreJson: JSON.stringify(who),
  });
  return Response.json({ ok: true });
}

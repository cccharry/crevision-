/// <reference types="@cloudflare/workers-types" />
import { readPayload } from '../../_lib/payload';

interface Env {
  CMS_KV: KVNamespace;
}

/** 前台只读：返回 KV 中全部作品，由页面按开关筛选（轮播 / 列表） */
export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const { env } = context;
  const row = await readPayload(env.CMS_KV);
  if (!row) {
    return Response.json({ projects: [], updatedAt: null });
  }
  let projects: unknown[] = [];
  try {
    const parsed = JSON.parse(row.projectsJson) as unknown;
    projects = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    projects = [];
  }
  return Response.json({
    projects,
    updatedAt: row.updatedAt,
  });
}

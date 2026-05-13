/// <reference types="@cloudflare/workers-types" />
import { readPayload } from '../../_lib/payload';

interface Env {
  CMS_KV: KVNamespace;
}

/** 前台只读：已勾选「在 Projects 页展示」的案例（无需登录） */
export async function onRequestGet(context: { env: Env }): Promise<Response> {
  const { env } = context;
  const row = await readPayload(env.CMS_KV);
  if (!row) {
    return Response.json({ projects: [], updatedAt: null });
  }
  let projects: Array<{ visibleOnProjectsPage?: boolean; [k: string]: unknown }> = [];
  try {
    projects = JSON.parse(row.projectsJson) as typeof projects;
  } catch {
    projects = [];
  }
  const visible = projects.filter((p) => p && p.visibleOnProjectsPage !== false);
  return Response.json({
    projects: visible,
    updatedAt: row.updatedAt,
  });
}

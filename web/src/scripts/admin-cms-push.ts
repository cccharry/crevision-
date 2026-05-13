/**
 * 将 localStorage 中的 CMS 数据推送到 Cloudflare Pages Functions（/api/cms/sync）。
 * 由 admin-project-draft.saveAllDrafts 动态触发，避免与 draft 模块循环依赖。
 */

import { STORAGE_KEY } from './admin-project-draft.ts';
import { WHO_WE_ARE_STORAGE_KEY } from './admin-who-we-are.ts';

let t: ReturnType<typeof setTimeout> | null = null;

async function pushNow(): Promise<void> {
  const projectsRaw = localStorage.getItem(STORAGE_KEY);
  const whoRaw = localStorage.getItem(WHO_WE_ARE_STORAGE_KEY);
  let projects: unknown[] = [];
  try {
    projects = projectsRaw ? (JSON.parse(projectsRaw) as unknown[]) : [];
    if (!Array.isArray(projects)) projects = [];
  } catch {
    projects = [];
  }
  let whoWeAre: unknown = { en: '', zh: '' };
  try {
    whoWeAre = whoRaw ? JSON.parse(whoRaw) : { en: '', zh: '' };
  } catch {
    whoWeAre = { en: '', zh: '' };
  }
  const res = await fetch('/api/cms/sync', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projects, whoWeAre }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.warn('[cms] sync failed', res.status, err);
  }
}

/** 在 saveAllDrafts / saveWhoWeAre 后调用：防抖合并多次写入 */
export function schedulePushToRemote(): void {
  if (typeof window === 'undefined') return;
  if (t) clearTimeout(t);
  t = setTimeout(() => {
    t = null;
    void pushNow();
  }, 600);
}

/** 登录后或打开后台时：从云端拉取并覆盖本地（与后台编辑一致） */
export async function pullRemoteIntoLocalStorage(): Promise<boolean> {
  const res = await fetch('/api/cms/sync', { credentials: 'include' });
  if (!res.ok) return false;
  const data = (await res.json()) as {
    projects?: unknown;
    whoWeAre?: unknown;
    updatedAt?: string | null;
  };
  const who = data.whoWeAre as { en?: string; zh?: string } | undefined;
  const hasRemote =
    data.updatedAt != null ||
    (Array.isArray(data.projects) && data.projects.length > 0) ||
    Boolean(who && (who.en || who.zh));
  if (!hasRemote) {
    return true;
  }
  if (Array.isArray(data.projects)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.projects));
  }
  if (data.whoWeAre && typeof data.whoWeAre === 'object') {
    localStorage.setItem(WHO_WE_ARE_STORAGE_KEY, JSON.stringify(data.whoWeAre));
  }
  return true;
}

export async function authMe(): Promise<boolean> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  return res.ok;
}

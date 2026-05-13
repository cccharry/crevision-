/**
 * 后台入口：检测 Cloudflare Pages Functions 是否可用；可用则校验登录并拉取 KV 数据到 localStorage。
 */

import { pullRemoteIntoLocalStorage } from './admin-cms-push.ts';

export type AdminBootMode = 'local' | 'remote' | 'redirecting';

/** 解析 /api/auth/me：非 JSON 或网络错误视为本地开发（无 Functions） */
async function probeAuth(): Promise<'ok' | '401' | 'local'> {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return 'local';
    if (res.status === 401) return '401';
    if (res.ok) return 'ok';
    return '401';
  } catch {
    return 'local';
  }
}

/**
 * 进入任意 /admin/* 页时调用。
 * - 无 Functions：仅本地 localStorage，不跳转。
 * - 有 Functions 未登录：跳转登录页。
 * - 已登录：拉取云端 CMS 覆盖本地后返回 remote。
 */
export async function bootAdminApp(): Promise<AdminBootMode> {
  const st = await probeAuth();
  if (st === 'local') return 'local';
  if (st === '401') {
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    window.location.replace(`/auth/login?next=${next}`);
    return 'redirecting';
  }
  await pullRemoteIntoLocalStorage();
  return 'remote';
}

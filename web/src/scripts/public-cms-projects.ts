/**
 * 前台作品集：从 Pages Function GET /api/cms/public 读取（无需登录）
 */

export type PublicProject = {
  slug?: string;
  title?: { zh?: string; en?: string };
  summary?: { zh?: string; en?: string };
  year?: string;
  heroImageDataUrl?: string | null;
  visibleOnProjectsPage?: boolean;
  introduction?: { zh?: string; en?: string };
  services?: string[];
  detailSections?: unknown[];
  [k: string]: unknown;
};

export async function fetchPublicProjects(): Promise<{
  projects: PublicProject[];
  updatedAt: string | null;
}> {
  try {
    const res = await fetch('/api/cms/public');
    if (!res.ok) return { projects: [], updatedAt: null };
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return { projects: [], updatedAt: null };
    const data = (await res.json()) as { projects?: PublicProject[]; updatedAt?: string | null };
    return {
      projects: Array.isArray(data.projects) ? data.projects : [],
      updatedAt: data.updatedAt ?? null,
    };
  } catch {
    return { projects: [], updatedAt: null };
  }
}

export function projectTitle(p: PublicProject): string {
  return (p.title?.zh || p.title?.en || p.slug || 'Untitled').trim();
}

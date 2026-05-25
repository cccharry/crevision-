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
  showOnHomeCarousel?: boolean;
  homeCarouselOrder?: number;
  projectsListOrder?: number;
  introduction?: { zh?: string; en?: string };
  services?: string[];
  detailSections?: unknown[];
  updatedAt?: string;
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
  return (p.title?.en || p.title?.zh || p.slug || 'Untitled').trim();
}

export function projectTitleEn(p: PublicProject): string {
  return (p.title?.en || p.title?.zh || p.slug || 'Project').trim();
}

export function projectTitleZh(p: PublicProject): string {
  return (p.title?.zh || '').trim();
}

export function projectViewHref(p: PublicProject): string {
  const slug = (p.slug || '').trim();
  return slug ? `/projects/view?slug=${encodeURIComponent(slug)}` : '/projects/';
}

export function formatServiceTags(p: PublicProject): { en: string; zh: string } {
  const list = Array.isArray(p.services) ? p.services.filter(Boolean) : [];
  if (!list.length) return { en: 'Design', zh: '设计' };
  const en = list.join(' · ');
  return { en, zh: en };
}

export function sortForCarousel(list: PublicProject[]): PublicProject[] {
  return [...list]
    .filter((p) => p.showOnHomeCarousel !== false)
    .sort((a, b) => (a.homeCarouselOrder ?? 0) - (b.homeCarouselOrder ?? 0));
}

export function sortForProjectsPage(list: PublicProject[]): PublicProject[] {
  return [...list]
    .filter((p) => p.visibleOnProjectsPage !== false)
    .sort((a, b) => {
      const oa = a.projectsListOrder ?? 0;
      const ob = b.projectsListOrder ?? 0;
      if (oa !== ob) return oa - ob;
      const ta = a.updatedAt || '';
      const tb = b.updatedAt || '';
      return tb.localeCompare(ta);
    });
}

export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

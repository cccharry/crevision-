/**
 * 后台「新建项目 → 详情编辑」本地草稿（浏览器 localStorage）。
 * 接入 Sanity 写入 API 后可替换为服务端持久化。
 */

export const STORAGE_KEY = 'crevision:admin:projects';

export type SectionKey =
  | 'projectBackground'
  | 'designConcept'
  | 'informationArchitecture'
  | 'visualSystem'
  | 'sketchDesign'
  | 'implementDelivery';

/**
 * 右侧 Add Section 列表顺序（含项目背景元数据；右侧可选列表见 SECTION_PICKER_OPTIONS）。
 * iconSrc：对应 Design/backend 下 SVG，已复制到 web/public/admin/sections/（URL 安全文件名）。
 * 项目背景暂无单独图标，iconSrc 为 null 时界面用文案占位。
 */
export const SECTION_OPTIONS: ReadonlyArray<{
  key: SectionKey;
  label: string;
  labelZh: string;
  iconSrc: string | null;
}> = [
  { key: 'projectBackground', label: 'Project Background', labelZh: '项目背景', iconSrc: null },
  {
    key: 'designConcept',
    label: 'Design Concept',
    labelZh: '设计理念',
    iconSrc: '/admin/sections/design-concept.svg',
  },
  {
    key: 'informationArchitecture',
    label: 'Information Architecture',
    labelZh: '信息架构',
    iconSrc: '/admin/sections/information-architecture.svg',
  },
  {
    key: 'visualSystem',
    label: 'Visual System',
    labelZh: '视觉系统',
    iconSrc: '/admin/sections/visual-system.svg',
  },
  {
    key: 'sketchDesign',
    label: 'Sketch & Design',
    labelZh: '草图和方案设计',
    iconSrc: '/admin/sections/sketch-design.svg',
  },
  {
    key: 'implementDelivery',
    label: 'Implement & Delivery',
    labelZh: '落地复盘 & 定制说明',
    iconSrc: '/admin/sections/implement-delivery.svg',
  },
];

/** 右侧可选添加的板块（不含项目背景：主内容区默认必有，不在此列表） */
export const SECTION_PICKER_OPTIONS = SECTION_OPTIONS.filter((o) => o.key !== 'projectBackground');

export type BilingualShort = { zh?: string; en?: string };
export type BilingualText = { zh?: string; en?: string };

export type DraftTextBlock = {
  _key: string;
  _type: 'sectionTextBlock';
  title: BilingualShort;
  body: BilingualText;
};

export type DraftImageBlock = {
  _key: string;
  _type: 'sectionImageBlock';
  /** 演示：本地 base64，接入 CDN 后替换 */
  images: Array<{ dataUrl?: string; caption?: BilingualShort }>;
};

export type DraftDetailSection = {
  _key: string;
  sectionKey: SectionKey;
  enabled: boolean;
  blocks: Array<DraftTextBlock | DraftImageBlock>;
  /** 仅 projectBackground：中英正文（不与 blocks 混用） */
  plainBody?: BilingualText;
};

export type AdminProjectDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: BilingualShort;
  slug: string;
  year: string;
  introduction: BilingualText;
  summary: BilingualText;
  background: BilingualText;
  services: string[];
  heroImageDataUrl: string | null;
  showOnHomeCarousel: boolean;
  visibleOnProjectsPage: boolean;
  homeCarouselOrder: number;
  projectsListOrder: number;
  detailSections: DraftDetailSection[];
};

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function randomKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadAllDrafts(): AdminProjectDraft[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdminProjectDraft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAllDrafts(list: AdminProjectDraft[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  void import('./admin-cms-push.js').then((m) => m.schedulePushToRemote()).catch(() => {});
}

export function getDraftById(id: string): AdminProjectDraft | undefined {
  return loadAllDrafts().find((p) => p.id === id);
}

export function upsertDraft(project: AdminProjectDraft): void {
  const list = loadAllDrafts();
  const i = list.findIndex((p) => p.id === project.id);
  if (i >= 0) list[i] = project;
  else list.push(project);
  saveAllDrafts(list);
}

export function deleteDraft(id: string): void {
  saveAllDrafts(loadAllDrafts().filter((p) => p.id !== id));
}

export function createDraftFromModal(payload: {
  titleZh: string;
  titleEn: string;
  year: string;
  servicesRaw: string;
  introZh: string;
  introEn: string;
  summaryZh: string;
  summaryEn: string;
  heroImageDataUrl: string | null;
}): AdminProjectDraft {
  const now = new Date().toISOString();
  const titleEn = payload.titleEn.trim();
  const slug = slugify(titleEn) || `project-${randomKey()}`;
  const services = payload.servicesRaw
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const introZh = payload.introZh.trim();
  const introEn = payload.introEn.trim();
  const sumZh = payload.summaryZh.trim() || introZh.slice(0, 200);
  const sumEn = payload.summaryEn.trim() || introEn.slice(0, 200);

  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    title: { zh: payload.titleZh.trim(), en: titleEn },
    slug,
    year: payload.year.trim(),
    introduction: { zh: introZh, en: introEn },
    summary: { zh: sumZh, en: sumEn },
    background: { zh: '', en: '' },
    services: services.length ? services : ['General'],
    heroImageDataUrl: payload.heroImageDataUrl,
    showOnHomeCarousel: false,
    visibleOnProjectsPage: true,
    homeCarouselOrder: 0,
    projectsListOrder: loadAllDrafts().length,
    detailSections: [],
  };
}

export function touchDraft(p: AdminProjectDraft): AdminProjectDraft {
  return { ...p, updatedAt: new Date().toISOString() };
}

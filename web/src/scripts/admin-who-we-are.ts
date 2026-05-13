/**
 * 「Who we are」站点文案：本地草稿；接入 Sanity singleton 后替换存储层。
 */

export const WHO_WE_ARE_STORAGE_KEY = 'crevision:admin:whoWeAre';

export type WhoWeAreCopy = {
  en: string;
  zh: string;
};

const DEFAULT_EN = `Cre-Vision is an independent UX & UI design studio. We partner with teams to shape clear product narratives, usable interfaces, and consistent visual systems—from discovery to delivery.`;

const DEFAULT_ZH = `Cre-Vision 是一间独立的用户体验与界面设计工作室。我们与团队一起梳理产品叙事、打造易用的界面与一致的视觉系统——从探索到落地。`;

export function loadWhoWeAre(): WhoWeAreCopy {
  if (typeof localStorage === 'undefined') {
    return { en: DEFAULT_EN, zh: DEFAULT_ZH };
  }
  try {
    const raw = localStorage.getItem(WHO_WE_ARE_STORAGE_KEY);
    if (!raw) return { en: DEFAULT_EN, zh: DEFAULT_ZH };
    const p = JSON.parse(raw) as Partial<WhoWeAreCopy>;
    return {
      en: typeof p.en === 'string' ? p.en : DEFAULT_EN,
      zh: typeof p.zh === 'string' ? p.zh : DEFAULT_ZH,
    };
  } catch {
    return { en: DEFAULT_EN, zh: DEFAULT_ZH };
  }
}

export function saveWhoWeAre(data: WhoWeAreCopy): void {
  localStorage.setItem(WHO_WE_ARE_STORAGE_KEY, JSON.stringify(data));
}

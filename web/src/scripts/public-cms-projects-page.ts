/**
 * /projects/ 列表页：从 CMS 渲染作品卡片
 */

import {
  fetchPublicProjects,
  sortForProjectsPage,
  projectTitleEn,
  projectTitleZh,
  projectViewHref,
  formatServiceTags,
  escHtml,
  type PublicProject,
} from './public-cms-projects.ts';

export async function bootPublicProjectsPage(): Promise<void> {
  const grid = document.querySelector('.projects-grid');
  if (!grid) return;

  const { projects } = await fetchPublicProjects();
  const list = sortForProjectsPage(projects);
  if (!list.length) return;

  grid.innerHTML = list.map((p) => renderCard(p)).join('');
}

function renderCard(p: PublicProject): string {
  const tags = formatServiceTags(p);
  const thumbStyle = p.heroImageDataUrl
    ? ` style="background-image:url('${p.heroImageDataUrl.replace(/'/g, '%27')}');background-size:cover;background-position:center"`
    : '';
  const nameZh = projectTitleZh(p);
  const nameEn = projectTitleEn(p);
  const nameHtml = nameZh
    ? `${escHtml(nameEn)} | <span class="text-cn">${escHtml(nameZh)}</span>`
    : escHtml(nameEn);
  const sumEn = escHtml((p.summary?.en || p.introduction?.en || '').trim());
  const sumZh = escHtml((p.summary?.zh || p.introduction?.zh || '').trim());

  return `<article class="project-card">
    <div class="project-thumb"${thumbStyle}></div>
    <h2 class="project-name">${nameHtml}</h2>
    <span class="project-tag">${escHtml(tags.en)}</span>
    <p class="project-desc">${sumEn}</p>
    <p class="project-desc-cn text-cn">${sumZh}</p>
    <a href="${escHtml(projectViewHref(p))}" class="project-link">View <span>→</span></a>
  </article>`;
}

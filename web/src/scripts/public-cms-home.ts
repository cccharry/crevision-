/**
 * 首页：从 CMS 填充轮播区与下方瀑布流作品列表
 */

import {
  fetchPublicProjects,
  sortForCarousel,
  sortForProjectsPage,
  projectTitleEn,
  projectTitleZh,
  projectViewHref,
  formatServiceTags,
  escHtml,
  type PublicProject,
} from './public-cms-projects.ts';

function firstServiceEn(p: PublicProject): string {
  const list = Array.isArray(p.services) ? p.services : [];
  return list[0] || 'Design';
}

export async function bootPublicHome(): Promise<void> {
  const { projects } = await fetchPublicProjects();
  const carousel = sortForCarousel(projects);
  const waterfall = sortForProjectsPage(projects);

  if (carousel.length) initCarousel(carousel);
  if (waterfall.length) renderWaterfall(waterfall);
}

function initCarousel(items: PublicProject[]): void {
  const rail = document.getElementById('rail');
  const projectDots = document.getElementById('project-dots');
  if (!rail) return;

  let slideIndex = 0;
  let isMoving = false;
  const total = items.length;

  const titleEl = document.getElementById('p-title');
  const titleCnEl = document.getElementById('p-title-cn');
  const tagEnEl = document.querySelector('#project-section .project-tag-en');
  const tagCnEl = document.querySelector('#project-section .project-tag-cn');
  const descEnEl = document.getElementById('p-desc-en');
  const descCnEl = document.getElementById('p-desc-cn');
  const viewLink = document.querySelector('#project-section .btn-view-project') as HTMLAnchorElement | null;

  function updateInfoPanel(i: number): void {
    const p = items[i];
    if (!p) return;
    const tags = formatServiceTags(p);
    if (titleEl) titleEl.textContent = projectTitleEn(p);
    if (titleCnEl) titleCnEl.textContent = projectTitleZh(p) || projectTitleEn(p);
    if (tagEnEl) tagEnEl.textContent = tags.en.split(' · ')[0] || firstServiceEn(p);
    if (tagCnEl) tagCnEl.textContent = tags.zh;
    const sumEn = (p.summary?.en || p.introduction?.en || '').trim();
    const sumZh = (p.summary?.zh || p.introduction?.zh || '').trim();
    if (descEnEl) descEnEl.textContent = sumEn || '';
    if (descCnEl) descCnEl.textContent = sumZh || '';
    if (viewLink) viewLink.href = projectViewHref(p);
  }

  function buildDots(): void {
    if (!projectDots) return;
    projectDots.innerHTML = '';
    for (let k = 0; k < total; k++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'project-dot' + (k === 0 ? ' is-active' : '');
      btn.setAttribute('aria-label', `作品 ${k + 1}`);
      btn.addEventListener('click', () => moveTo(k));
      projectDots.appendChild(btn);
    }
  }

  function refresh(): void {
    const domItems = rail.querySelectorAll('.project-item');
    domItems.forEach((item, i) => {
      item.className = 'project-item has-cover';
      const rel = i - slideIndex;
      if (rel === 0) item.classList.add('st-active');
      else if (rel === 1) item.classList.add('st-r1');
      else if (rel === 2) item.classList.add('st-r2');
      else if (rel === 3) item.classList.add('st-next');
      else item.classList.add('st-hide');
    });
    updateInfoPanel(slideIndex);
    projectDots?.querySelectorAll('.project-dot').forEach((dot, k) => {
      dot.classList.toggle('is-active', k === slideIndex);
    });
  }

  function moveTo(next: number): void {
    if (next < 0 || next >= total) return;
    isMoving = true;
    slideIndex = next;
    refresh();
    setTimeout(() => {
      isMoving = false;
    }, 800);
  }

  rail.innerHTML = '';
  const loopCount = Math.max(8, total * 2);
  for (let i = 0; i < loopCount; i++) {
    const p = items[i % total];
    const div = document.createElement('div');
    div.className = 'project-item has-cover';
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    if (p.heroImageDataUrl) {
      div.style.backgroundImage = `url("${p.heroImageDataUrl}")`;
      div.style.backgroundSize = 'cover';
      div.style.backgroundPosition = 'center';
    }
    const idx = i % total;
    div.addEventListener('click', () => {
      if (!isMoving) moveTo(idx);
    });
    rail.appendChild(div);
  }

  buildDots();
  refresh();

  window.addEventListener(
    'wheel',
    (e) => {
      const sect = document.getElementById('project-section');
      if (!sect) return;
      const rect = sect.getBoundingClientRect();
      if (rect.top < 150 && rect.bottom > 0) {
        if (isMoving) return;
        if (e.deltaY > 0) moveTo((slideIndex + 1) % total);
        else moveTo((slideIndex - 1 + total) % total);
      }
    },
    { passive: true },
  );
}

function renderWaterfall(items: PublicProject[]): void {
  const inner = document.querySelector('#projects-waterfall .waterfall-inner');
  if (!inner) return;
  inner.innerHTML = items
    .map((p) => {
      const tags = formatServiceTags(p);
      const thumbStyle = p.heroImageDataUrl
        ? ` style="background-image:url('${p.heroImageDataUrl.replace(/'/g, '%27')}');background-size:cover;background-position:center;color:transparent"`
        : '';
      const sumEn = escHtml((p.summary?.en || p.introduction?.en || '').trim());
      const sumZh = escHtml((p.summary?.zh || p.introduction?.zh || '').trim());
      return `<article class="waterfall-item">
        <div class="waterfall-thumb"${thumbStyle}>${p.heroImageDataUrl ? '' : escHtml(projectTitleEn(p))}</div>
        <div class="waterfall-text">
          <h3 class="waterfall-title">${escHtml(projectTitleEn(p))}</h3>
          <p class="waterfall-title-cn text-cn">${escHtml(projectTitleZh(p))}</p>
          <p class="waterfall-year">${escHtml(String(p.year || ''))}</p>
          <span class="waterfall-tag"><span class="waterfall-tag-en">${escHtml(tags.en)}</span><span aria-hidden="true">|</span><span class="waterfall-tag-cn text-cn">${escHtml(tags.zh)}</span></span>
          <p class="waterfall-desc">${sumEn}</p>
          <p class="waterfall-desc-cn text-cn">${sumZh}</p>
          <a href="${escHtml(projectViewHref(p))}" class="waterfall-view-link">View <span>→</span></a>
        </div>
      </article>`;
    })
    .join('');
}

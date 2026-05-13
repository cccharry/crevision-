/**
 * 项目详情页：编辑基本信息 + 右侧添加板块（文字 / 图片块）
 */

import {
  getDraftById,
  upsertDraft,
  deleteDraft,
  touchDraft,
  randomKey,
  SECTION_OPTIONS,
  type AdminProjectDraft,
  type DraftDetailSection,
  type DraftTextBlock,
  type DraftImageBlock,
  type SectionKey,
} from './admin-project-draft.ts';

let draft: AdminProjectDraft | null = null;

function $(sel: string): HTMLElement | null {
  return document.querySelector(sel);
}

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function getIdFromQuery(): string | null {
  const q = new URLSearchParams(window.location.search).get('id');
  return q && q.trim() ? q.trim() : null;
}

function collectBasicsFromDom(): Partial<AdminProjectDraft> {
  const titleEn = ($('#f-title-en') as HTMLInputElement)?.value ?? '';
  const titleZh = ($('#f-title-zh') as HTMLInputElement)?.value ?? '';
  const slug = ($('#f-slug') as HTMLInputElement)?.value ?? '';
  const year = ($('#f-year') as HTMLSelectElement)?.value ?? '';
  const servicesRaw = ($('#f-services') as HTMLInputElement)?.value ?? '';
  const services = servicesRaw
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    title: { en: titleEn.trim(), zh: titleZh.trim() },
    slug: slug.trim(),
    year: year.trim(),
    services: services.length ? services : draft!.services,
    introduction: {
      en: ($('#f-intro-en') as HTMLTextAreaElement)?.value?.trim() ?? '',
      zh: ($('#f-intro-zh') as HTMLTextAreaElement)?.value?.trim() ?? '',
    },
    summary: {
      en: ($('#f-sum-en') as HTMLTextAreaElement)?.value?.trim() ?? '',
      zh: ($('#f-sum-zh') as HTMLTextAreaElement)?.value?.trim() ?? '',
    },
    showOnHomeCarousel: ($('#f-carousel') as HTMLInputElement)?.checked ?? false,
  };
}

/** 项目背景放在 Section 内编辑；同步到草稿顶层的 background 字段（便于对接 Sanity） */
function syncBackgroundFromSections(): void {
  if (!draft) return;
  const pb = draft.detailSections.find((s) => s.sectionKey === 'projectBackground');
  if (pb?.plainBody) {
    draft.background = {
      en: pb.plainBody.en?.trim() ?? '',
      zh: pb.plainBody.zh?.trim() ?? '',
    };
  } else {
    draft.background = { en: '', zh: '' };
  }
}

const HERO_ICON_ADD = '/admin/icons/icn_backend_add_project.svg';
const HERO_ICON_RESET = '/admin/icons/icn_backend_reset.svg';

/** Lead Image：无图时仅顶栏；有图时显示 Re-Upload + 下方 3:2 预览（cover 居中） */
function renderHeroPreview(): void {
  const img = $('#hero-preview') as HTMLImageElement | null;
  const previewWrap = $('#hero-preview-wrap');
  const icon = $('#hero-btn-icon') as HTMLImageElement | null;
  const label = $('#hero-btn-text');
  const btn = $('#btn-hero-upload') as HTMLButtonElement | null;
  if (!draft) return;
  const has = !!draft.heroImageDataUrl;
  if (icon) icon.src = has ? HERO_ICON_RESET : HERO_ICON_ADD;
  if (label) label.textContent = has ? 'Re-Upload Image' : 'Add Image';
  if (btn) btn.setAttribute('aria-label', has ? 'Re-Upload Image' : 'Add Image');
  if (previewWrap) previewWrap.hidden = !has;
  if (img) {
    if (has && draft.heroImageDataUrl) {
      img.src = draft.heroImageDataUrl;
    } else {
      img.removeAttribute('src');
    }
  }
}

function renderSections(): void {
  const root = $('#sections-root');
  if (!root || !draft) return;
  root.innerHTML = '';

  draft.detailSections.forEach((sec) => {
    root.appendChild(renderSectionCard(sec));
  });
  renderSectionPicker();
}

/** 右侧 Add Section：已添加的板块灰色不可点 */
function renderSectionPicker(): void {
  const picker = $('#section-picker-list');
  if (!picker || !draft) return;
  picker.innerHTML = '';

  SECTION_OPTIONS.forEach((opt) => {
    const used = draft!.detailSections.some((s) => s.sectionKey === opt.key);
    const li = document.createElement('li');
    li.style.marginBottom = '8px';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'adm-sec-picker-btn adm-btn adm-btn--outline';
    if (used) {
      btn.classList.add('is-used');
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
    }

    const iconWrap = document.createElement('span');
    iconWrap.className = 'adm-sec-picker-icon';
    if (opt.iconSrc) {
      const img = document.createElement('img');
      img.src = opt.iconSrc;
      img.alt = '';
      img.width = 22;
      img.height = 22;
      img.loading = 'lazy';
      iconWrap.appendChild(img);
    } else {
      iconWrap.textContent = '📋';
      iconWrap.title = 'Project Background';
    }

    const lab = document.createElement('span');
    lab.textContent = opt.label;

    btn.append(iconWrap, lab);

    if (!used) {
      btn.addEventListener('click', () => addSection(opt.key));
    }

    li.appendChild(btn);
    picker.appendChild(li);
  });
}

function renderProjectBackgroundCard(sec: DraftDetailSection): HTMLElement {
  if (!sec.plainBody) sec.plainBody = { zh: '', en: '' };

  const card = document.createElement('div');
  card.className = 'adm-card adm-section-editor adm-section-pb';
  card.dataset.sectionInstance = sec._key;

  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
      <h3 style="margin:0;font-size:1.125rem;font-weight:700;">项目背景</h3>
      <div style="display:flex;align-items:center;gap:12px;">
        <label style="display:flex;align-items:center;gap:8px;font-size:0.875rem;color:var(--adm-muted);">
          Display
          <span class="adm-switch">
            <input type="checkbox" data-pb-toggle="${esc(sec._key)}" ${sec.enabled ? 'checked' : ''} />
            <span class="adm-switch-slider"></span>
          </span>
        </label>
        <button type="button" class="adm-btn adm-btn--outline" data-pb-remove="${esc(sec._key)}">Remove Section</button>
      </div>
    </div>
    <div class="adm-pb-rule"></div>
    <div class="adm-field">
      <label class="adm-label">EN</label>
      <textarea class="adm-textarea adm-pb-ta" data-pb-field="en" rows="6"></textarea>
    </div>
    <div class="adm-field" style="margin-bottom:0">
      <label class="adm-label">CN</label>
      <textarea class="adm-textarea adm-pb-ta" data-pb-field="zh" rows="6"></textarea>
    </div>`;

  const taEn = card.querySelector('[data-pb-field="en"]') as HTMLTextAreaElement | null;
  const taZh = card.querySelector('[data-pb-field="zh"]') as HTMLTextAreaElement | null;
  if (taEn) taEn.value = sec.plainBody.en || '';
  if (taZh) taZh.value = sec.plainBody.zh || '';

  const syncPb = () => {
    const s = draft!.detailSections.find((x) => x._key === sec._key);
    if (!s?.plainBody) return;
    s.plainBody.en = taEn?.value ?? '';
    s.plainBody.zh = taZh?.value ?? '';
    saveQuiet();
  };

  taEn?.addEventListener('input', syncPb);
  taZh?.addEventListener('input', syncPb);

  card.querySelector('[data-pb-toggle]')?.addEventListener('change', (ev) => {
    const on = (ev.target as HTMLInputElement).checked;
    const s = draft!.detailSections.find((x) => x._key === sec._key);
    if (s) s.enabled = on;
    saveQuiet();
  });

  card.querySelector('[data-pb-remove]')?.addEventListener('click', () => {
    if (!confirm('Remove this section?')) return;
    draft!.detailSections = draft!.detailSections.filter((x) => x._key !== sec._key);
    saveQuiet();
    renderSections();
  });

  return card;
}

function renderStandardSectionCard(sec: DraftDetailSection): HTMLElement {
  const meta = SECTION_OPTIONS.find((o) => o.key === sec.sectionKey);
  const title = meta ? `${meta.label} · ${meta.labelZh}` : sec.sectionKey;

  const card = document.createElement('div');
  card.className = 'adm-card adm-section-editor';
  card.dataset.sectionKey = sec._key;
  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
      <h3 style="margin:0;font-size:1rem;">${esc(title)}</h3>
      <div style="display:flex;align-items:center;gap:12px;">
        <label style="display:flex;align-items:center;gap:8px;font-size:0.875rem;color:var(--adm-muted);">
          Display
          <span class="adm-switch">
            <input type="checkbox" data-sec-toggle="${esc(sec._key)}" ${sec.enabled ? 'checked' : ''} />
            <span class="adm-switch-slider"></span>
          </span>
        </label>
        <button type="button" class="adm-btn adm-btn--outline" data-remove-sec="${esc(sec._key)}">Remove Section</button>
      </div>
    </div>
    <div class="adm-blocks" data-blocks="${esc(sec._key)}"></div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
      <button type="button" class="adm-btn adm-btn--outline" data-add-text="${esc(sec._key)}">+ Text block</button>
      <button type="button" class="adm-btn adm-btn--outline" data-add-img="${esc(sec._key)}">+ Image group</button>
    </div>`;

  const blocksRoot = card.querySelector('.adm-blocks') as HTMLElement;

  sec.blocks.forEach((block) => {
    if (block._type === 'sectionTextBlock') {
      blocksRoot.appendChild(renderTextBlock(sec._key, block));
    } else {
      blocksRoot.appendChild(renderImageBlock(sec._key, block));
    }
  });

  card.querySelector(`[data-sec-toggle]`)?.addEventListener('change', (ev) => {
    const on = (ev.target as HTMLInputElement).checked;
    const s = draft!.detailSections.find((x) => x._key === sec._key);
    if (s) s.enabled = on;
    saveQuiet();
  });

  card.querySelector(`[data-remove-sec]`)?.addEventListener('click', () => {
    if (!confirm('Remove this section?')) return;
    draft!.detailSections = draft!.detailSections.filter((x) => x._key !== sec._key);
    saveQuiet();
    renderSections();
  });

  card.querySelector(`[data-add-text]`)?.addEventListener('click', () => {
    const s = draft!.detailSections.find((x) => x._key === sec._key);
    if (!s) return;
    const nb: DraftTextBlock = {
      _key: randomKey(),
      _type: 'sectionTextBlock',
      title: { en: '', zh: '' },
      body: { en: '', zh: '' },
    };
    s.blocks.push(nb);
    saveQuiet();
    blocksRoot.appendChild(renderTextBlock(sec._key, nb));
  });

  card.querySelector(`[data-add-img]`)?.addEventListener('click', () => {
    const s = draft!.detailSections.find((x) => x._key === sec._key);
    if (!s) return;
    const nb: DraftImageBlock = {
      _key: randomKey(),
      _type: 'sectionImageBlock',
      images: [],
    };
    s.blocks.push(nb);
    saveQuiet();
    blocksRoot.appendChild(renderImageBlock(sec._key, nb));
  });

  return card;
}

function renderSectionCard(sec: DraftDetailSection): HTMLElement {
  if (sec.sectionKey === 'projectBackground') {
    return renderProjectBackgroundCard(sec);
  }
  return renderStandardSectionCard(sec);
}

function renderTextBlock(sectionKey: string, block: DraftTextBlock): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'adm-block adm-block-text';
  wrap.style.marginBottom = '16px';
  wrap.style.padding = '12px';
  wrap.style.border = '1px dashed var(--adm-border)';
  wrap.style.borderRadius = '6px';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <strong style="font-size:0.8125rem;">Text block</strong>
      <button type="button" class="adm-btn adm-btn--outline" style="font-size:0.75rem;padding:4px 8px;" data-del-block="${esc(block._key)}">Remove</button>
    </div>
    <div class="adm-grid2">
      <div class="adm-field"><label class="adm-label">Title EN</label><input class="adm-input" data-part="title-en" value="${esc(block.title.en || '')}" /></div>
      <div class="adm-field"><label class="adm-label">Title CN</label><input class="adm-input" data-part="title-zh" value="${esc(block.title.zh || '')}" /></div>
    </div>
    <div class="adm-field"><label class="adm-label">Body EN</label><textarea class="adm-textarea" data-part="body-en" rows="3">${esc(block.body.en || '')}</textarea></div>
    <div class="adm-field"><label class="adm-label">Body CN</label><textarea class="adm-textarea" data-part="body-zh" rows="3">${esc(block.body.zh || '')}</textarea></div>`;

  const sync = () => {
    const sec = draft!.detailSections.find((s) => s._key === sectionKey);
    const b = sec?.blocks.find(
      (x) => x._key === block._key && x._type === 'sectionTextBlock'
    ) as DraftTextBlock | undefined;
    if (!b) return;
    b.title.en = (wrap.querySelector('[data-part="title-en"]') as HTMLInputElement)?.value ?? '';
    b.title.zh = (wrap.querySelector('[data-part="title-zh"]') as HTMLInputElement)?.value ?? '';
    b.body.en = (wrap.querySelector('[data-part="body-en"]') as HTMLTextAreaElement)?.value ?? '';
    b.body.zh = (wrap.querySelector('[data-part="body-zh"]') as HTMLTextAreaElement)?.value ?? '';
    saveQuiet();
  };

  wrap.querySelectorAll('input, textarea').forEach((el) => el.addEventListener('input', sync));

  wrap.querySelector('[data-del-block]')?.addEventListener('click', () => {
    const sec = draft!.detailSections.find((s) => s._key === sectionKey);
    if (!sec) return;
    sec.blocks = sec.blocks.filter((b) => b._key !== block._key);
    saveQuiet();
    wrap.remove();
  });

  return wrap;
}

function renderImageBlock(sectionKey: string, block: DraftImageBlock): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'adm-block adm-block-img';
  wrap.style.marginBottom = '16px';
  wrap.style.padding = '12px';
  wrap.style.border = '1px dashed var(--adm-border)';
  wrap.style.borderRadius = '6px';

  const imgsHtml = block.images
    .map(
      (im, i) => `
    <div class="adm-upload-slot-inner">
      <div class="adm-upload-frame adm-upload-frame--3-2">
        ${
          im.dataUrl
            ? `<img src="${esc(im.dataUrl)}" class="adm-upload-cover" alt="" />`
            : `<div class="adm-upload-placeholder">No image</div>`
        }
      </div>
      <input type="file" accept="image/*" data-img-idx="${i}" data-blk="${esc(block._key)}" style="margin-top:8px;" />
      <button type="button" class="adm-btn adm-btn--outline" style="margin-top:8px;font-size:0.75rem;" data-remove-img="${i}" data-blk="${esc(block._key)}">Remove image</button>
    </div>`
    )
    .join('');

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <strong style="font-size:0.8125rem;">Image group</strong>
      <div>
        <button type="button" class="adm-btn adm-btn--outline" style="font-size:0.75rem;margin-right:8px;" data-add-img-slot="${esc(block._key)}">+ Add image</button>
        <button type="button" class="adm-btn adm-btn--outline" style="font-size:0.75rem;" data-del-block-img="${esc(block._key)}">Remove group</button>
      </div>
    </div>
    <div data-img-list="${esc(block._key)}">${imgsHtml || '<p style="color:var(--adm-muted);font-size:0.875rem;">No images yet.</p>'}</div>`;

  wrap.querySelectorAll('input[type="file"]').forEach((inp) => {
    inp.addEventListener('change', async () => {
      const blkKey = (inp as HTMLInputElement).dataset.blk;
      const idx = Number((inp as HTMLInputElement).dataset.imgIdx);
      const file = (inp as HTMLInputElement).files?.[0];
      const sec = draft!.detailSections.find((s) => s._key === sectionKey);
      const blk = sec?.blocks.find((b) => b._key === blkKey && b._type === 'sectionImageBlock') as
        | DraftImageBlock
        | undefined;
      if (!blk || !file || !file.type.startsWith('image/')) return;
      const dataUrl = await readFile(file);
      if (!dataUrl) return;
      while (blk.images.length <= idx) blk.images.push({});
      blk.images[idx] = { ...blk.images[idx], dataUrl };
      saveQuiet();
      renderSections();
    });
  });

  wrap.querySelectorAll('[data-remove-img]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const blkKey = (btn as HTMLButtonElement).dataset.blk;
      const idx = Number((btn as HTMLButtonElement).dataset.removeImg);
      const sec = draft!.detailSections.find((s) => s._key === sectionKey);
      const blk = sec?.blocks.find((b) => b._key === blkKey) as DraftImageBlock | undefined;
      if (!blk || blk._type !== 'sectionImageBlock') return;
      blk.images.splice(idx, 1);
      saveQuiet();
      renderSections();
    });
  });

  wrap.querySelector('[data-add-img-slot]')?.addEventListener('click', () => {
    const sec = draft!.detailSections.find((s) => s._key === sectionKey);
    const blk = sec?.blocks.find((b) => b._key === block._key) as DraftImageBlock | undefined;
    if (!blk || blk._type !== 'sectionImageBlock') return;
    blk.images.push({});
    saveQuiet();
    renderSections();
  });

  wrap.querySelector('[data-del-block-img]')?.addEventListener('click', () => {
    const sec = draft!.detailSections.find((s) => s._key === sectionKey);
    if (!sec) return;
    sec.blocks = sec.blocks.filter((b) => b._key !== block._key);
    saveQuiet();
    renderSections();
  });

  return wrap;
}

function readFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

function saveQuiet(): void {
  if (!draft) return;
  Object.assign(draft, collectBasicsFromDom());
  syncBackgroundFromSections();
  upsertDraft(touchDraft(draft));
}

export function bootAdminProjectDetail(): void {
  const id = getIdFromQuery();
  if (!id) {
    window.location.href = '/admin/projects';
    return;
  }
  const d = getDraftById(id);
  if (!d) {
    window.location.href = '/admin/projects';
    return;
  }
  draft = d;

  const hasPb = draft.detailSections.some((s) => s.sectionKey === 'projectBackground');
  const bgLegacy =
    (draft.background.zh && draft.background.zh.trim()) ||
    (draft.background.en && draft.background.en.trim());
  if (!hasPb && bgLegacy) {
    draft.detailSections.push({
      _key: randomKey(),
      sectionKey: 'projectBackground',
      enabled: true,
      blocks: [],
      plainBody: { zh: draft.background.zh || '', en: draft.background.en || '' },
    });
    upsertDraft(touchDraft(draft));
  }

  const h = $('#detail-heading');
  if (h) {
    h.textContent = `${d.title.en || 'Project'} | ${d.title.zh || ''}`;
  }

  ($('#f-title-en') as HTMLInputElement).value = d.title.en || '';
  ($('#f-title-zh') as HTMLInputElement).value = d.title.zh || '';
  ($('#f-slug') as HTMLInputElement).value = d.slug || '';
  ($('#f-year') as HTMLSelectElement).value = d.year || String(new Date().getFullYear());
  ($('#f-services') as HTMLInputElement).value = d.services.join(', ');
  ($('#f-intro-en') as HTMLTextAreaElement).value = d.introduction.en || '';
  ($('#f-intro-zh') as HTMLTextAreaElement).value = d.introduction.zh || '';
  ($('#f-sum-en') as HTMLTextAreaElement).value = d.summary.en || '';
  ($('#f-sum-zh') as HTMLTextAreaElement).value = d.summary.zh || '';
  ($('#f-carousel') as HTMLInputElement).checked = d.showOnHomeCarousel;

  renderHeroPreview();

  $('#btn-save')?.addEventListener('click', () => {
    if (!draft) return;
    saveQuiet();
    alert('已保存（若已配置 Cloudflare KV，将自动同步到线上）');
  });

  $('#btn-remove-project')?.addEventListener('click', () => {
    if (!draft || !confirm('Delete this project draft?')) return;
    deleteDraft(draft.id);
    window.location.href = '/admin/projects';
  });

  $('#f-carousel')?.addEventListener('change', () => {
    saveQuiet();
  });

  $('#btn-hero-upload')?.addEventListener('click', () => {
    $('#f-hero-file')?.click();
  });

  $('#f-hero-file')?.addEventListener('change', async () => {
    const inp = $('#f-hero-file') as HTMLInputElement;
    const file = inp.files?.[0];
    if (!file || !draft) return;
    const url = await readFile(file);
    draft.heroImageDataUrl = url;
    saveQuiet();
    renderHeroPreview();
    inp.value = '';
  });

  renderSections();
}

function addSection(key: SectionKey): void {
  if (!draft) return;
  if (draft.detailSections.some((s) => s.sectionKey === key)) {
    alert('该板块已添加，请在下方编辑。');
    return;
  }
  const row: DraftDetailSection = {
    _key: randomKey(),
    sectionKey: key,
    enabled: true,
    blocks: [],
  };
  if (key === 'projectBackground') {
    row.plainBody = { zh: '', en: '' };
  }
  draft.detailSections.push(row);
  upsertDraft(touchDraft(draft));
  renderSections();
}

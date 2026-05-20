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
  SECTION_PICKER_OPTIONS,
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

  SECTION_PICKER_OPTIONS.forEach((opt) => {
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

  const pbToggleId = `pb-toggle-${sec._key}`;
  card.innerHTML = `
    <div class="adm-sec-card-head">
      <div class="adm-sec-card-head-left">
        <h3 class="adm-sec-card-title">项目背景</h3>
      </div>
      <div class="adm-sec-card-head-right">
        <button type="button" class="adm-btn adm-btn--outline adm-btn-sec-remove" data-pb-remove="${esc(sec._key)}">
          <img src="/admin/icons/icn_backend_remove_project.svg" alt="" width="16" height="16" class="adm-sec-remove-icon" />
          Remove Section
        </button>
        <span class="adm-sec-head-sep" aria-hidden="true"></span>
        <label class="adm-sec-display-toggle" for="${esc(pbToggleId)}">
          <span class="adm-switch">
            <input type="checkbox" id="${esc(pbToggleId)}" data-pb-toggle="${esc(sec._key)}" ${sec.enabled ? 'checked' : ''} />
            <span class="adm-switch-slider"></span>
          </span>
          <span class="adm-sec-display-label">Display</span>
        </label>
      </div>
    </div>
    <div class="adm-sec-card-divider"></div>
    <div class="adm-field">
      <label class="adm-label">EN Description</label>
      <textarea class="adm-textarea adm-pb-ta" data-pb-field="en" rows="6" placeholder="请输入"></textarea>
    </div>
    <div class="adm-field" style="margin-bottom:0">
      <label class="adm-label">CN Description</label>
      <textarea class="adm-textarea adm-pb-ta" data-pb-field="zh" rows="6" placeholder="请输入"></textarea>
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

/** 标准板块：合并为一块文案 + 一块图片列表（与设计稿一致，无 Image group） */
function normalizeStandardSection(sec: DraftDetailSection): void {
  if (sec.sectionKey === 'projectBackground') return;
  const textBlocks = sec.blocks.filter((b) => b._type === 'sectionTextBlock') as DraftTextBlock[];
  const imageBlocks = sec.blocks.filter((b) => b._type === 'sectionImageBlock') as DraftImageBlock[];

  let textBlock = textBlocks[0];
  if (!textBlock) {
    textBlock = {
      _key: randomKey(),
      _type: 'sectionTextBlock',
      title: { en: '', zh: '' },
      body: { en: '', zh: '' },
    };
  }

  const mergedImages = imageBlocks.flatMap((b) => b.images);
  let imageBlock = imageBlocks[0];
  if (!imageBlock) {
    imageBlock = { _key: randomKey(), _type: 'sectionImageBlock', images: mergedImages };
  } else {
    imageBlock = { ...imageBlock, images: mergedImages.length ? mergedImages : imageBlock.images };
  }

  sec.blocks = [textBlock, imageBlock];
}

function renderStandardSectionCard(sec: DraftDetailSection): HTMLElement {
  normalizeStandardSection(sec);
  const textBlock = sec.blocks.find((b) => b._type === 'sectionTextBlock') as DraftTextBlock;
  const imageBlock = sec.blocks.find((b) => b._type === 'sectionImageBlock') as DraftImageBlock;

  const meta = SECTION_OPTIONS.find((o) => o.key === sec.sectionKey);
  const titleEn = meta?.label ?? sec.sectionKey;
  const iconSrc = meta?.iconSrc ?? '';
  const toggleId = `sec-toggle-${sec._key}`;

  const card = document.createElement('div');
  card.className = 'adm-card adm-section-editor';
  card.dataset.sectionKey = sec._key;
  card.innerHTML = `
    <div class="adm-sec-card-head">
      <div class="adm-sec-card-head-left">
        ${iconSrc ? `<img class="adm-sec-card-icon" src="${esc(iconSrc)}" alt="" width="24" height="24" />` : ''}
        <h3 class="adm-sec-card-title">${esc(titleEn)}</h3>
      </div>
      <div class="adm-sec-card-head-right">
        <button type="button" class="adm-btn adm-btn--outline adm-btn-sec-remove" data-remove-sec="${esc(sec._key)}">
          <img src="/admin/icons/icn_backend_remove_project.svg" alt="" width="16" height="16" class="adm-sec-remove-icon" />
          Remove Section
        </button>
        <span class="adm-sec-head-sep" aria-hidden="true"></span>
        <label class="adm-sec-display-toggle" for="${esc(toggleId)}">
          <span class="adm-switch">
            <input type="checkbox" id="${esc(toggleId)}" data-sec-toggle="${esc(sec._key)}" ${sec.enabled ? 'checked' : ''} />
            <span class="adm-switch-slider"></span>
          </span>
          <span class="adm-sec-display-label">Display</span>
        </label>
      </div>
    </div>
    <div class="adm-sec-card-divider"></div>
    <div class="adm-field">
      <label class="adm-label">EN Description</label>
      <textarea class="adm-textarea" data-sec-body-en="${esc(sec._key)}" rows="5" placeholder="请输入"></textarea>
    </div>
    <div class="adm-field">
      <label class="adm-label">CN Description</label>
      <textarea class="adm-textarea" data-sec-body-zh="${esc(sec._key)}" rows="5" placeholder="请输入"></textarea>
    </div>
    <div class="adm-sec-images-mount" data-sec-images="${esc(sec._key)}"></div>`;

  const taEn = card.querySelector(`[data-sec-body-en]`) as HTMLTextAreaElement | null;
  const taZh = card.querySelector(`[data-sec-body-zh]`) as HTMLTextAreaElement | null;
  if (taEn) taEn.value = textBlock.body.en || '';
  if (taZh) taZh.value = textBlock.body.zh || '';

  const syncText = () => {
    const s = draft!.detailSections.find((x) => x._key === sec._key);
    const tb = s?.blocks.find((b) => b._type === 'sectionTextBlock') as DraftTextBlock | undefined;
    if (!tb) return;
    tb.body.en = taEn?.value ?? '';
    tb.body.zh = taZh?.value ?? '';
    saveQuiet();
  };
  taEn?.addEventListener('input', syncText);
  taZh?.addEventListener('input', syncText);

  const imagesMount = card.querySelector('.adm-sec-images-mount') as HTMLElement;
  imagesMount.appendChild(renderSectionImagesPanel(sec._key, imageBlock));

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

  return card;
}

function renderSectionCard(sec: DraftDetailSection): HTMLElement {
  if (sec.sectionKey === 'projectBackground') {
    return renderProjectBackgroundCard(sec);
  }
  return renderStandardSectionCard(sec);
}

function getSectionByInstanceKey(sectionInstanceKey: string): DraftDetailSection | undefined {
  return draft?.detailSections.find((s) => s._key === sectionInstanceKey);
}

/** 取板块内唯一的图片块（normalize 后仅保留一块） */
function getImageBlockInSection(sectionInstanceKey: string): DraftImageBlock | undefined {
  const sec = getSectionByInstanceKey(sectionInstanceKey);
  if (!sec) return undefined;
  normalizeStandardSection(sec);
  const blk = sec.blocks.find((b) => b._type === 'sectionImageBlock');
  return blk as DraftImageBlock | undefined;
}

/** 板块内 Images：纵向全宽、可拖拽排序、单张 Re-Upload / Remove（无 Image group） */
function renderSectionImagesPanel(sectionInstanceKey: string, imageBlock: DraftImageBlock): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'adm-sec-images-wrap';

  const safeId = imageBlock._key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const addInputId = `sec-img-add-${safeId}`;
  const reuploadInputId = `sec-img-reupload-${safeId}`;

  const rowsHtml = imageBlock.images
    .map(
      (im, i) => `
    <div class="adm-img-row" draggable="true" data-img-row="${i}">
      <div class="adm-img-row-drag" title="拖拽排序" aria-hidden="true">
        <img src="/admin/icons/icn_backend_drag_to_move.svg" alt="" width="14" height="14" />
      </div>
      <div class="adm-img-row-body">
        <div class="adm-img-row-preview">
          ${
            im.dataUrl
              ? `<img src="${esc(im.dataUrl)}" class="adm-img-fluid" alt="" />`
              : `<div class="adm-img-placeholder-box" aria-hidden="true"></div>`
          }
        </div>
        <div class="adm-img-row-actions">
          <button type="button" class="adm-img-action-btn" data-reupload-img="${i}" data-blk="${esc(imageBlock._key)}">
            <img src="${HERO_ICON_RESET}" alt="" width="16" height="16" />
            Re-Upload Image
          </button>
          <span class="adm-img-action-sep" aria-hidden="true">|</span>
          <button type="button" class="adm-img-action-btn adm-img-action-btn--remove" data-remove-img="${i}" data-blk="${esc(imageBlock._key)}">
            <img src="/admin/icons/icn_backend_remove_project.svg" alt="" width="16" height="16" />
            Remove Image
          </button>
        </div>
      </div>
    </div>`
    )
    .join('');

  wrap.innerHTML = `
    <div class="adm-images-panel">
      <div class="adm-images-bar">
        <span class="adm-images-bar-label">Images</span>
        <button type="button" class="adm-btn-add-images" data-trigger-sec-img-add="${esc(imageBlock._key)}">
          <span class="adm-btn-add-images-plus" aria-hidden="true">+</span>
          Add Image
        </button>
        <input type="file" id="${esc(addInputId)}" class="adm-hero-file-input" accept="image/*" multiple data-sec-img-add="${esc(imageBlock._key)}" />
        <input type="file" id="${esc(reuploadInputId)}" class="adm-hero-file-input" accept="image/*" data-sec-img-reupload="${esc(imageBlock._key)}" />
      </div>
      <div class="adm-images-stack${imageBlock.images.length === 0 ? ' is-empty' : ''}" data-img-stack="${esc(imageBlock._key)}">${rowsHtml}</div>
    </div>`;

  let reuploadIdx: number | null = null;

  const addBtn = wrap.querySelector('[data-trigger-sec-img-add]') as HTMLButtonElement | null;
  const addInp = wrap.querySelector('input[data-sec-img-add]') as HTMLInputElement | null;
  const reuploadInp = wrap.querySelector('input[data-sec-img-reupload]') as HTMLInputElement | null;

  addBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    addInp?.click();
  });

  addInp?.addEventListener('change', async () => {
    const files = addInp.files ? Array.from(addInp.files) : [];
    addInp.value = '';
    if (!files.length) return;

    const blk = getImageBlockInSection(sectionInstanceKey);
    if (!blk) return;

    let added = false;
    for (const file of files) {
      if (!isImageFile(file)) continue;
      const dataUrl = await readFile(file);
      if (dataUrl) {
        blk.images.push({ dataUrl });
        added = true;
      }
    }
    if (!added) return;
    saveQuiet();
    renderSections();
  });

  reuploadInp?.addEventListener('change', async () => {
    const file = reuploadInp.files?.[0];
    reuploadInp.value = '';
    const blk = getImageBlockInSection(sectionInstanceKey);
    if (!blk || reuploadIdx === null || !file || !isImageFile(file)) return;
    const dataUrl = await readFile(file);
    if (!dataUrl) return;
    blk.images[reuploadIdx] = { ...blk.images[reuploadIdx], dataUrl };
    reuploadIdx = null;
    saveQuiet();
    renderSections();
  });

  wrap.querySelectorAll('[data-reupload-img]').forEach((btn) => {
    btn.addEventListener('click', () => {
      reuploadIdx = Number((btn as HTMLButtonElement).dataset.reuploadImg);
      reuploadInp?.click();
    });
  });

  wrap.querySelectorAll('[data-remove-img]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number((btn as HTMLButtonElement).dataset.removeImg);
      const blk = getImageBlockInSection(sectionInstanceKey);
      if (!blk) return;
      blk.images.splice(idx, 1);
      saveQuiet();
      renderSections();
    });
  });

  const stack = wrap.querySelector('[data-img-stack]') as HTMLElement | null;
  if (stack) bindSectionImageDrag(stack, sectionInstanceKey);

  return wrap;
}

function bindSectionImageDrag(stack: HTMLElement, sectionInstanceKey: string): void {
  let dragFrom = -1;

  stack.querySelectorAll<HTMLElement>('.adm-img-row').forEach((row) => {
    row.addEventListener('dragstart', (e) => {
      dragFrom = Number(row.dataset.imgRow);
      row.classList.add('is-dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(dragFrom));
      }
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('is-dragging');
      stack.querySelectorAll('.adm-img-row').forEach((r) => r.classList.remove('is-drag-over'));
      dragFrom = -1;
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      row.classList.add('is-drag-over');
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('is-drag-over');
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('is-drag-over');
      const dragTo = Number(row.dataset.imgRow);
      if (dragFrom < 0 || dragFrom === dragTo) return;
      const blk = getImageBlockInSection(sectionInstanceKey);
      if (!blk) return;
      const imgs = [...blk.images];
      const [moved] = imgs.splice(dragFrom, 1);
      if (!moved) return;
      imgs.splice(dragTo, 0, moved);
      blk.images = imgs;
      saveQuiet();
      renderSections();
    });
  });
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|svg|bmp|heic|heif)$/i.test(file.name);
}

function readFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

/** 保存到列表前：若勾选首页轮播，把顺序压到比其它已选作品更小，使出现在 Carousel 最前 */
function bumpCarouselOrderIfShown(project: AdminProjectDraft): void {
  if (!project.showOnHomeCarousel) return;
  const list = loadAllDrafts();
  const others = list.filter((p) => p.id !== project.id && p.showOnHomeCarousel);
  const minO = others.length ? Math.min(...others.map((p) => p.homeCarouselOrder)) : null;
  project.homeCarouselOrder = minO === null ? 0 : minO - 1;
}

function saveQuiet(): void {
  if (!draft) return;
  Object.assign(draft, collectBasicsFromDom());
  syncBackgroundFromSections();
  try {
    upsertDraft(touchDraft(draft));
  } catch (err) {
    console.error(err);
    alert('保存到浏览器本地失败，图片可能过大。请减少图片数量或尺寸后重试。');
  }
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

  // 项目背景为主内容区默认首块；无则从顶层 background 迁移或新建空块
  const hasPb = draft.detailSections.some((s) => s.sectionKey === 'projectBackground');
  if (!hasPb) {
    const hasLegacyBg =
      (draft.background.zh && draft.background.zh.trim()) ||
      (draft.background.en && draft.background.en.trim());
    const plainBody = hasLegacyBg
      ? { zh: draft.background.zh || '', en: draft.background.en || '' }
      : { zh: '', en: '' };
    draft.detailSections.unshift({
      _key: randomKey(),
      sectionKey: 'projectBackground',
      enabled: true,
      blocks: [],
      plainBody,
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
    bumpCarouselOrderIfShown(draft);
    saveQuiet();
    window.location.href = '/admin/projects';
  });

  $('#btn-detail-cancel')?.addEventListener('click', () => {
    window.location.href = '/admin/projects';
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
  } else {
    row.blocks = [
      {
        _key: randomKey(),
        _type: 'sectionTextBlock',
        title: { en: '', zh: '' },
        body: { en: '', zh: '' },
      },
      {
        _key: randomKey(),
        _type: 'sectionImageBlock',
        images: [],
      },
    ];
  }
  draft.detailSections.push(row);
  upsertDraft(touchDraft(draft));
  renderSections();
}

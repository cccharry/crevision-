/**
 * 后台图片：压缩后再以 data URL 存入 localStorage / 同步 KV。
 * 前台仍可全宽展示；限制的是存储体积，不是页面上的显示尺寸。
 */

import type { AdminProjectDraft } from './admin-project-draft.ts';

export type CompressOptions = {
  /** 最长边上限（像素），高图主要受 maxHeight 约束 */
  maxWidth?: number;
  maxHeight?: number;
  /** JPEG/WebP 质量 0–1 */
  quality?: number;
  /** 单张压缩后 data URL 目标上限（字符约等于字节） */
  maxChars?: number;
};

const DEFAULTS: Required<CompressOptions> = {
  maxWidth: 2560,
  maxHeight: 12000,
  quality: 0.88,
  maxChars: 1_400_000,
};

/** 点 Save 时对未压缩旧图使用更紧的参数，避免卡住 localStorage */
export const SAVE_COMPRESS_OPTS: CompressOptions = {
  maxWidth: 1920,
  maxHeight: 8000,
  quality: 0.82,
  maxChars: 650_000,
};

const PER_IMAGE_TIMEOUT_MS = 45_000;
/** 单张图画布最长边，避免超出浏览器 canvas 上限 */
const MAX_CANVAS_SIDE = 8192;

export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(file.name);
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

function scaleToFit(
  w: number,
  h: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  let tw = w;
  let th = h;
  if (tw > maxW) {
    th = (th * maxW) / tw;
    tw = maxW;
  }
  if (th > maxH) {
    tw = (tw * maxH) / th;
    th = maxH;
  }
  let width = Math.max(1, Math.round(tw));
  let height = Math.max(1, Math.round(th));
  const scale = Math.min(1, MAX_CANVAS_SIDE / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));
  return { width, height };
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  try {
    return canvas.toDataURL('image/webp', quality);
  } catch {
    return canvas.toDataURL('image/jpeg', quality);
  }
}

function drawToCanvas(img: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unsupported');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    }),
  ]);
}

async function decodeToCanvas(
  dataUrl: string,
  maxW: number,
  maxH: number,
): Promise<HTMLCanvasElement> {
  // 超长 data URL 用 fetch 在部分浏览器会失败，统一用 Image 解码
  const img = await loadImageFromUrl(dataUrl);
  const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, maxW, maxH);
  return drawToCanvas(img, width, height);
}

/** 将已有 data URL 重新编码压缩（保存失败时对草稿内图片重试） */
export async function compressDataUrl(
  dataUrl: string,
  opts?: CompressOptions,
): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  const o = { ...DEFAULTS, ...opts };
  if (dataUrl.length <= o.maxChars * 0.85) return dataUrl;

  const run = async () => {
    const canvas = await decodeToCanvas(dataUrl, o.maxWidth, o.maxHeight);
    let q = o.quality;
    let out = canvasToDataUrl(canvas, q);
    while (out.length > o.maxChars && q > 0.45) {
      q -= 0.08;
      out = canvasToDataUrl(canvas, q);
    }
    return out;
  };

  return withTimeout(run(), PER_IMAGE_TIMEOUT_MS, 'compress');
}

/** 从本地文件读取并压缩为 data URL */
export async function readCompressedImageFile(
  file: File,
  opts?: CompressOptions,
): Promise<string | null> {
  if (!isImageFile(file)) return null;
  if (file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(file);
    });
  }

  const o = { ...DEFAULTS, ...opts };
  // 原图已很小则不再压
  if (file.size < 280_000) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(file);
    });
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = scaleToFit(bitmap.width, bitmap.height, o.maxWidth, o.maxHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    let q = o.quality;
    let out = canvasToDataUrl(canvas, q);
    while (out.length > o.maxChars && q > 0.45) {
      q -= 0.08;
      out = canvasToDataUrl(canvas, q);
    }
    return out;
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImageFromUrl(url);
      const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, o.maxWidth, o.maxHeight);
      const canvas = drawToCanvas(img, width, height);
      let q = o.quality;
      let out = canvasToDataUrl(canvas, q);
      while (out.length > o.maxChars && q > 0.45) {
        q -= 0.08;
        out = canvasToDataUrl(canvas, q);
      }
      return out;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** 草稿是否含超大未压缩图（Save 前主动压缩，避免点击无反应） */
export function draftHasOversizedImages(draft: AdminProjectDraft, thresholdChars = 480_000): boolean {
  const big = (url?: string | null) => !!url && url.startsWith('data:image/') && url.length > thresholdChars;
  if (big(draft.heroImageDataUrl)) return true;
  for (const sec of draft.detailSections ?? []) {
    for (const blk of sec.blocks ?? []) {
      if (blk._type !== 'sectionImageBlock') continue;
      for (const im of blk.images ?? []) {
        if (big(im.dataUrl)) return true;
      }
    }
  }
  return false;
}

/** 保存前/失败时：压缩草稿内全部位图 */
export async function compressDraftImages(
  draft: AdminProjectDraft,
  opts?: CompressOptions,
): Promise<{ failed: number }> {
  const o = opts ?? SAVE_COMPRESS_OPTS;
  let failed = 0;

  const compressOne = async (url: string): Promise<string> => {
    try {
      return await compressDataUrl(url, o);
    } catch (e) {
      console.warn('[cms] compress image failed', e);
      failed += 1;
      return url;
    }
  };

  if (draft.heroImageDataUrl?.startsWith('data:image/')) {
    draft.heroImageDataUrl = await compressOne(draft.heroImageDataUrl);
  }
  for (const sec of draft.detailSections ?? []) {
    for (const blk of sec.blocks ?? []) {
      if (blk._type !== 'sectionImageBlock') continue;
      if (!Array.isArray(blk.images)) blk.images = [];
      for (let i = 0; i < blk.images.length; i++) {
        const url = blk.images[i]?.dataUrl;
        if (url?.startsWith('data:image/')) {
          blk.images[i] = { ...blk.images[i], dataUrl: await compressOne(url) };
        }
      }
    }
  }
  return { failed };
}

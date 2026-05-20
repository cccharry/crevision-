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
  return { width: Math.max(1, Math.round(tw)), height: Math.max(1, Math.round(th)) };
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

/** 将已有 data URL 重新编码压缩（保存失败时对草稿内图片重试） */
export async function compressDataUrl(
  dataUrl: string,
  opts?: CompressOptions,
): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  const o = { ...DEFAULTS, ...opts };
  const img = await loadImageFromUrl(dataUrl);
  const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, o.maxWidth, o.maxHeight);
  let canvas = drawToCanvas(img, width, height);
  let q = o.quality;
  let out = canvasToDataUrl(canvas, q);
  while (out.length > o.maxChars && q > 0.45) {
    q -= 0.08;
    out = canvasToDataUrl(canvas, q);
  }
  return out;
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

/** 保存失败时：压缩草稿内全部位图后再试 */
export async function compressDraftImages(draft: AdminProjectDraft): Promise<void> {
  if (draft.heroImageDataUrl?.startsWith('data:image/')) {
    draft.heroImageDataUrl = await compressDataUrl(draft.heroImageDataUrl);
  }
  for (const sec of draft.detailSections) {
    for (const blk of sec.blocks) {
      if (blk._type !== 'sectionImageBlock') continue;
      for (let i = 0; i < blk.images.length; i++) {
        const url = blk.images[i]?.dataUrl;
        if (url?.startsWith('data:image/')) {
          blk.images[i] = { ...blk.images[i], dataUrl: await compressDataUrl(url) };
        }
      }
    }
  }
}

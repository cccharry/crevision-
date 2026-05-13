/// <reference types="@cloudflare/workers-types" />
/**
 * KV 中整站 CMS 载荷（与浏览器 localStorage 结构对齐，便于同步）
 */

export type CmsPayloadV1 = {
  version: 1;
  updatedAt: string;
  projectsJson: string;
  whoWeAreJson: string;
};

const KV_KEY = 'cms:v1';

export async function readPayload(kv: KVNamespace): Promise<CmsPayloadV1 | null> {
  const raw = await kv.get(KV_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CmsPayloadV1;
  } catch {
    return null;
  }
}

export async function writePayload(kv: KVNamespace, body: Omit<CmsPayloadV1, 'version' | 'updatedAt'>): Promise<void> {
  const payload: CmsPayloadV1 = {
    version: 1,
    updatedAt: new Date().toISOString(),
    ...body,
  };
  await kv.put(KV_KEY, JSON.stringify(payload));
}

export { KV_KEY };

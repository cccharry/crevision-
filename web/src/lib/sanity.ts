/**
 * Sanity 只读客户端（前台构建 / SSR 拉取案例数据）
 */
import { createClient, type SanityClient } from '@sanity/client';

function getEnv(): { projectId: string; dataset: string; apiVersion: string } {
  const projectId = import.meta.env.SANITY_PROJECT_ID ?? '';
  const dataset = import.meta.env.SANITY_DATASET ?? 'production';
  const apiVersion = import.meta.env.SANITY_API_VERSION ?? '2024-01-01';
  return { projectId, dataset, apiVersion };
}

/** 未配置 SANITY_PROJECT_ID 时返回 null，页面可走占位逻辑 */
export function getSanityClient(): SanityClient | null {
  const { projectId, dataset, apiVersion } = getEnv();
  if (!projectId) return null;
  return createClient({ projectId, dataset, apiVersion, useCdn: true });
}

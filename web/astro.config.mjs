import { defineConfig } from 'astro/config';

// 静态站点：构建时从 Sanity 拉数据（需在环境变量中配置 SANITY_*）
export default defineConfig({
  output: 'static',
  site: undefined,
});

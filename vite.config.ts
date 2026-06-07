/**
 * vite.config.ts - Vite 构建工具配置文件
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 从 .env 文件读取后端地址，默认 localhost:8081
const API_TARGET = process.env.VITE_API_BASE_URL || 'http://localhost:8081';

export default defineConfig({
  build: {
    outDir: 'docs'  // 输出到子模块内，此目录由 GitHub Pages 部署
  },
  plugins: [vue()],
  base: '/ai-study-buddy-frontend/', // GitHub Pages 项目站点路径
  server: {
    port: 5173,
    /**
     * 代理配置：解决开发环境跨域
     * 前端请求 /api/xxx -> Vite 转发到后端
     * 修改 .env 中的 VITE_API_BASE_URL 即可切换后端地址
     */
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      }
    }
  }
});

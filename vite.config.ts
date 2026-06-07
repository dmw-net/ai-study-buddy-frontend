/**
 * vite.config.ts - Vite 构建工具配置文件
 */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 从 .env 文件读取后端地址，默认 localhost:8081
const API_TARGET = process.env.VITE_API_BASE_URL || 'http://localhost:8081';

export default defineConfig({
  build: {
    outDir: 'docs'
  },
  plugins: [vue()],
  base: '/',
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

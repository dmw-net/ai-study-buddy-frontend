/**
 * vite.config.ts - Vite 构建工具配置文件
 * 功能：配置项目的构建选项、开发服务器、代理等
 */

// 导入 Vite 配置函数
import { defineConfig } from 'vite';

// 导入 Vue 插件（用于处理 .vue 文件）
import vue from '@vitejs/plugin-vue';

/**
 * 导出 Vite 配置对象
 * defineConfig 提供类型提示和自动补全
 */
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue' // 注意：需要导入 vue 插件（如果之前没导入的话）

/**
 * 导出 Vite 配置对象
 * defineConfig 提供类型提示和自动补全
 */
export default defineConfig({
  build: {
    outDir: 'docs' // 打包输出目录改为 docs（而非默认的 dist）
  },
  // 插件配置：Vue 插件用于编译 .vue 单文件组件
  plugins: [vue()],
  base: '/',  // 部署基础路径（GitHub Pages 项目路径）
  // 开发服务器配置
  server: {
    port: 5173,  // 开发服务器端口号（默认 5173）
    
    /**
     * 代理配置：解决跨域问题
     * 将所有以 /api 开头的请求转发到后端服务器
     * 
     * 工作原理：
     * 1. 前端请求：http://localhost:5173/api/ai/chat
     * 2. Vite 代理转发：http://65835af6.r6.cpolar.cn/api/ai/chat
     * 3. 后端处理请求并返回响应
     * 
     * 这样前端和后端可以运行在不同端口，避免跨域限制
     */
    proxy: {
      '/api': {
        target: 'http://43.136.53.215:8081/',  // 后端服务器地址
        changeOrigin: true,                // 修改请求头中的 origin，确保跨域请求成功
        secure: false                      // 如果是 HTTPS，允许自签名证书（这里是 HTTP，不影响）
      }
    }
  }
});


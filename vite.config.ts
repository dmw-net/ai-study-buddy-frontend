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
export default defineConfig({
  // 插件配置：Vue 插件用于编译 .vue 单文件组件
  plugins: [vue()],
  
  // 开发服务器配置
  server: {
    port: 5173,  // 开发服务器端口号（默认 5173）
    
    /**
     * 代理配置：解决跨域问题
     * 将所有以 /api 开头的请求转发到后端服务器
     * 
     * 工作原理：
     * 1. 前端请求：http://localhost:5173/api/ai/chat
     * 2. Vite 代理转发：http://localhost:8081/api/ai/chat
     * 3. 后端处理请求并返回响应
     * 
     * 这样前端和后端可以运行在不同端口，避免跨域限制
     */
    proxy: {
      '/api': {
        target: 'http://localhost:8081',  // 后端服务器地址
        changeOrigin: true,                // 修改请求头中的 origin，确保跨域请求成功
        secure: false,                     // 如果是 HTTPS，允许自签名证书
        // SSE 专用配置
        ws: true,                          // 启用 WebSocket 代理（SSE 也需要）
        // 注意：Vite 的代理基于 http-proxy-middleware
        // 对于 SSE 长连接，建议不在代理层设置超时
      }
    }
  }
});



// ========================================
// API 配置文件
// 修改 .env 中的 VITE_API_BASE_URL 即可切换环境
// ========================================

const isProduction = import.meta.env.PROD;

// 后端地址（从 .env 读取，修改 .env 文件即可生效）
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export const API_CONFIG = {
  /**
   * 基础 URL
   * - 开发环境：使用 /api 相对路径，由 Vite 代理转发到后端
   * - 生产环境：使用 VITE_API_BASE_URL + /api 拼完整地址
   */
  BASE_URL: isProduction
    ? `${BASE_URL}/api`
    : '/api',

  ENDPOINTS: {
    CHAT: '/ai/chat'
  }
};

/**
 * 获取完整的 API URL
 * @param endpoint - API 端点路径，如 /ai/chat
 * @param params - 查询参数键值对
 */
export function getApiUrl(endpoint: string, params?: Record<string, string>): string {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, value);
    });
    url += `?${searchParams.toString()}`;
  }

  return url;
}

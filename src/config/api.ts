// API配置文件
// 集中管理所有API相关的配置，便于维护和环境切换

// 检测当前环境
const isProduction = import.meta.env.PROD;

// 后端API的基础URL配置
export const API_CONFIG = {
  // 基础URL - 根据环境选择不同的URL
  // 生产环境：直接使用后端的公网URL（需要后端支持跨域）
  // 开发环境：使用相对路径（由Vite代理处理跨域）
  BASE_URL: isProduction 
    ? 'http://api.2025521.xyz/api'
    : '/api',
  
  // API端点路径
  ENDPOINTS: {
    CHAT: '/ai/chat'
  }
};

// 获取完整的API URL
export function getApiUrl(endpoint: string, params?: Record<string, string>): string {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  // 如果有参数，添加到URL查询字符串
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, value);
    });
    url += `?${searchParams.toString()}`;
  }
  
  return url;
}
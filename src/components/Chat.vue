<!--
  Chat.vue - 聊天界面核心组件
  功能：实现与 AI 助手的实时对话，支持 SSE（Server-Sent Events）流式响应
-->
<template>
  <!-- 聊天容器：使用 flex 布局，垂直排列 -->
  <section class="chat">
    <!-- 聊天头部：显示当前会话 ID -->
    <div class="chat-header">
      <div>会话 ID：{{ memoryId }}</div>
    </div>

    <!-- 消息列表区域：可滚动，显示所有聊天记录 -->
    <div ref="scrollContainer" class="chat-messages">
      <!-- 
        v-for 循环渲染每条消息
        :key="idx" 使用索引作为 key（实际项目建议用唯一 ID）
        :class="m.role" 根据角色（user/assistant）应用不同样式
      -->
      <div v-for="(m, idx) in messages" :key="idx" class="message" :class="m.role">
        <!-- 消息气泡 -->
        <div class="bubble">
          <p class="text">{{ m.content }}</p>
        </div>
      </div>
    </div>

    <!-- 输入区域：表单提交时触发发送 -->
    <form class="chat-input" @submit.prevent="onSend">
      <!-- 
        v-model="inputText" 双向绑定输入框的值
        :disabled="loading" 加载时禁用输入
        @keydown.enter.exact.prevent 阻止默认回车换行，改为发送消息
      -->
      <input
        v-model="inputText"
        class="input"
        type="text"
        :placeholder="placeholder"
        :disabled="loading"
        @keydown.enter.exact.prevent="onSend"
      />
      <!-- 发送按钮：根据 canSend 计算属性控制是否可点击 -->
      <button class="send" type="submit" :disabled="!canSend">发送</button>
    </form>
  </section>
</template>

<script setup lang="ts">
/**
 * Vue 3 Composition API 导入
 * - onMounted: 组件挂载后执行（类似 Vue 2 的 mounted）
 * - onUnmounted: 组件卸载前执行（类似 Vue 2 的 beforeDestroy）
 * - reactive: 创建响应式对象（用于对象/数组）
 * - ref: 创建响应式引用（用于基本类型或 DOM 引用）
 * - watch: 监听数据变化
 * - nextTick: 等待 DOM 更新完成
 * - computed: 创建计算属性
 */
import { onMounted, onUnmounted, reactive, ref, watch, nextTick, computed } from 'vue';
import { API_CONFIG, getApiUrl } from '../config/api';

/**
 * TypeScript 类型定义
 */
// 消息角色类型：用户或助手
type Role = 'user' | 'assistant';

// 聊天消息接口
interface ChatMessage {
  role: Role;        // 消息发送者角色
  content: string;   // 消息内容
}

/**
 * 响应式数据定义
 */
// ref：用于基本类型和 DOM 引用
const inputText = ref('');                    // 输入框内容
const loading = ref(false);                   // 是否正在加载（发送请求中）
const scrollContainer = ref<HTMLDivElement | null>(null);  // 消息容器的 DOM 引用
const abortController = ref<AbortController | null>(null);  // fetch 中断控制器，替代 EventSource
const memoryId = ref(generateMemoryId());     // 会话 ID（用于区分不同对话）

// reactive：用于对象和数组
const messages = reactive<ChatMessage[]>([]);  // 聊天消息列表

// 常量
const placeholder = '问我任何编程学习或面试问题...';

/**
 * 计算属性：判断是否可以发送消息
 * 条件：输入框有内容 && 不在加载状态
 */
const canSend = computed(() => inputText.value.trim().length > 0 && !loading.value);

/**
 * 生命周期钩子：组件挂载时执行
 */
onMounted(() => {
  // 添加欢迎消息
  messages.push({ role: 'assistant', content: '你好，我是 AI 编程小助手。有什么可以帮你？' });
});

/**
 * 生命周期钩子：组件卸载前执行
 */
onUnmounted(() => {
  // 关闭 SSE 连接，释放资源
  closeStream();
});

/**
 * 监听器：监听 messages 数组的变化
 * 当有新消息时，自动滚动到底部
 */
watch(messages, async () => {
  // 等待 Vue 完成 DOM 更新
  await nextTick();
  // 如果有滚动容器引用，滚动到底部
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
});

/**
 * 生成会话 ID
 * 使用时间戳 + 随机数，确保唯一性
 * @returns 9位数字的会话 ID
 */
function generateMemoryId(): number {
  const rand = Math.floor(Math.random() * 100000);
  // 将时间戳和随机数拼接，取最后 9 位
  return Number(`${Date.now()}${rand}`.slice(-9));
}

/**
 * 发送消息处理函数
 * 在用户点击发送按钮或按回车时触发
 */
function onSend() {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  messages.push({ role: 'user', content: text });
  inputText.value = '';

  messages.push({ role: 'assistant', content: '' });
  const assistantMsgIndex = messages.length - 1;

  openStream(text, assistantMsgIndex);
}

/**
 * 使用 fetch + ReadableStream 接收流式响应
 * 替代 EventSource，避免换行符丢失 / SSE 解析兼容性问题
 */
async function openStream(text: string, messageIndex: number) {
  loading.value = true;
  closeStream();

  const params = {
    memoryId: memoryId.value.toString(),
    message: text
  };
  const url = getApiUrl(API_CONFIG.ENDPOINTS.CHAT, params);

  const controller = new AbortController();
  abortController.value = controller;

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'text/event-stream' }
    });

    if (!response.ok) {
      console.error('请求失败:', response.status);
      loading.value = false;
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      console.error('无法获取响应流');
      loading.value = false;
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按 SSE 事件分隔符 \n\n 拆分
      const parts = buffer.split('\n\n');
      // 最后一个可能是不完整的，留在 buffer 中
      buffer = parts.pop() || '';

      for (const part of parts) {
        const lines = part.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            // 去掉 "data:" 前缀，保留空格（空格是模型 token 的一部分，不能 trim）
            const data = line.slice(5);
            if (data === '[DONE]') {
              continue;
            }
            if (messageIndex >= 0 && messageIndex < messages.length && data) {
              messages[messageIndex].content += data;
            }
          }
        }
      }
    }

    // 处理 buffer 中残留的数据
    if (buffer) {
      const lines = buffer.split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5);  // 保留空格，不 trim
          if (data && data !== '[DONE]') {
            if (messageIndex >= 0 && messageIndex < messages.length) {
              messages[messageIndex].content += data;
            }
          }
        }
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('流式读取错误:', err);
    }
  } finally {
    loading.value = false;
  }
}

/**
 * 关闭流式连接
 */
function closeStream() {
  if (abortController.value) {
    abortController.value.abort();
    abortController.value = null;
  }
  loading.value = false;
}
</script>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}
.chat-header {
  flex: 0 0 auto;
  padding: 8px 16px;
  font-size: 12px;
  color: #666;
  border-bottom: 1px dashed #eee;
}
.chat-messages {
  flex: 1 1 auto;
  overflow: auto;
  padding: 16px;
  background: #fafafa;
}
.message {
  display: flex;
  margin-bottom: 12px;
}
.message.user {
  justify-content: flex-end;
}
.message.assistant {
  justify-content: flex-start;
}
.bubble {
  max-width: 75%;
  background: white;
  border: 1px solid #eee;
  border-radius: 10px;
  padding: 10px 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.message.user .bubble {
  background: #e8f3ff;
  border-color: #d0e7ff;
}
.text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}
.chat-input {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid #eee;
  background: #fff;
}
.input {
  flex: 1 1 auto;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  outline: none;
}
.input:disabled {
  background: #f5f5f5;
}
.send {
  flex: 0 0 auto;
  min-width: 84px;
  height: 40px;
  padding: 0 14px;
  border: none;
  border-radius: 8px;
  background: #1677ff;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}
.send:disabled {
  background: #9ec5ff;
  cursor: not-allowed;
}
</style>



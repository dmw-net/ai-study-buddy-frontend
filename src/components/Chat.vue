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
          <!-- 使用 pre 标签保持文本格式（换行、空格等） -->
          <pre class="text">{{ m.content }}</pre>
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
const evtSource = ref<EventSource | null>(null);          // SSE 连接对象
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
  // 获取并清理输入文本
  const text = inputText.value.trim();
  // 如果为空或正在加载，直接返回
  if (!text || loading.value) return;

  // 1. 将用户消息添加到消息列表
  messages.push({ role: 'user', content: text });
  // 2. 清空输入框
  inputText.value = '';

  // 3. 创建一个空的助手消息占位符（用于实时显示 AI 回复）
  messages.push({ role: 'assistant', content: '' });
  // 获取刚添加的消息索引（数组最后一个元素）
  const assistantMsgIndex = messages.length - 1;

  // 4. 开始 SSE 流式请求，实时更新消息内容
  openStream(text, assistantMsgIndex);
}

/**
 * 打开 SSE 连接，接收流式响应
 * @param text 用户输入的消息
 * @param messageIndex 助手消息在数组中的索引（用于实时更新内容）
 */
function openStream(text: string, messageIndex: number) {
  // 设置加载状态
  loading.value = true;
  // 关闭之前的连接（如果有）
  closeStream();

  // 构建 SSE 请求 URL
  // encodeURIComponent 对参数进行 URL 编码，防止特殊字符导致问题
  const url = `/api/ai/chat?memoryId=${encodeURIComponent(memoryId.value)}&message=${encodeURIComponent(text)}`;
  
  // 创建 EventSource 对象（浏览器原生 SSE API）
  const es = new EventSource(url);
  evtSource.value = es;

  /**
   * SSE 消息事件处理
   * 当服务器发送数据时触发
   */
  es.onmessage = (e: MessageEvent) => {
    // 调试日志：打印接收到的数据
    console.log('收到 SSE 数据:', e.data);
    
    // 如果收到结束标记，关闭连接
    if (e.data === '[DONE]') {
      console.log('收到结束标记，关闭连接');
      closeStream();
      return;
    }
    // 忽略心跳消息（ping、keepalive）和空数据
    if (!e.data || e.data === 'ping' || e.data === 'keepalive') {
      console.log('忽略心跳消息');
      return;
    }
    
    // 确保消息索引有效
    if (messageIndex >= 0 && messageIndex < messages.length) {
      // 将接收到的数据片段追加到助手消息内容中
      // 使用数组索引直接更新，确保 Vue 响应式系统能检测到变化
      // 这样就能实现逐字显示的效果
      messages[messageIndex].content += e.data;
      console.log('已更新消息内容，当前长度:', messages[messageIndex].content.length);
    } else {
      console.error('消息索引无效:', messageIndex, '消息数组长度:', messages.length);
    }
  };

  /**
   * SSE 打开事件处理（连接建立成功）
   */
  es.onopen = () => {
    console.log('SSE 连接已建立');
  };

  /**
   * SSE 错误事件处理
java.net.SocketTimeoutException: timeout
	at okhttp3.internal.http2.Http2Stream$StreamTimeout.newTimeoutException(Http2Stream.kt:675) ~[okhttp-4.12.0.jar:na]
	at okhttp3.internal.http2.Http2Stream$StreamTimeout.exitAndThrowIfTimedOut(Http2Stream.kt:684) ~[okhttp-4.12.0.jar:na]
	at okhttp3.internal.http2.Http2Stream$FramingSource.read(Http2Stream.kt:380) ~[okhttp-4.12.0.jar:na]
	at okhttp3.internal.connection.Exchange$ResponseBodySource.read(Exchange.kt:281) ~[okhttp-4.12.0.jar:na]
	at okio.RealBufferedSource.select(RealBufferedSource.kt:232) ~[okio-jvm-3.6.0.jar:na]
	at okhttp3.internal.sse.ServerSentEventReader.processNextEvent(ServerSentEventReader.kt:50) ~[okhttp-sse-4.12.0.jar:na]
	at okhttp3.internal.sse.RealEventSource.processResponse(RealEventSource.kt:75) ~[okhttp-sse-4.12.0.jar:na]
	at okhttp3.internal.sse.RealEventSource.onResponse(RealEventSource.kt:46) ~[okhttp-sse-4.12.0.jar:na]
	at okhttp3.internal.connection.RealCall$AsyncCall.run(RealCall.kt:519) ~[okhttp-4.12.0.jar:na]
	at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1144) ~[na:na]
	at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:642) ~[na:na]
	at java.base/java.lang.Thread.run(Thread.java:1583) ~[na:na]
   * 
   * 注意：EventSource 的 onerror 事件在以下情况都会触发：
   * 1. 服务器正常关闭连接（发送完数据后）- 这是正常的，不是错误
   * 2. 网络连接中断 - 这是真正的错误
   * 3. 服务器主动断开连接 - 可能是正常结束，也可能是错误
   * 
   * 因此我们需要通过 readyState 来判断：
   * - EventSource.CONNECTING (0): 正在连接
   * - EventSource.OPEN (1): 连接已打开
   * - EventSource.CLOSED (2): 连接已关闭
   */
  es.onerror = (error) => {
    // 获取当前消息内容长度，用于判断是否已收到数据
    const hasReceivedData = messageIndex >= 0 && 
                          messageIndex < messages.length && 
                          messages[messageIndex].content.length > 0;
    
    // 根据连接状态和处理情况，给出不同的提示
    // readyState === 0 (CONNECTING): 连接在建立过程中失败 - 通常是后端上游超时
    // readyState === 2 (CLOSED): 连接已关闭 - 可能是正常结束或异常
    if (es.readyState === EventSource.CLOSED) {
      // 连接已关闭
      if (hasReceivedData) {
        // 已收到数据，可能是正常结束或后端上游超时但已返回部分数据
        console.log('SSE 连接已关闭（数据已接收完成）');
      } else {
        // 未收到任何数据，可能是连接失败或后端上游超时
        console.warn('SSE 连接关闭，未收到数据。可能是后端服务连接上游超时，请检查后端日志。');
      }
    } else if (es.readyState === EventSource.CONNECTING) {
      // 连接在建立过程中失败（最常见的情况）
      // 这通常是因为后端上游服务超时（java.net.SocketTimeoutException）
      if (hasReceivedData) {
        // 已收到部分数据，但连接中断
        console.warn('SSE 连接中断（后端上游可能超时），已接收部分数据');
      } else {
        // 未收到任何数据，连接就失败了
        console.error('SSE 连接失败（后端上游可能超时），未收到任何数据。请检查后端服务状态。');
      }
    } else {
      // 其他未知状态
      console.error('SSE 连接出现未知错误，状态:', es.readyState, error);
    }
    
    // 关闭连接并重置加载状态
    closeStream();
  };
}

/**
 * 关闭 SSE 连接
 * 清理资源，重置状态
 */
function closeStream() {
  // 如果连接存在，关闭它
  if (evtSource.value) {
    evtSource.value.close();
    evtSource.value = null;
  }
  // 重置加载状态
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
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  white-space: pre-wrap;
  word-break: break-word;
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



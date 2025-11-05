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
        <!-- 对AI助手的消息使用Markdown渲染，用户消息保持原样 -->
        <div v-if="m.role === 'assistant'" class="markdown-content" v-html="renderMarkdown(m.content)"></div>
        <pre v-else class="text">{{ m.content }}</pre>
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
import { marked } from 'marked';

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
 * Markdown 渲染函数
 * @param text 需要渲染的Markdown文本
 * @returns 渲染后的HTML字符串
 */
function renderMarkdown(text: string): string {
  return  marked.parse(text);
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
  // 从localStorage加载最近的会话
  const sessionList = JSON.parse(localStorage.getItem('chat_sessions') || '[]');
  if (sessionList.length > 0) {
    // 按时间戳排序，获取最新的会话
    sessionList.sort((a: any, b: any) => b.timestamp - a.timestamp);
    if (!loadMessages(sessionList[0].id)) {
      // 如果加载失败，显示欢迎消息
      messages.push({ role: 'assistant', content: '你好，我是 AI 编程小助手。有什么可以帮你？' });
    }
  } else {
    // 没有历史会话，显示欢迎消息
    messages.push({ role: 'assistant', content: '你好，我是 AI 编程小助手。有什么可以帮你？' });
  }
});

/**
 * 生命周期钩子：组件卸载前执行
 */
onUnmounted(() => {
  // 关闭 SSE 连接，释放资源
  closeStream();
  
  // 组件卸载前保存消息
  if (messages.length > 0) {
    saveMessages();
  }
});

/**
 * 监听器：监听 messages 数组的变化
 * 当有新消息时，自动滚动到底部并保存消息
 */
watch(messages, async () => {
  // 等待 Vue 完成 DOM 更新
  await nextTick();
  // 如果有滚动容器引用，滚动到底部
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
  // 自动保存消息到localStorage
  if (messages.length > 0) {
    saveMessages();
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
   * 智能拼接 SSE 数据块
   * 解决数据块在单词边界被切分导致缺少空格的问题
   * 
   * 问题场景：
   * - 英文：后端发送 "! How can" + "I assist you" → 需要添加空格 → "! How can I assist you" ✅
   * - 中文：后端发送 "你好" + "！有什么可以帮助" → 不需要空格 → "你好！有什么可以帮助" ✅
   * - 中英混合：后端发送 "你好" + "hello" → 需要添加空格 → "你好 hello" ✅
   * 
   * 规则：
   * 1. 中文之间不需要空格（中文词语之间本身就没有空格）
   * 2. 英文单词之间需要空格（如果缺失）
   * 3. 中英文混合时，在交界处需要空格
   * 
   * @param currentContent 当前已累积的内容
   * @param newChunk 新收到的数据块
   * @returns 拼接后的内容
   */
  function smartConcat(currentContent: string, newChunk: string): string {
    // 如果当前内容为空，直接返回新块
    if (!currentContent) {
      return newChunk;
    }
    
    // 如果新块为空，直接返回当前内容
    if (!newChunk) {
      return currentContent;
    }
    
    // 如果新块开头已经有空格或标点，直接拼接（不需要额外处理）
    if (/^[\s\.,!?;:，。！？；：]/.test(newChunk)) {
      return currentContent + newChunk;
    }
    
    // 获取当前内容的最后一个字符和新块的第一个字符
    const lastChar = currentContent[currentContent.length - 1];
    const firstChar = newChunk[0];
    
    // 判断字符类型
    const isLastCharChinese = /[\u4e00-\u9fa5]/.test(lastChar);  // 中文字符
    const isFirstCharChinese = /[\u4e00-\u9fa5]/.test(firstChar);
    const isLastCharEnglish = /[a-zA-Z0-9]/.test(lastChar);     // 英文字母、数字
    const isFirstCharEnglish = /[a-zA-Z0-9]/.test(firstChar);
    const lastCharIsSpaceOrPunct = /[\s\.,!?;:，。！？；：\-_]/.test(lastChar);  // 空格、标点、连字符、下划线
    const firstCharIsSpaceOrPunct = /[\s\.,!?;:，。！？；：\-_]/.test(firstChar);
    
    // 如果已经有空格或标点分隔，直接拼接
    if (lastCharIsSpaceOrPunct || firstCharIsSpaceOrPunct) {
      return currentContent + newChunk;
    }
    
    // 情况1：两个都是中文 → 不需要空格
    if (isLastCharChinese && isFirstCharChinese) {
      return currentContent + newChunk;
    }
    
    // 情况2：两个都是英文 → 需要添加空格（英文单词之间需要空格）
    if (isLastCharEnglish && isFirstCharEnglish) {
      return currentContent + ' ' + newChunk;
    }
    
    // 情况3：中英文混合 → 需要添加空格（中英文交界处需要空格）
    if ((isLastCharChinese && isFirstCharEnglish) || (isLastCharEnglish && isFirstCharChinese)) {
      return currentContent + ' ' + newChunk;
    }
    
    // 其他情况（数字、特殊字符等）直接拼接
    return currentContent + newChunk;
  }

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
      // 使用智能拼接函数，自动处理单词边界缺少空格的问题
      // 这样即使后端在单词中间切分数据块，也能正确显示
      messages[messageIndex].content = smartConcat(
        messages[messageIndex].content,
        e.data
      );
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
 * 保存消息到localStorage
 */
function saveMessages() {
  try {
    const chatData = {
      messages: [...messages],
      memoryId: memoryId.value,
      timestamp: Date.now()
    };
    localStorage.setItem(`chat_${memoryId.value}`, JSON.stringify(chatData));
    // 保存会话列表以便切换
    const sessionList = JSON.parse(localStorage.getItem('chat_sessions') || '[]');
    const existingSession = sessionList.find((s: any) => s.id === memoryId.value);
    if (existingSession) {
      existingSession.lastMessage = messages[messages.length - 1]?.content || '';
      existingSession.timestamp = Date.now();
    } else {
      sessionList.push({
        id: memoryId.value,
        lastMessage: messages[messages.length - 1]?.content || '',
        timestamp: Date.now()
      });
    }
    localStorage.setItem('chat_sessions', JSON.stringify(sessionList));
  } catch (error) {
    console.error('保存消息失败:', error);
  }
}

/**
 * 从localStorage加载消息
 */
function loadMessages(sessionId: number) {
  try {
    const chatDataStr = localStorage.getItem(`chat_${sessionId}`);
    if (chatDataStr) {
      const chatData = JSON.parse(chatDataStr);
      // 清空现有消息
      messages.splice(0, messages.length);
      // 添加保存的消息
      chatData.messages.forEach((msg: ChatMessage) => {
        messages.push(msg);
      });
      memoryId.value = chatData.memoryId;
      return true;
    }
    return false;
  } catch (error) {
    console.error('加载消息失败:', error);
    return false;
  }
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
  height: 100%; /* 确保占满可用空间 */
}
.chat-header {
  flex: 0 0 auto;
  padding: 4px 16px; /* 减小内边距 */
  font-size: 12px;
  color: #666;
  border-bottom: 1px dashed #eee;
  height: 32px; /* 设置固定高度 */
  display: flex;
  align-items: center;
}
.chat-messages {
  flex: 1 1 auto;
  overflow: auto;
  padding: 4px 16px; /* 进一步减小内边距 */
  background: #fafafa;
  min-height: 0;
}
.message {
  display: flex;
  margin-bottom: 4px; /* 进一步减小消息间距 */
  min-height: 24px;
}

/* Markdown内容样式 */
.markdown-content {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
  line-height: 1.6;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin-top: 1.2em; /* 减小标题上边距 */
  margin-bottom: 0.4em; /* 减小标题下边距 */
  font-weight: 600;
}

.markdown-content h1 {
  font-size: 1.8em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}

.markdown-content h2 {
  font-size: 1.5em;
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}

.markdown-content h3 {
  font-size: 1.3em;
}

.markdown-content p {
  margin-bottom: 0.8em; /* 减小段落下边距 */
}

.markdown-content code {
  background-color: #f6f8fa;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.9em;
}

.markdown-content pre {
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 1em;
}

.markdown-content pre code {
  background-color: transparent;
  padding: 0;
  font-size: 0.9em;
}

.markdown-content blockquote {
  border-left: 4px solid #dfe2e5;
  padding: 0 1em;
  color: #6a737d;
  margin: 0 0 1em 0;
}

.markdown-content ul,
.markdown-content ol {
  padding-left: 2em;
  margin-bottom: 1em;
}

.markdown-content li {
  margin-bottom: 0.5em;
}

.markdown-content table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
}

.markdown-content table th,
.markdown-content table td {
  border: 1px solid #dfe2e5;
  padding: 6px 13px;
}

.markdown-content table th {
  background-color: #f6f8fa;
  font-weight: 600;
}

.markdown-content a {
  color: #0366d6;
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}
.message.user {
  justify-content: flex-end;
}
.message.assistant {
  justify-content: flex-start;
}
.bubble {
  max-width: 80%; /* 增加最大宽度，减少水平空白 */
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 6px 8px; /* 进一步减小气泡内边距 */
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  min-height: 24px;
  display: flex;
  align-items: center;
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
  gap: 6px; /* 减小间距 */
  padding: 6px 12px; /* 进一步减小内边距 */
  border-top: 1px solid #eee;
  background: #fff;
  height: 48px; /* 设置固定高度 */
  align-items: center;
}
.input {
  flex: 1 1 auto;
  height: 36px; /* 减小高度 */
  padding: 0 10px; /* 减小内边距 */
  border: 1px solid #ddd;
  border-radius: 6px; /* 减小圆角 */
  outline: none;
}
.input:disabled {
  background: #f5f5f5;
}
.send {
  flex: 0 0 auto;
  min-width: 70px; /* 减小宽度 */
  height: 36px; /* 减小高度 */
  padding: 0 10px; /* 减小内边距 */
  border: none;
  border-radius: 6px; /* 减小圆角 */
  background: #1677ff;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px; /* 减小字体 */
}
.send:disabled {
  background: #9ec5ff;
  cursor: not-allowed;
}
</style>



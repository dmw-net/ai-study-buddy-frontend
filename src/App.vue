<!--
  App.vue - 应用根组件
  功能：定义应用的整体布局结构
-->
<template>
  <!-- 主容器：使用 flex 垂直布局，占满整个视口高度 -->
  <main class="app">
    <!-- 应用头部：显示应用标题 -->
    <header class="app-header">AI 编程小助手</header>
    <!-- 聊天组件：核心功能区域 -->
    <Chat />
  </main>
</template>

<script setup lang="ts">
/**
 * 导入聊天组件
 * 这是 Vue 3 的单文件组件导入方式
 */
import Chat from './components/Chat.vue';
</script>

<style scoped>
/**
 * scoped 样式：只作用于当前组件，不会影响其他组件
 * 
 * Flexbox 布局说明：
 * - display: flex 启用弹性布局
 * - flex-direction: column 垂直排列子元素
 * - height: 100vh 占满整个视口高度（vh = viewport height）
 */

/* 主容器样式 */
.app {
  display: flex;              /* 使用 flex 布局 */
  flex-direction: column;      /* 垂直方向排列 */
  height: 100vh;              /* 高度占满视口（100% viewport height） */
}

/* 头部样式 */
.app-header {
  flex: 0 0 auto;             /* 不放大、不缩小，固定高度 */
  height: 56px;               /* 恢复高度 */
  display: flex;              /* 内部使用 flex 布局 */
  align-items: center;        /* 垂直居中对齐 */
  padding: 0 16px;            /* 左右内边距 16px */
  border-bottom: 1px solid #eee;  /* 底部边框 */
  font-weight: 600;           /* 字体加粗 */
}
</style>



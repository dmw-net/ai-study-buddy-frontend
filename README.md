# AI 编程小助手 - 前端项目

## 📋 项目简介

这是一个基于 Vue 3 + TypeScript + Vite 开发的 AI 编程助手前端应用。用户可以通过聊天界面与 AI 进行实时对话，获得编程学习和求职面试相关的帮助。

## 🏗️ 项目结构

```
ai-study-buddy-frontend/
├── index.html              # HTML 入口文件，Vue 应用挂载点
├── package.json            # 项目依赖和脚本配置
├── vite.config.ts          # Vite 构建工具配置文件
├── tsconfig.json           # TypeScript 编译配置
├── node_modules/           # 依赖包目录（自动生成）
├── src/                    # 源代码目录
│   ├── main.ts            # 应用入口文件，创建 Vue 应用实例
│   ├── App.vue            # 根组件，定义应用整体布局
│   ├── styles.css         # 全局样式文件
│   ├── env.d.ts           # TypeScript 类型声明文件
│   └── components/        # 组件目录
│       └── Chat.vue       # 聊天组件（核心功能）
└── README.md              # 项目说明文档（本文件）
```

## 📁 文件说明

### 根目录文件

#### `index.html`
- **作用**：HTML 入口文件
- **功能**：定义页面基本结构，提供 Vue 应用的挂载点（`<div id="app">`）
- **关键点**：`<script type="module" src="/src/main.ts">` 引入应用入口

#### `package.json`
- **作用**：项目配置文件
- **内容**：
  - 项目基本信息（名称、版本）
  - 依赖包（vue、axios）
  - 开发依赖（vite、typescript、vue 插件）
  - 脚本命令（dev、build、preview）

#### `vite.config.ts`
- **作用**：Vite 构建工具配置
- **关键配置**：
  - `plugins: [vue()]` - Vue 插件，处理 .vue 文件
  - `server.port: 5173` - 开发服务器端口
  - `server.proxy` - API 代理配置，解决跨域问题

#### `tsconfig.json`
- **作用**：TypeScript 编译配置
- **功能**：指定编译选项、模块解析方式、包含的文件类型等

### src 目录文件

#### `src/main.ts`
- **作用**：应用入口文件
- **功能**：创建 Vue 应用实例并挂载到 DOM
- **执行流程**：
  1. 导入 Vue 和根组件
  2. 创建应用实例
  3. 挂载到 `#app` 元素

#### `src/App.vue`
- **作用**：根组件
- **功能**：定义应用的整体布局结构
- **结构**：
  - 头部（标题栏）
  - 聊天组件（核心功能区域）

#### `src/components/Chat.vue`
- **作用**：聊天界面核心组件
- **功能**：
  - 显示聊天消息列表
  - 处理用户输入
  - 通过 SSE（Server-Sent Events）接收流式响应
  - 自动滚动到底部
- **核心特性**：
  - 使用 Vue 3 Composition API
  - 实时流式显示 AI 回复
  - 用户消息在右侧，AI 消息在左侧

#### `src/styles.css`
- **作用**：全局样式文件
- **功能**：
  - 重置浏览器默认样式
  - 设置全局字体和颜色
  - 定义基础布局样式

#### `src/env.d.ts`
- **作用**：TypeScript 类型声明文件
- **功能**：为 .vue 文件提供类型定义，让 TypeScript 能够识别 Vue 组件

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 3. 确保后端服务运行

后端服务需要运行在 `http://localhost:8081`，提供 `/api/ai/chat` 接口。

## 🔧 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
  - Composition API（组合式 API）
  - 响应式系统
  - 单文件组件（SFC）

- **TypeScript** - JavaScript 的超集，提供类型检查
  - 类型安全
  - 更好的 IDE 支持
  - 代码提示和自动补全

- **Vite** - 下一代前端构建工具
  - 快速的开发服务器
  - 热模块替换（HMR）
  - 优化的生产构建

- **Axios** - HTTP 客户端库（已安装，当前版本使用原生 EventSource）

## 💡 核心概念

### Vue 3 Composition API

本项目使用 Vue 3 的 Composition API，主要特点：

- **setup 语法糖**：`<script setup>` 让代码更简洁
- **响应式数据**：
  - `ref()` - 用于基本类型
  - `reactive()` - 用于对象和数组
- **生命周期钩子**：
  - `onMounted()` - 组件挂载后执行
  - `onUnmounted()` - 组件卸载前执行
- **计算属性**：`computed()` 创建响应式计算值
- **监听器**：`watch()` 监听数据变化

### SSE（Server-Sent Events）

SSE 是一种服务器向客户端推送数据的技术：

- **优势**：实时性好，实现简单
- **使用场景**：流式文本输出（如 AI 对话）
- **浏览器支持**：原生支持，无需额外库
- **实现方式**：使用 `EventSource` API

### 代理配置

Vite 的代理配置解决了跨域问题：

```
前端请求：http://localhost:5173/api/ai/chat
         ↓ (Vite 代理)
后端接收：http://localhost:8081/api/ai/chat
```

## 📝 代码流程

### 用户发送消息流程

1. **用户输入** → 在输入框输入文本
2. **点击发送** → 触发 `onSend()` 函数
3. **添加用户消息** → 将用户消息添加到消息列表
4. **创建占位消息** → 为 AI 回复创建空消息对象
5. **建立 SSE 连接** → 调用 `openStream()` 建立连接
6. **接收流式数据** → 通过 `onmessage` 事件接收数据片段
7. **实时更新** → 将接收到的数据追加到消息内容
8. **自动滚动** → 监听消息变化，自动滚动到底部
9. **连接关闭** → 收到结束标记或错误时关闭连接

### 数据流

```
用户输入
  ↓
Chat.vue (onSend)
  ↓
openStream() → EventSource
  ↓
后端 API (/api/ai/chat)
  ↓
SSE 流式响应
  ↓
onmessage 事件
  ↓
更新 assistantMsg.content
  ↓
Vue 响应式更新
  ↓
界面自动刷新
```

## 🎨 样式说明

### 布局方式

- **Flexbox 布局**：使用 flex 实现响应式布局
- **垂直布局**：`flex-direction: column`
- **自适应高度**：`flex: 1 1 auto` 让消息区域自动填充剩余空间

### 消息样式

- **用户消息**：右侧对齐，蓝色背景
- **AI 消息**：左侧对齐，白色背景
- **消息气泡**：圆角、阴影、最大宽度限制

## 🔍 常见问题

### 1. 端口被占用

如果 5173 端口被占用，修改 `vite.config.ts` 中的 `port` 配置。

### 2. 跨域问题

确保 `vite.config.ts` 中的代理配置正确，后端地址为 `http://localhost:8081`。

### 3. 后端连接失败

检查：
- 后端服务是否运行
- 后端端口是否为 8081
- 后端接口路径是否为 `/api/ai/chat`

### 4. TypeScript 类型错误

确保已安装所有依赖：
```bash
npm install
```

如果使用 VS Code，建议安装 **Volar** 扩展（Vue 3 官方推荐）。

## 📚 学习资源

- [Vue 3 官方文档](https://cn.vuejs.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/zh/)
- [Vite 官方文档](https://cn.vitejs.dev/)
- [MDN - EventSource API](https://developer.mozilla.org/zh-CN/docs/Web/API/EventSource)

## 📄 许可证

本项目仅供学习使用。

---

**提示**：这是一个学习项目，代码中包含详细注释，适合初学者理解 Vue 3 + TypeScript 开发流程。


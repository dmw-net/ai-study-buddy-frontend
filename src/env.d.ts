/**
 * env.d.ts - TypeScript 类型声明文件
 * 功能：为 TypeScript 提供类型定义，让编辑器能够识别特殊文件类型
 */

/**
 * 引用 Vite 客户端的类型定义
 * 这提供了 Vite 相关功能的类型支持（如 import.meta.env）
 */
/// <reference types="vite/client" />

/**
 * 声明 .vue 文件模块类型
 * 让 TypeScript 知道如何导入 .vue 单文件组件
 * 
 * 作用：
 * 1. 在 TypeScript 文件中导入 .vue 文件时不会报错
 * 2. 提供类型检查和自动补全
 * 
 * 示例：import Component from './Component.vue' 不会报类型错误
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}



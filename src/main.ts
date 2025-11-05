/**
 * main.ts - 应用入口文件
 * 功能：创建 Vue 应用实例并挂载到 DOM
 */

// 从 Vue 导入 createApp 函数（Vue 3 的应用创建方式）
import { createApp } from 'vue';

// 导入根组件
import App from './App.vue';

// 导入全局样式
import './styles.css';

/**
 * 创建 Vue 应用实例
 * createApp(App) 创建一个以 App 为根组件的应用
 * .mount('#app') 将应用挂载到 index.html 中的 <div id="app"> 元素上
 * 
 * 执行流程：
 * 1. 创建应用实例
 * 2. 挂载到 DOM
 * 3. Vue 开始渲染组件树
 */
createApp(App).mount('#app');



# 🧠 Smart Assistant

> **“本地优先”的个人知识管理工具。**  
> 通过实时语音交互和隐私优先的同步功能，重新定义个人知识管理。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg?logo=typescript)
![PWA](https://img.shields.io/badge/PWA-Ready-orange.svg?logo=pwa)
![Vitest](https://img.shields.io/badge/Testing-Vitest-yellow.svg?logo=vitest)
![LocalFirst](https://img.shields.io/badge/Data-Local_First-success.svg)

## 📖 简介

**Smart Assistant** 是一个极简而强大的生产力工具。它帮助您整理思绪、管理任务并可视化创意。

我们严格遵循 **本地优先 (Local-First)** 理念：
*   **您的数据属于您：** 所有数据存储在您的浏览器本地 (IndexedDB)。
*   **无需强制登录：** 无需注册即可立即使用。
*   **隐私同步：** 使用您自己的 **GitHub 私有仓库** 或 **WebDAV** 在设备间同步数据，并受 **AES-256 加密** 保护。

## ✨ 核心功能

### 📱 PWA & 移动体验
*   **安装即用：** 离线访问能力，可作为原生应用安装在手机或桌面。
*   **统一 UI 系统：** 待办事项和笔记采用一致的设计语言，具有卡片式布局、精致的排版和清晰的语义颜色。
*   **移动优先：** 针对移动设备进行了全面优化，支持触摸友好控制、滑动手势和快速访问悬浮操作按钮 (FAB)。

### ⚡ 性能与可靠性
*   **极速加载：** 全面优化 Service Worker 缓存策略，实现真正的离线优先。
*   **毫秒级响应：** 引入 **Zustand** 管理全局状态，彻底消除 Props Drilling，大幅提升重渲染性能。
*   **海量内容承载：** `MemoList` 支持 **延迟加载渲染 (Lazy Rendering)**，即使处理 500+ 组件也能保持 60fps 的滑动体验。
*   **精致动效：** 集成 **Framer Motion**，为视图切换和卡片操作提供电影级的流畅反馈。

### 💾 数据管理
*   **导入与导出：** 完整的 JSON 数据导出/导入功能，便于轻松备份和迁移。
*   **灾难恢复：** “清除所有数据”选项可用于完全重置，确保隐私并解决潜在的状态冲突。

### 🔒 隐私与同步
*   **本地优先架构：** 数据存储在设备的 IndexedDB 中。基本使用无需服务器。
*   **加密云同步：**
    *   **GitHub 仓库同步（推荐）：** 将数据存储在私有 GitHub 仓库中。
    *   **AES-256 加密：** 所有同步到云端的数据都使用用户定义的密码进行加密。即便是云服务提供商也无法读取您的笔记。
    *   **其他提供商：** 支持 WebDAV（如坚果云/Nextcloud）和 Supabase。
*   **冲突解决：** 智能冲突检测，配有专用 UI 来解决设备间的数据差异。
*   **本地快照：** 自动本地备份和历史记录管理，防止数据丢失。

### 📝 高级编辑器
*   **创意白板：** 集成画布用于草绘创意，支持多色笔刷和无限撤销/重做。
*   **丰富语境：** 支持标签、全文搜索、归档和“专注模式”。

## 🛠️ 技术栈

*   **前端：** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **状态管理：** [Zustand](https://zustand-demo.pmnd.rs/) (高性能、轻量级状态中枢)
*   **交互动效：** [Framer Motion](https://www.framer.com/motion/)
*   **样式：** [Tailwind CSS 3](https://tailwindcss.com/)
*   **PWA：** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (高级 Workbox 缓存配置)
*   **存储：** 原生 [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (v4 with Indexes)
*   **加密：** Web Crypto API (AES-GCM 256-bit)

## 🚀 快速开始

### 先决条件
*   Node.js 18+

### 安装

1.  **克隆仓库**
    ```bash
    git clone https://github.com/your-username/smart-assistant.git
    cd smart-assistant
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **本地运行**
    ```bash
    npm run dev
    ```

## 🔄 同步指南

Smart Assistant 允许您在没有中央服务器的情况下跨设备同步数据。

**推荐：GitHub 私有仓库同步**
1.  在 GitHub 上创建一个**新的空私有仓库**（例如 `my-notes-data`）。
2.  生成一个具有 `repo` 权限范围的 **Personal Access Token (Classic)**。
3.  在 Smart Assistant 中，点击 **管理同步 (Manage Sync)** -> **GitHub Repo**。
4.  输入您的 Token、仓库名称 (`username/repo`) 和 **同步密码**。
5.  *注意：您的同步密码用于加密数据。请勿丢失！*

## 🤝 贡献

欢迎贡献！请随意提交 Pull Request。

## 📄 许可证

本项目基于 MIT 许可证开源。

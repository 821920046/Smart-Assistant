# 🧠 Smart Assistant

> **基于 Google Gemini 3 的“本地优先”智能第二大脑。**  
> 通过 AI 原生推理、实时语音交互和隐私优先的同步功能，重新定义个人知识管理。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)
![Gemini](https://img.shields.io/badge/AI-Gemini%203-8E75B2.svg?logo=google)
![LocalFirst](https://img.shields.io/badge/Data-Local_First-success.svg)

## 📖 简介

**Smart Assistant** 是一个为 AI 时代设计的极简而强大的生产力工具。与传统笔记应用不同，它将 **Google Gemini 3** 模型直接集成到您的工作流中，帮助您整理思绪、提取任务并可视化创意。

我们严格遵循 **本地优先 (Local-First)** 理念：
*   **您的数据属于您：** 所有数据存储在您的浏览器本地 (IndexedDB)。
*   **无需强制登录：** 无需注册即可立即使用。
*   **隐私同步：** 使用您自己的 **GitHub 私有仓库** 或 **WebDAV** 在设备间同步数据，并受 **AES-256 加密** 保护。

## ✨ 核心功能

### 🤖 AI 原生工作流
*   **Gemini 3 驱动：** 基于 `gemini-3-flash-preview` 和 `gemini-3-pro-preview`，提供深度推理和上下文理解。
*   **实时语音：** 使用 `gemini-2.5-flash-native-audio` 实现超低延迟语音转录和交互。
*   **智能洞察：** AI 自动分析您的任务，提供每周摘要和生产力洞察。

### 📊 可视化任务管理
*   **交互式看板：** 在列（重要、普通、低）之间拖放任务，具有流畅的动画和类触觉视觉反馈。
*   **统一 UI 系统：** 待办事项和笔记采用一致的设计语言，具有卡片式布局、精致的排版和清晰的语义颜色。
*   **移动优先体验：** 针对移动设备进行了全面优化，支持触摸友好控制、滑动手势和快速访问悬浮操作按钮 (FAB)。

### 📈 智能仪表盘与分析
*   **今日进度：** 可视化仪表盘跟踪您的每日任务完成率，并将实时表现与昨日生产力进行对比。
*   **工作负载压力：** 基于“重要”任务智能评估您当前的工作负载，将状态分类为“一切尽在掌握”、“需要注意”或“高压状态”。
*   **语音笔记中心：** 集中式录音界面，具备快速录音功能和每日语音备忘录统计。

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
*   **智能清单：** 一键将自然语言文本转换为可操作的待办事项列表，并进行优先级分析。
*   **创意白板：** 集成画布用于草绘创意，支持多色笔刷和无限撤销/重做。
*   **丰富语境：** 支持标签、全文搜索、归档和“专注模式”。

## 🛠️ 技术栈

*   **前端：** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **样式：** [Tailwind CSS 3](https://tailwindcss.com/)
*   **AI SDK：** [Google Generative AI SDK](https://www.npmjs.com/package/@google/genai)
*   **存储：** 原生 [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
*   **加密：** Web Crypto API (AES-GCM 256-bit)

## 🚀 快速开始

### 先决条件
*   Node.js 18+
*   Google Gemini API Key（[在此获取](https://aistudio.google.com/)）

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

3.  **配置环境**
    在根目录创建 `.env` 文件：
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```

4.  **本地运行**
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

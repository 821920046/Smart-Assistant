# 🤖 智能助理 (Smart Assistant) v2.5

基于 Google Gemini 3 系列大模型驱动的极简思考空间与智能任务管理中心。本项目通过先进的 AI 技术，将语音、手绘、文字与任务清单深度整合，打造一个真正可跨端同步的“第二大脑”。

## ✨ 核心特性

- **🚀 Gemini 3 驱动**：核心推理与创作采用最新的 `gemini-3-flash-preview` 与 `gemini-3-pro-preview` 模型，逻辑更强，响应更快。
- **🎙️ 实时语音听写**：集成 `gemini-2.5-flash-native-audio` 模型，支持极低延迟的语音转文字，精准捕捉瞬时灵感。
- **📋 智能清单模式**：
  - **专属模式切换**：编辑器新增“清单”按钮，开启后 AI 将强制提取每一项任务。
  - **双重解析机制**：内置本地正则解析（识别 `-`、`*`、`1.` 等符号）作为 AI 提取的实时兜底。
  - **优先级智能分配**：自动根据内容语境判定任务优先级（High/Medium/Low）。
- **🎨 创意绘图白板**：内置高清 Canvas 白板，支持撤销/重做、多色画笔及橡皮擦，手绘作品可在时间轴中完美呈现。
- **🔄 全能同步方案**：内置 `Supabase`、`WebDAV`（如坚果云）、`GitHub Gist` 三大同步驱动，通过 `updatedAt` 时间戳实现多端自动冲突合并。
- **💾 高性能存储**：底层存储由 LocalStorage 升级为 **IndexedDB**，支持海量数据存储，读写更流畅。
- **🔊 自然语音朗读 (TTS)**：支持将记录内容一键转语音播放，采用优质预设音色，优化了对各种符号的处理。
- **📊 智能时空管理**：支持标签分类、全文语义搜索、截止日期设置与实时提醒通知。

## 🛠️ 技术架构

- **UI 框架**: React 19 (Strict Mode)
- **样式引擎**: Tailwind CSS 3
- **AI 引擎**: Google Generative AI SDK (@google/genai)
- **数据持久化**: IndexedDB (Local-First 策略)
- **同步层**: Fetch API + Custom Sync Engines (WebDAV/Supabase/Gist)
- **构建机制**: 原生 ESM 模块化加载 (无需打包工具)

## 🚀 快速开始

### 1. 获取 API Key
访问 [Google AI Studio](https://aistudio.google.com/) 生成你的 API Key。

### 2. 环境变量配置
在部署环境（如 Cloudflare Pages 或本地环境）中设置：
- `API_KEY`: 你的 Google Gemini API Key。

### 3. 配置多端同步 (可选)
点击应用侧边栏的 **[同步配置]**，根据 [SYNC_GUIDE.md](./SYNC_GUIDE.md) 的指引配置你的云端存储方案。

## 📂 目录结构

- `index.html`: 入口文件，包含全局环境变量垫片与 Import Map。
- `App.tsx`: 应用主控逻辑与跨端状态管理。
- `components/`:
  - `MemoEditor.tsx`: 综合编辑器（包含清单模式、语音入口、手绘入口）。
  - `MemoCard.tsx`: 智能渲染卡片（支持进度条、TTS、手绘展示）。
  - `VoiceInterface.tsx`: 实时流式语音处理组件。
  - `Whiteboard.tsx`: 响应式绘图系统。
  - `SyncSettings.tsx`: 同步驱动配置中心。
- `services/`:
  - `storage.ts`: 基于 IndexedDB 的持久化层。
  - `sync.ts`: 跨端同步逻辑实现。
  - `gemini.ts`: AI 能力封装。

## 🔐 隐私说明

- **本地优先**：所有数据首先存储在您的本地浏览器中。
- **加密传输**：同步过程采用标准加密协议，API 调用直接发往 Google 基础设施。
- **无追踪**：本项目不收集任何个人数据。

---
*Inspired by usememos/memos. Re-imagined for the AI Era.*
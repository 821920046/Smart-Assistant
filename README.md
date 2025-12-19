# 🤖 智能助理 (Smart Assistant)

基于 Google Gemini 大模型驱动的极简思考空间与智能任务管理中心。本项目旨在通过 AI 技术简化信息的记录、整理与回顾过程。

## ✨ 核心功能

- **🎙️ 实时语音记事**：集成 Gemini 2.5 Flash Native Audio 模型，支持高精度的实时语音转文字。
- **🎨 创意绘图白板**：**[新功能]** 内置全功能手绘白板，支持多色画笔、笔触粗细调节与橡皮擦。手绘作品可以作为独立记录或图文混排保存，并在时间轴中以精致的画框形式呈现。
- **📝 智能任务提取**：输入一段文字，AI 自动识别并提取待办事项（Todo），并根据语境分配优先级（高/中/低）。
- **✨ 智能润色 (Refine)**：一键优化草稿，修复语法错误，提升表达的专业性。
- **📊 进度可视化**：Memo 卡片顶部配有动态进度条，实时反馈任务完成情况。
- **🔊 强力语音朗读 (TTS)**：**[优化]** 支持将记录内容转换为流畅的自然语言播放。优化了模型指令调用，增强了对短文本及特殊占位符的鲁棒性。
- **📅 智能简报**：根据当前筛选的记录，一键生成结构化的每日总结与重点回顾。
- **🔍 语义化管理**：支持标签分类、全文搜索、截止日期提醒以及卡片归档。

## 🛠️ 技术栈

- **Frontend**: React 19 + Tailwind CSS
- **AI Engine**: [Google Generative AI SDK (@google/genai)](https://ai.google.dev/)
- **Module System**: Native ES6 Modules (via esm.sh)
- **Deployment**: Cloudflare Pages / Static Hosting

## 🚀 快速部署到 Cloudflare Pages

由于本项目采用了无构建步骤的 ESM 架构，部署极其简单：

### 第一步：获取 API Key
1. 前往 [Google AI Studio](https://aistudio.google.com/)。
2. 创建并复制你的 **API Key**。

### 第二步：配置环境变量
1. 部署完成后，进入项目的 **Settings** -> **Environment variables**。
2. **Variable name**: `API_KEY`
3. **Value**: 填入你在第一步中获取的 Google API Key。
4. **重要**：在 "Production" 和 "Preview" 环境下都建议填入并重新部署。

## 📂 项目结构

- `index.html`: 入口文件，包含 Import Map 配置与全局样式。
- `App.tsx`: 核心逻辑、路由管理与页面布局。
- `components/`: 
  - `Whiteboard.tsx`: **[新增]** Canvas 绘图组件，支持高 DPR 渲染。
  - `VoiceInterface.tsx`: 语音转写组件。
  - `MemoEditor.tsx`: 集成文本、语音与绘图的综合编辑器。
  - `MemoCard.tsx`: 交互式记录卡片，支持多媒体渲染。
- `services/`:
  - `gemini.ts`: 封装所有 AI 服务接口（提取任务、建议标签、智能润色、生成总结）。
  - `storage.ts`: 基于 LocalStorage 的离线持久化存储。

## 🔐 隐私与安全说明
- **本地优先**：记录内容默认存储在浏览器的 `localStorage` 中，所有手绘 Base64 数据均保存在本地，不会上传至第三方服务器（除 AI 分析外）。
- **按需调用**：语音数据和文本仅在调用 Gemini API 进行实时转写或内容处理时进行加密传输。
- **环境安全**：API Key 通过注入的环境变量管理，确保在代码库中不留任何敏感信息。

---
*Inspired by usememos/memos. Enhanced with Creative Intelligence & Human-AI Collaboration.*
# 🧠 Smart Assistant

> **“本地优先”的个人知识管理工具。**  
> 通过实时语音交互和隐私优先的同步功能，重新定义个人知识管理。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg?logo=typescript)
![PWA](https://img.shields.io/badge/PWA-Ready-orange.svg?logo=pwa)
![Vitest](https://img.shields.io/badge/Testing-Vitest-yellow.svg?logo=vitest)
![LocalFirst](https://img.shields.io/badge/Data-Local_First-success.svg)
![UI_Optimized](https://img.shields.io/badge/UI-Optimized-green.svg?logo=framer)
![Mobile_First](https://img.shields.io/badge/Mobile_First-blue.svg?logo=android)
![Performance](https://img.shields.io/badge/Performance-60fps-brightgreen.svg?logo=webcomponents)

## 📖 简介

**Smart Assistant** 是一个极简而强大的生产力工具。它帮助您整理思绪、管理任务并可视化创意。

### 🎨 UI 优化亮点
经过全面的 UI/UX 重构，Smart Assistant 现在拥有：
*   **现代化设计系统：** Glass Morphism 视觉风格 + 完整的设计令牌体系
*   **流畅的交互体验：** 60fps Spring 动画 + 手势导航 + 触觉反馈
*   **智能组件库：** 标准化的基础组件 + 虚拟化列表 + GPU 加速
*   **完美的移动适配：** PWA 支持 + 响应式布局 + 离线优先

我们严格遵循 **本地优先 (Local-First)** 理念：
*   **您的数据属于您：** 所有数据存储在您的浏览器本地 (IndexedDB)。
*   **无需强制登录：** 无需注册即可立即使用。
*   **隐私同步：** 使用您自己的 **GitHub 私有仓库** 或 **WebDAV** 在设备间同步数据，并受 **AES-256 加密** 保护。

## ✨ 核心功能

### 🎨 现代化 UI 设计系统
*   **设计令牌：** 完整的 CSS 变量体系，支持亮色/暗色主题，统一的颜色、间距、圆角和阴影系统。
*   **组件库：** 标准化的基础组件库（Button、Card、Input、Badge、Loading、Toast），确保一致的用户体验。
*   **Glass Morphism：** 精致的毛玻璃效果和半透明背景，营造现代感和层次感。
*   **响应式设计：** 移动优先的设计方法，完美适配各种屏幕尺寸。

### 📱 PWA & 移动体验
*   **安装即用：** 离线访问能力，可作为原生应用安装在手机或桌面。
*   **手势导航：** 支持左右滑动切换页面，上下滑动刷新内容，提供直观的移动端交互。
*   **触觉反馈：** 多种振动模式（轻击、中击、重击、成功、错误等），增强用户体验。
*   **触摸优化：** 针对移动设备的触摸目标尺寸、安全区域适配和微交互优化。
*   **动态底部导航：** 带动画指示器的标签栏，支持手势切换和视觉反馈。

### ⚡ 性能与可靠性
*   **极速加载：** 全面优化 Service Worker 缓存策略，实现真正的离线优先。
*   **毫秒级响应：** 引入 **Zustand** 管理全局状态，彻底消除 Props Drilling，大幅提升重渲染性能。
*   **虚拟化渲染：** 支持 **虚拟化列表 (Virtual List)**，即使处理 1000+ 组件也能保持 60fps 的流畅体验。
*   **GPU 加速动画：** 所有动画使用 GPU 加速，配合 will-change 属性优化，确保丝滑的交互体验。
*   **智能预加载：** 智能的组件懒加载和代码分割，减少初始包体积。

### ✨ 丰富的微交互
*   **Spring 动画：** 基于物理的弹性动画，创造自然流畅的运动效果。
*   **渐进式动画：** 卡片、标签、徽章的渐进式出现动画，营造层次感。
*   **悬停效果：** 精心设计的悬停状态，包括渐变叠加、3D 变换和缩放效果。
*   **状态反馈：** 丰富的加载状态（骨架屏、进度条、旋转器）和操作反馈。
*   **过渡动画：** 页面切换、模态框、通知的平滑过渡动画。

### 🎯 智能卡片系统
*   **优先级指示：** 视觉化的重要程度标识（星星评级 + 颜色边线）。
*   **智能布局：** 自适应的卡片布局，紧凑模式和标准模式自动切换。
*   **交互增强：** 支持快速操作、拖拽排序、批量选择的智能卡片。
*   **预览功能：** 内容预览、音频播放、图片展示的一体化卡片设计。
*   **状态管理：** 完善的归档、完成、编辑、删除状态管理。

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

### 核心框架
*   **前端：** [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
*   **状态管理：** [Zustand](https://zustand-demo.pmnd.rs/) (高性能、轻量级状态中枢)
*   **类型系统：** [TypeScript](https://www.typescriptlang.org/) (严格模式)

### UI & 交互
*   **动效库：** [Framer Motion 12](https://www.framer.com/motion/) (高级动画系统)
*   **样式系统：** [Tailwind CSS 3.4](https://tailwindcss.com/) + 自定义设计令牌
*   **组件工具：** [clsx](https://github.com/lukeed/clsx) + [tailwind-merge](https://github.com/dcastil/tailwind-merge)
*   **图标系统：** 自定义 SVG 图标库

### 性能优化
*   **虚拟化：** 自研虚拟化列表组件
*   **代码分割：** React.lazy + 动态导入
*   **构建优化：** Vite 的 Tree Shaking 和压缩
*   **缓存策略：** 高级 Service Worker 配置

### 数据与同步
*   **本地存储：** 原生 [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (v4 with Indexes)
*   **同步服务：** GitHub API / WebDAV / Supabase
*   **加密：** Web Crypto API (AES-GCM 256-bit)
*   **PWA：** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (离线优先)

### 开发工具
*   **测试：** [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)
*   **代码质量：** ESLint + TypeScript 严格模式
*   **构建工具：** Vite 6 (极速构建)

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

**进阶：云端自动提醒（Cloud-side Reminders）**
如果您希望在关闭浏览器后仍能收到微信/邮件提醒，可以部署 Cloudflare Worker 定时任务：
1.  在 Cloudflare 中新建一个 Worker，并将 `functions/cron.ts` 的内容粘贴进去。
2.  在 Cloudflare 设置中添加以下 **Secrets**:
    - `GITHUB_TOKEN`: 您的 GitHub 访问令牌。
    - `GITHUB_REPO`: 您的数据仓库路径（如 `user/repo`）。
    - `ENCRYPTION_PASSWORD`: 您的同步加密密码。
3.  在 Cloudflare 中添加 **Cron Trigger**，设置为 `* * * * *`（每分钟运行一次）。
4.  新建一个名为 `NOTIFIED_CACHE` 的 **KV Namespace** 并关联到 Worker。

## 🤝 贡献

欢迎贡献！请随意提交 Pull Request。

## 🎯 UI/UX 特色

### 🎨 设计亮点
*   **现代视觉语言：** Glass Morphism + 渐变色彩的组合设计
*   **流畅动画：** 60fps 的 Spring 物理动画系统
*   **智能反馈：** 触觉 + 视觉的双重用户反馈
*   **响应式布局：** 完美适配手机、平板、桌面各种设备

### 📱 移动端特性
*   **手势支持：** 滑动导航、长按菜单、拖拽操作
*   **PWA 体验：** 原生应用般的安装和使用体验
*   **离线优先：** 完整的离线功能和数据同步
*   **性能优化：** 虚拟化列表确保大数据集的流畅体验

### ⚡ 性能优化
*   **GPU 加速：** 所有动画和变换使用硬件加速
*   **智能加载：** 懒加载、预加载、代码分割的完美结合
*   **内存管理：** 优化的组件生命周期和内存回收
*   **渲染优化：** 最小化重渲染和智能的 diff 算法

## 🚀 快速开始

### 先决条件
*   Node.js 18+

### 安装

1.  **克隆仓库**
    ```bash
    git clone https://github.com/821920046/Smart-Assistant.git
    cd Smart-Assistant
    ```

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **本地运行**
    ```bash
    npm run dev
    ```

4.  **构建生产版本**
    ```bash
    npm run build
    ```

## 🧪 测试

```bash
# 运行测试
npm run test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监听模式运行测试
npm run test:watch
```

## 📊 性能指标

*   **首次加载:** < 2s
*   **交互响应:** < 100ms
*   **动画帧率:** 60fps
*   **包体积:** 458 kB (gzipped: 140 kB)
*   **内存占用:** < 50MB (正常使用)

## 📄 许可证

本项目基于 MIT 许可证开源。

---

## 🌟 致谢

感谢所有为开源社区做出贡献的开发者们，特别是 React、Framer Motion、Tailwind CSS 等优秀项目的维护者。

**UI 优化完成时间:** 2026-01-27  
**优化类型:** 全面 UI/UX 重构与性能优化

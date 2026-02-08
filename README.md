# 🧠 Smart Assistant

> **The Privacy-First, Local-First Knowledge Management Powerhouse.**  
> Redefining productivity with real-time voice capture, creative sketching, and encrypted cross-device synchronization.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange.svg?logo=pwa)](https://vite-pwa-org.netlify.app/)
[![Mobile_UI](https://img.shields.io/badge/UI-Mobile_Optimized-success.svg?logo=framer)](https://www.framer.com/motion/)
[![Performance](https://img.shields.io/badge/Performance-60fps-brightgreen.svg?logo=webcomponents)](https://vitejs.dev/)

---

## 📖 Overview

**Smart Assistant** is a minimalist yet powerful productivity suite designed to help you organize thoughts, manage tasks, and visualize ideas with zero friction. Built with a **Mobile-First** philosophy and a **Local-First** architecture, it ensures your data remains under your control, accessible anytime, anywhere.

### 🎨 Premium UI/UX Highlights
- **Modern Design System:** Sleek Glass Morphism aesthetics with a comprehensive design token system.
- **Fluid Interactions:** 60fps spring animations, intuitive gesture navigation, and subtle haptic feedback.
- **Mobile Optimized:** Full PWA support, safe-area inset handling, and touch-optimized ergonomics.
- **High Performance:** GPU-accelerated transitions, virtualized lists for large datasets, and millisecond-level state responses.

---

## ✨ Key Features

### 📱 Superior Mobile Experience
- **Gesture Navigation:** Intuitive swipe-to-navigate flows across the entire app.
- **Haptic Feedback:** Professional-grade vibration patterns for selection, success, and error states.
- **Responsive Ergonomics:** Touch-friendly targets, bottom-focused navigation, and adaptive layouts for all screen sizes.
- **Dynamic Indicators:** Animated navigation bar with spring-based tracking for a premium feel.

### 🔒 Privacy & Robust Sync
- **Local-First:** All data lives in your browser's IndexedDB. No mandatory login, no tracking.
- **End-to-End Encryption:** Your data is encrypted with **AES-256 (GCM)** using your private sync password before leaving your device.
- **Flexible Providers:** Sync seamlessly via your private **GitHub Repository** or **WebDAV** (Nutstore, Nextcloud, etc.).
- **Smart Conflict Resolution:** Dedicated UI to resolve version differences between devices, ensuring data integrity.
- **Local Snapshots:** Automatic versioning and disaster recovery options.

### 📝 Creative Productivity
- **Quick Voice Notes:** Instant audio capture with real-time timers and localized storage.
- **Creative Blackboard:** Integrated sketching canvas with multi-color brushes and infinite undo/redo.
- **Markdown Editor:** Advanced text editor with mobile-optimized formatting toolbars.
- **Smart Task Management:** Priority indicators, due-date tracking, and progress visualization.

---

## 🛠️ Technology Stack

### Core Frameworks
- **Frontend:** [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **State Central:** [Zustand](https://zustand-demo.pmnd.rs/) (High-performance, lightweight state management)
- **Type Safety:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)

### UI & Motion
- **Animations:** [Framer Motion 12](https://www.framer.com/motion/) (Physics-based animation system)
- **Styling:** [Tailwind CSS 3.4](https://tailwindcss.com/) + Custom Design Tokens
- **Icons:** Optimized SVG System

### Infrastructure
- **Data:** Native [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (v4 with Indexes)
- **Encryption:** Web Crypto API (AES-GCM 256-bit)
- **PWA:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Offline-First strategy)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+

### Installation

1. **Clone the Project**
   ```bash
   git clone https://github.com/821920046/Smart-Assistant.git
   cd Smart-Assistant
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Development Mode**
   ```bash
   npm run dev
   ```

4. **Production Build**
   ```bash
   npm run build
   ```

---

## 🔄 Sync Configuration Guide

Smart Assistant enables cross-device synchronization without a central server.

**Recommended: GitHub Private Repository**
1. Create a **new empty private repository** on GitHub.
2. Generate a **Personal Access Token (Classic)** with `repo` scope.
3. In Smart Assistant, go to **Settings** -> **Sync Settings**.
4. Select **GitHub Repo** and input your Token, Repository Path (`username/repo`), and **Sync Password**.
5. *Caution: Your Sync Password is the key to your encryption. Never lose it!*

**Alternative: WebDAV Sync**
1. Select **WebDAV** in sync settings.
2. Input your server URL (e.g., `dav.jianguoyun.com/dav/`).
3. Enter your account credentials and save.

---

## 🧪 Testing & Performance

```bash
# Run unit tests
npm run test

# Generate coverage report
npm run test:coverage
```

### Performance Benchmarks
- **First Contentful Paint:** < 1.5s
- **Interaction Response:** < 80ms
- **Animation Stability:** Steady 60fps
- **Payload Size:** ~140 kB (gzip)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Project Maintainer:** 821920046  
**Last Major Update:** Feb 2026  
**Refactoring Type:** Comprehensive UI/UX Overhaul, English Standardization, and Mobile Optimization.

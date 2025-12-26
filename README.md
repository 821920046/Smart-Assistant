# 🧠 Smart Assistant

> **A "Local-First" Intelligent Second Brain powered by Google Gemini 3.**  
> Redefining personal knowledge management with AI-native reasoning, real-time voice interaction, and privacy-focused synchronization.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?logo=react)
![Gemini](https://img.shields.io/badge/AI-Gemini%203-8E75B2.svg?logo=google)
![LocalFirst](https://img.shields.io/badge/Data-Local_First-success.svg)

## 📖 Introduction

**Smart Assistant** is a minimalist yet powerful productivity tool designed for the AI era. Unlike traditional note-taking apps, it integrates **Google Gemini 3** models directly into your workflow to help you organize thoughts, extract tasks, and visualize ideas.

We strictly follow the **Local-First** philosophy:
*   **Your Data is Yours:** All data is stored locally in your browser (IndexedDB).
*   **No Forced Login:** Use the app immediately without registration.
*   **Private Sync:** Sync your data across devices using your own **GitHub Private Repository** or **WebDAV**, protected by **AES-256 encryption**.

## ✨ Key Features

### 🤖 AI-Native Workflow
*   **Gemini 3 Powered:** Built on `gemini-3-flash-preview` and `gemini-3-pro-preview` for deep reasoning and context understanding.
*   **Real-time Voice:** Ultra-low latency voice transcription and interaction using `gemini-2.5-flash-native-audio`.
*   **Smart Insights:** AI automatically analyzes your tasks to provide weekly summaries and productivity insights.

### 📊 Visual Task Management
*   **Interactive Kanban:** Drag-and-drop tasks between columns (Important, Normal, Low) with smooth animations and haptic-like visual feedback.
*   **Unified UI System:** A consistent design language across Todos and Notes, featuring card-style layouts, refined typography, and clear semantic colors.
*   **Mobile-First Experience:** Fully optimized for mobile with touch-friendly controls, swipe gestures, and a quick-access Floating Action Button (FAB).

### 🔒 Privacy & Synchronization
*   **Local-First Architecture:** Data lives in your device's IndexedDB. No server required for basic usage.
*   **Encrypted Cloud Sync:**
    *   **GitHub Repository Sync (Recommended):** Store your data in a private GitHub repo.
    *   **AES-256 Encryption:** All data synced to the cloud is encrypted with a user-defined password. Even the cloud provider cannot read your notes.
    *   **Other Providers:** Supports WebDAV (e.g., Nutstore/Nextcloud) and Supabase.
*   **Conflict Resolution:** Smart conflict detection with a dedicated UI to resolve data differences between devices.
*   **Local Snapshots:** Automatic local backups and history management to prevent data loss.

### 📝 Advanced Editor
*   **Smart Checklists:** One-click conversion of natural language text into actionable to-do lists with priority analysis.
*   **Creative Whiteboard:** Integrated canvas for sketching ideas, supporting multi-color brushes and unlimited undo/redo.
*   **Rich Context:** Support for tagging, full-text search, archiving, and "Focus Mode."

## 🛠️ Tech Stack

*   **Frontend:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Styling:** [Tailwind CSS 3](https://tailwindcss.com/)
*   **AI SDK:** [Google Generative AI SDK](https://www.npmjs.com/package/@google/genai)
*   **Storage:** Native [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
*   **Encryption:** Web Crypto API (AES-GCM 256-bit)

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   A Google Gemini API Key ([Get it here](https://aistudio.google.com/))

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/smart-assistant.git
    cd smart-assistant
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```

## 🔄 Synchronization Guide

Smart Assistant allows you to sync data across devices without a central server.

**Recommended: GitHub Private Repo Sync**
1.  Create a **new empty private repository** on GitHub (e.g., `my-notes-data`).
2.  Generate a **Personal Access Token (Classic)** with `repo` scope.
3.  In Smart Assistant, click **Manage Sync** -> **GitHub Repo**.
4.  Enter your Token, Repo Name (`username/repo`), and a **Sync Password**.
5.  *Note: Your Sync Password is used to encrypt data. Do not lose it!*

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

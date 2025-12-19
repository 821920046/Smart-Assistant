# 🤖 Smart Assistant v2.5

A minimalist intelligent thinking space and smart task management center powered by Google Gemini 3 series models. This project integrates voice, drawing, text, and checklists into a truly cross-platform synchronized "Second Brain."

## ✨ Key Features

- **🚀 Gemini 3 Driven**: Core reasoning and creation powered by the latest `gemini-3-flash-preview` and `gemini-3-pro-preview` models.
- **🎙️ Real-time Voice Transcription**: Powered by `gemini-2.5-flash-native-audio` for ultra-low latency speech-to-text.
- **📋 Intelligent Checklist Mode**:
  - **Dedicated Mode Switch**: New checklist button in the editor forces AI to extract actionable items.
  - **Dual Parsing Mechanism**: Built-in local regex parsing as a fallback for real-time task extraction.
  - **Smart Priority Assignment**: Automatically assigns High/Medium/Low priorities based on content context.
- **🎨 Creative Whiteboard**: Built-in high-definition Canvas with undo/redo, multi-color brushes, and eraser support.
- **🔄 Universal Sync**: Built-in drivers for `Supabase`, `WebDAV` (e.g., Nutstore), and `GitHub Gist` with conflict resolution based on `updatedAt`.
- **💾 High Performance Storage**: Upgraded from LocalStorage to **IndexedDB** for seamless handling of massive data.
- **🔊 Natural TTS**: One-click text-to-speech for all records using high-quality preset voices.
- **📊 Contextual Management**: Supports tag categorization, full-text semantic search, due dates, and real-time reminders.

## 🛠️ Tech Stack

- **UI Framework**: React 19 (Strict Mode)
- **Styling**: Tailwind CSS 3
- **AI Engine**: Google Generative AI SDK (@google/genai)
- **Data Persistence**: IndexedDB (Local-First strategy)
- **Sync Layer**: Fetch API + Custom Sync Engines (WebDAV/Supabase/Gist)
- **Build**: Native ESM Module loading (No-build tooling required)

## 🚀 Quick Start

### 1. Get API Key
Visit [Google AI Studio](https://aistudio.google.com/) to generate your API Key.

### 2. Configure Environment
Set the following in your deployment environment:
- `API_KEY`: Your Google Gemini API Key.

### 3. Setup Sync (Optional)
Click **[Sync Settings]** in the sidebar and follow the [SYNC_GUIDE.md](./SYNC_GUIDE.md) to configure your cloud storage.

## 📂 Directory Structure

- `index.html`: Entry point with global process shims and Import Map.
- `App.tsx`: Main application logic and cross-platform state management.
- `components/`:
  - `MemoEditor.tsx`: Integrated editor (Checklist, Voice, Drawing).
  - `MemoCard.tsx`: Intelligent rendering card.
  - `VoiceInterface.tsx`: Real-time streaming voice processor.
  - `Whiteboard.tsx`: Responsive drawing system.
  - `SyncSettings.tsx`: Configuration center for sync drivers.
- `services/`:
  - `storage.ts`: Persistence layer via IndexedDB.
  - `sync.ts`: Implementation of cross-platform synchronization.
  - `gemini.ts`: AI capability encapsulation.

## 🔐 Privacy

- **Local First**: All data is primarily stored in your local browser.
- **Encrypted Transfer**: Sync processes use standard encryption; API calls go directly to Google.
- **No Tracking**: This project does not collect any personal data.

---
*Inspired by usememos/memos. Re-imagined for the AI Era.*
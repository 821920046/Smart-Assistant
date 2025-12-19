# 📂 多端同步方案配置指南 (Multi-Device Sync Guide)

本应用支持三种同步方案，旨在帮助你在不同设备（手机、平板、电脑）之间保持数据一致。所有同步逻辑均采用 **本地优先 (Local-first)** 策略，即便在断网状态下也能正常记录，并在恢复连接后自动合并。

---

## 1. 🚀 Supabase 方案 (专业级推荐)
**特点**：响应速度快，支持完整的数据库管理，适合长期稳定使用。

### 部署步骤：
1. **注册并创建项目**：
   - 访问 [Supabase.com](https://supabase.com/) 并注册。
   - 点击 `New Project`，填写项目名称和数据库密码。
2. **初始化数据库表**：
   - 在左侧菜单进入 `SQL Editor`。
   - 点击 `New query`，复制并运行以下 SQL 语句：
     ```sql
     create table memos (
       id text primary key,
       content text not null,
       type text default 'memo',
       tags text[] default '{}',
       "createdAt" int8 not null,
       "updatedAt" int8 not null,
       "isDeleted" boolean default false,
       "isFavorite" boolean default false,
       "isArchived" boolean default false,
       "sketchData" text,
       "dueDate" int8,
       "reminderAt" int8,
       "todos" jsonb default '[]'
     );
     ```
3. **获取 API 凭证**：
   - 进入 `Project Settings` -> `API`。
   - 找到 `Project URL` (以 `https://...` 开头)。
   - 找到 `Project API keys` 中的 `anon` (public) 密钥。

### 应用配置：
- 在本应用侧边栏点击 **[同步配置]** -> 选择 **Supabase**。
- 填入上述 `URL` 和 `Key`，保存即可。

---

## 2. ☁️ WebDAV 方案 (私密性最高)
**特点**：利用你现有的网盘（如坚果云、Nextcloud），数据完全由你自己掌控。

### 配置步骤 (以坚果云为例)：
1. **获取应用密码**：
   - 登录 [坚果云官网](https://www.jianguoyun.com/)。
   - 点击右上角头像 -> `账户信息` -> `安全设置`。
   - 找到 `第三方应用管理`，点击 `添加应用密码`。
   - 生成后，你会得到一个 **应用密码**。
2. **确认 WebDAV 地址**：
   - 坚果云的标准地址通常是：`https://dav.jianguoyun.com/dav/`。

### 应用配置：
- 在本应用侧边栏点击 **[同步配置]** -> 选择 **WebDAV**。
- **URL**: `https://dav.jianguoyun.com/dav/`
- **用户名**: 你的网盘登录邮箱。
- **密码**: 刚才生成的 **应用密码** (不是登录密码)。
- **效果**：你的网盘根目录下会自动生成一个 `memo_ai_sync.json` 文件。

---

## 3. 🐱 GitHub Gist 方案 (极简轻量)
**特点**：利用 GitHub 的代码片段功能存储数据，无需数据库，适合开发者。

### 配置步骤：
1. **生成 Personal Access Token**：
   - 访问 [GitHub Settings -> Tokens (Classic)](https://github.com/settings/tokens)。
   - 点击 `Generate new token (classic)`。
   - **Note**: 随便填（例如 "MemoSync"）。
   - **Scopes**: 必须勾选 `gist`。
   - 生成后，**立即复制并保存这个 Token**（它只会出现一次）。
2. **获取 Gist ID** (可选)：
   - 如果你留空，应用会在第一次同步时自动为你创建一个私有 Gist。

### 应用配置：
- 在本应用侧边栏点击 **[同步配置]** -> 选择 **Gist**。
- **Token**: 粘贴你生成的 GitHub Token。
- **Gist ID**: 首次使用请留空。

---

## 💡 同步机制说明
- **冲突合并**：基于 `updatedAt` 时间戳。多端修改同一条记录时，保留最后一次修改的内容。
- **删除逻辑**：采用“软删除”标记。在一台设备删除后，该标记会同步到云端，进而通知其他设备隐藏该内容。
- **自动同步**：应用启动时、添加新记录后、修改记录后，都会自动触发后台异步同步过程。

---
*如在配置过程中遇到权限错误（403/401），请检查你的 API Key 权限或防火墙设置。*
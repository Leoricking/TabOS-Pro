# 🚀 Opera Tabs Manager

[**繁體中文**](#-繁體中文) | [**English**](#-english)

---

## 🇹🇼 繁體中文

> **輕量化 Opera 擴充功能** —— 一鍵將瀏覽器分頁備份為具備搜尋、追蹤與自動分類功能的結構化 HTML 頁面。

### ✨ 核心特色
* **📑 智能備份**：將當前所有分頁儲存為可管理的 HTML 檔案，一鍵將分頁轉成「可搜尋、可分類、可追蹤」的 HTML 知識庫。。
* **🔄 強大相容性**：支援將舊版 `tabs_backup.html` 或已轉換過的檔案重新導入並升級。
* **🧠 自動分類**：AI、YouTube、購物、工作、社交、地圖導航及其他類別自動歸檔。
* **🧹 網址淨化**：自動移除重複 URL 並剔除追蹤參數（如 `utm_*`, `fbclid`, `gclid` 等）。
* **✅ 狀態追蹤**：支援標記「已讀/未讀」、移除項目，並可一鍵隱藏已讀內容。
* **🔍 快速檢索**：可透過標題、網址或群組名稱進行即時搜尋。
* 

Before
<img width="2036" height="112" alt="image" src="https://github.com/user-attachments/assets/1a4a8844-3926-480c-bd6e-99274e2fb5c7" />

After
<img width="2063" height="1242" alt="image" src="https://github.com/user-attachments/assets/23727844-2ecc-4df7-a997-7434d4a4f623" />

# 🚀 TabOS: Engineering Personal OS
> 不只是分頁管理，而是工程師的「全時導航系統」。整合行程、任務、知識分頁與指令日誌。

## 🧠 核心定位：個人知識操作系統
TabOS 將你的工作流自動化。它不再只是單純的 `Tabs Manager`，而是透過 **Calendar (時間軸)**、**Tasks (任務系統)**、**Tabs (知識儲存)** 與 **Worklog (執行紀錄)** 四位一體的整合，打造真正屬於工程師的開發 OS。

---

## 📅 1. 全域行事曆與規劃 (Calendar & Planner)
透過視覺化視圖掌控過去與未來。
*   **多維視圖**：支援 **日 (Day)**、**月 (Month)**、**年 (Year 🚀)** 快速切換。
*   **活動標記**：自動偵測 `localStorage` 數據，在有紀錄的日期標記「活動點」，方便回溯。
*   **今日重點 (Focus Top 3)**：強迫排除雜訊，每天只鎖定三個最重要的 P1 核心任務。

## 🕒 2. 專業行程管理 (Schedule)
基於時間軸的任務調度系統。
*   **區段規劃**：支援任務設定 `Start / End Time`。
*   **分類標記**：區分 `HPC Debug`、`RDMA Test`、`Learning` 等不同領域。
*   **視覺化時間軸**：直觀顯示今日開發時間分配。

## 📋 3. 產品級任務系統 (Tasks)
深度整合開發環境的 To-Do 系統。
*   **完整狀態流**：`Todo` → `Doing` → `Done` 追蹤。
*   **優先級矩陣**：`P1 (Critical)` / `P2 (High)` / `P3 (Normal)`。
*   **豐富元數據**：每個任務可掛載 `Tags`、多組 `URLs`、以及詳細的 `Implementation Notes`。

## 🔗 4. 深度自動化整合 (The "OS" Integration)
這就是 TabOS 強大的核心：
*   **Tabs → 任務**：分頁一鍵轉化為任務。當你打開 6 個 ChatGPT 分頁研究 AI 時，點擊按鈕即可將其打包成「AI Research」任務。
*   **Worklog → 任務**：自動解析 `worklog.txt`。當日誌出現 `TODO:` 關鍵字時，一鍵同步至任務清單。
*   **Tabs 狀態關聯**：任務啟動時，自動呼叫關聯的分頁組；任務完成後，分頁自動標記為「已讀」。

<img width="2165" height="1858" alt="6  Tabs Manager Pro Planner" src="https://github.com/user-attachments/assets/2398ab26-6a66-4161-84f9-8bef1b64172e" />

<img width="2198" height="1803" alt="7  daily plan" src="https://github.com/user-attachments/assets/327b945d-f7e6-4b18-beb0-a1d06b8f6ac9" />

---

## 🏗️ 技術架構
*   **Frontend**: 純原生 HTML5 / CSS3 (Grid & Flex) / Vanilla JS。
*   **Data Strategy**: `localStorage` 離線優先，支援 `HTML/JSON` 雙向匯入匯出。
*   **Parser**: Python 驅動的指令解析引擎 (Worklog Parser)。

## 🛠️ 安裝與開發
1. 載入 `manifest.json` 至 Chrome 擴充功能。
2. 點擊 `popup.html` 開啟主控台。
3. 執行 `run_worklog.bat` 同步本地開發指令紀錄。

---

### 📂 專案結構 Project Structure
```text
Tabs-manager-Pro/
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.js
│   ├── merge_engine.js
│   ├── template_manager.js
│   └── planner/
│       ├── planner.html
│       ├── planner.css
│       └── planner.js
├── tools/
│   ├── worklog_parser.py
│   └── html_generator.py
│
├── output/
├── demo/
├── icons/
│
├── run_worklog.bat
├── README.md
└── How to use.txt
```

🇺🇸 English
Lightweight Opera Extension — Backup browser tabs into a manageable HTML page with advanced search, tracking, and auto-categorization.

✨ Key Features
📑 Smart Backup: Export all current tabs into a structured, manageable HTML file.

🔄 Legacy Support: Convert old tabs_backup.html or previously managed files into the latest format.

🧠 Auto Categorization: Automatically groups tabs into categories: AI, YouTube, Shopping, Work, Social, etc.

🧹 URL Cleaning: Removes duplicate URLs and strips common tracking parameters (e.g., utm_*, fbclid, gclid, si).

✅ Status Tracking: Mark items as Read/Unread, remove unwanted links, and filter for unread items.

🔍 Efficient Search: Instant filtering by title, URL, or group name.

- Backup all current browser tabs into a managed HTML file
- Import old `tabs_backup.html`
- Import existing managed HTML
- Merge existing managed HTML with currently opened browser tabs
- Auto deduplicate URLs
- Remove common tracking parameters
- Auto categorize tabs:
  - AI
  - YouTube
  - Shopping
  - Work
  - Social
  - Maps / Navigation
  - Other
- Preserve read / unread state
- Mark each link as:
  - 待看
  - 重要
  - 工作
  - 深度閱讀
- Set priority:
  - P1
  - P2
  - P3
- Add custom tags
- Search by title, URL, category, status, priority, or tag
- Filter by category
- Show filtered statistics
- Batch group actions:
  - Mark all as read
  - Mark all as unread
  - Open unread links in group
  - Delete read links in group
- Export cleaned managed HTML
- Compact horizontal UI for better readability

### Worklog Manager

Convert `工作日誌.txt` or `command.txt` into a clean searchable HTML knowledge base.

Features:

- Date timeline
- Date sorting:
  - Newest first
  - Oldest first
- Search
- Category filtering
- Command highlighting
- TODO extraction
- IP highlighting
- Statistics
- Edit log item content
- Edit date
- Edit category
- Toggle command / TODO
- Export modified HTML

---

## Supported Browsers

Supported:

- Opera
- Google Chrome
- Microsoft Edge
- Brave
- Vivaldi

Not guaranteed:

- Firefox
- Safari

Reason: this project uses Chromium Extension Manifest V3 APIs.

---

🧪 使用方式

1️⃣ 安裝外掛
開啟 Opera 擴充功能頁面，開啟「開發者模式」。
點擊「載入解壓縮擴充功能」，選取 opera_tab_saver 資料夾。
extension/

opera://extensions
chrome://extensions
edge://extensions

2️⃣ 備份分頁
點擊工具列圖示，按下備份按鈕取得 HTML 檔案。

3️⃣ 合併分頁（推薦流程）
選舊 HTML → 合併目前分頁

4️⃣ 管理 HTML
將產出的 HTML 丟入瀏覽器，即可進行搜尋、分類與讀取追蹤。

搜尋
標記已讀
分類
刪除
匯出
5️⃣ Worklog
run_worklog.bat
或：
python tools\worklog_parser.py 工作日誌.txt output\worklog.html

🧠 推薦使用流程

每天：開分頁/備份/合併/清理/匯出

👉 永遠只有一份乾淨知識庫

❗ 注意
狀態存在 localStorage
清除瀏覽器資料會消失
記得匯出保存

👨‍💻 適合族群
工程師

HPC / Server / Network

AI 使用者

重度分頁使用者

Built with by Rossi Huang

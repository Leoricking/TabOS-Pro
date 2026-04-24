# 🚀 Opera Tabs Manager

[**繁體中文**](#-繁體中文) | [**English**](#-english)

---

## 🇹🇼 繁體中文

> **輕量化 Opera 擴充功能** —— 一鍵將瀏覽器分頁備份為具備搜尋、追蹤與自動分類功能的結構化 HTML 頁面。

### ✨ 核心特色
* **📑 智能備份**：將當前所有分頁儲存為可管理的 HTML 檔案。
* **🔄 強大相容性**：支援將舊版 `tabs_backup.html` 或已轉換過的檔案重新導入並升級。
* **🧠 自動分類**：AI、YouTube、購物、工作、社交、地圖導航及其他類別自動歸檔。
* **🧹 網址淨化**：自動移除重複 URL 並剔除追蹤參數（如 `utm_*`, `fbclid`, `gclid` 等）。
* **✅ 狀態追蹤**：支援標記「已讀/未讀」、移除項目，並可一鍵隱藏已讀內容。
* **🔍 快速檢索**：可透過標題、網址或群組名稱進行即時搜尋。

### 📂 專案結構
```text
opera_tab_saver/
├── manifest.json         # 擴充功能配置
├── background.js         # 背景邏輯
├── popup.html/js         # 擴充功能介面與控制
├── tabs_manager_importer.html # 核心導入與管理介面
├── template_manager.js    # 數據處理與模板邏輯
└── styles.css            # 介面樣式
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

📂 Project Structure
```
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

Detected categories include:

- BIOS
- BMC
- RDMA
- Liqid
- Network
- Storage
- GPU
- Project
- Travel / Expense
- Command
- General

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

## Project Structure

```text
opera-tabs-manager/
├── .gitignore
├── README.md
├── How to use.txt
├── run_worklog.bat
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   ├── merge_engine.js
│   └── template_manager.js
├── tools/
│   ├── worklog_parser.py
│   └── html_generator.py
├── demo/
├── icons/
└── output/
```

🧪 如何使用 / How to Use
載入擴充功能 / Load Extension:

開啟 Opera 擴充功能頁面，開啟「開發者模式」。

點擊「載入解壓縮擴充功能」，選取 opera_tab_saver 資料夾。

備份分頁 / Backup:

點擊工具列圖示，按下備份按鈕取得 HTML 檔案。

管理內容 / Management:

將產出的 HTML 丟入瀏覽器，即可進行搜尋、分類與讀取追蹤。

Built with by Rossi Huang

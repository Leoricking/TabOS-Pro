# 🚀 Tabs Manager Pro / TabOS

[繁體中文](#-繁體中文) | [English](#-english)

---

## 🇹🇼 繁體中文

> **Tabs Manager Pro / TabOS** 不只是瀏覽器分頁備份工具，而是工程師的個人工作系統。  
> 它把 **Tabs、Planner、Weekly Review、Worklog、Trading、Sync、Auto Backup、Curated Capture** 整合成一套可長期維護的個人知識與任務 OS。

---

## 目錄

- [核心定位](#-核心定位)
- [目前功能總覽](#-目前功能總覽)
- [三層資料架構](#-三層資料架構)
- [安裝方式](#-安裝方式)
- [更新新版後必做](#-更新新版後必做)
- [詳細操作步驟](#-詳細操作步驟)
- [永久保險策略](#-永久保險策略)
- [Daily Planner](#-daily-planner)
- [Weekly Review](#-weekly-review)
- [Trading Mode](#-trading-mode)
- [Sync Center](#-sync-center)
- [Worklog Manager](#-worklog-manager)
- [專案結構](#-專案結構)
- [常見問題](#-常見問題)
- [Git Commit 範例](#-git-commit-範例)
- [English](#-english)

---

## 🧠 核心定位

Tabs Manager Pro 的最終定位是：

```text
把瀏覽器分頁，變成你的工作系統。
```

也就是：

```text
Tabs + Planner + Weekly Review + Worklog + Trading + Sync + Backup
= Engineering Personal OS
```

它解決的不是單純「分頁太多」而已，而是：

- 800～1000 個分頁如何不消失
- 臨時研究資料如何變成長期知識
- 每日任務如何跟分頁、工作日誌、交易紀錄整合
- 重開機、當機、換電腦時資料如何救回
- 重要分頁如何從「數位廢料」變成「精選知識卡片」

---

## ✨ 目前功能總覽

### 1. Tabs Manager

- 備份目前所有一般網頁分頁為 managed HTML
- 舊版 `tabs_backup.html` 轉新版 managed HTML
- 舊 managed HTML + 目前所有分頁合併
- 單筆加入 HTML
- 手動輸入 URL / title 加入 HTML
- 自動分類
- 自動去重
- 清除追蹤參數，例如 `utm_*`、`fbclid`、`gclid`、`si`
- 已看 / 未看
- 狀態：待看、重要、工作、深度閱讀
- 優先級：P1 / P2 / P3
- tags
- 搜尋
- 分類篩選
- 群組批次操作
- 匯出整理後 HTML

### 2. Auto Backup / Restart Recovery

- 背景自動保存目前所有一般網頁分頁
- 每分鐘定時快照
- 分頁新增、關閉、更新、移動時自動 debounce 備份
- 儲存到 `chrome.storage.local`
- 保留最近多份歷史快照
- 可匯出最後自動備份 HTML
- 可重新開啟最後自動備份分頁
- 可把最後自動備份合併進舊 managed HTML

### 3. Curated Tabs / 右鍵精選待看

- 網頁右鍵加入 TabOS 精選待看
- 支援選取文字自動帶入 note
- 支援右鍵連結加入
- 自動帶入 title / URL
- 可設定 priority：P1 / P2 / P3
- 可設定 status：待看 / 重要 / 工作 / 深度閱讀
- 可輸入 tags
- 可輸入 note
- 儲存到 `chrome.storage.local`
- 可匯出精選 HTML
- 可合併進舊 managed HTML
- 可同步到 Sync Center
- 可被 Weekly Review 統計

### 4. Daily Planner

- 今日重點 Top 3
- 今日行程
- 待辦事項
- Todo / Doing / Done
- P1 / P2 / P3
- 日期切換
- 月份 / 年份快速切換
- 從 Tabs HTML 匯入
- 從 Worklog HTML 匯入
- Tabs 轉任務
- Worklog / TODO 轉任務
- 匯出 Planner HTML / JSON
- localStorage + `chrome.storage.local` 雙寫備份

### 5. Weekly Review

- 讀取 Planner / Trading / Tabs / Worklog / Curated / Auto Backup 資料
- 產生本週復盤
- 統計完成任務、未完成 P1、Doing 任務
- 統計分頁分類
- 統計 Worklog 關鍵字
- 統計 Trading 訊號
- 統計 Curated Tabs 精選項目
- 產生 TabOS Clean Score
- 產生下週 Top 3
- 匯出 weekly review HTML
- localStorage + `chrome.storage.local` 雙寫備份

### 6. Trading Mode

- 台股自選股
- 當沖 / 短線 / 中線 / 長線策略
- 支撐、壓力、買區、停損、停利
- EV、Score、Win Rate、Profit Factor、Sharpe、Max Drawdown、Similarity、Confidence
- AI Decision Assistant
- P1 / P2 / P3 說明
- 轉 Planner 任務
- 匯出 / 匯入 Trading JSON
- Python Engine API Sync
- localStorage + `chrome.storage.local` 雙寫備份

### 7. Sync Center

- 手動匯出全部資料 JSON
- 手動匯入全部資料 JSON
- GitHub Gist 遠端同步
- 同步 Planner / Weekly Review / Trading / Tabs / Auto Session / Curated
- 匯出所有 `tabs_manager_pro_*` 的 `chrome.storage.local` key
- GitHub Token 僅存在本機，不應提交到 GitHub

---

## 🧱 三層資料架構

TabOS 的資料分成三層。

### A. Emergency Backup / 救援層

用途：防止重開機、當機、瀏覽器 crash、Windows 更新後分頁消失。

```text
資料來源：目前所有一般網頁分頁
儲存位置：chrome.storage.local
輸出方式：匯出最後自動備份 HTML / 重新開啟最後備份分頁
```

適合：

- 還沒整理完的分頁
- 臨時研究視窗
- 大量分頁清理前的保命快照

### B. Managed Tabs / 整理層

用途：把大量分頁整理成可搜尋、可分類、可追蹤的 managed HTML。

```text
資料來源：目前所有分頁 / 舊 HTML / Auto Backup / 單筆 URL
輸出方式：managed HTML
```

適合：

- 800～1000 個分頁大掃除
- 舊 HTML 與目前分頁合併
- 長期可讀的知識庫檔案

### C. Curated Tabs / 精選層

用途：長期知識管理，把真正重要的網頁變成精選卡片。

```text
資料來源：右鍵加入 / 選取文字加入 / Popup 目前頁加入
儲存位置：chrome.storage.local
輸出方式：精選 HTML / Sync JSON
```

適合：

- 技術文件
- 專案規格
- 會議資料
- 待深入閱讀文章
- 下週要處理的 P1 資料

---

## 🛠 安裝方式

### Opera

```text
1. 開啟 opera://extensions
2. 開啟「開發者模式」
3. 點「載入解壓縮擴充功能」
4. 選擇本專案的 extension/ 資料夾
5. 確認 Tabs Manager Pro 出現在擴充功能列表
```

### Chrome

```text
1. 開啟 chrome://extensions
2. 開啟 Developer mode
3. 點 Load unpacked
4. 選擇 extension/ 資料夾
```

### Edge

```text
1. 開啟 edge://extensions
2. 開啟開發人員模式
3. 載入解壓縮
4. 選擇 extension/ 資料夾
```

---

## 🔄 更新新版後必做

每次覆蓋新版檔案後：

```text
1. 到瀏覽器 extensions 頁面
2. 找到 Tabs Manager Pro
3. 按「重新載入」
4. 打開 Popup
5. 確認 0. 自動備份 / 重開機救援 狀態為已啟用
6. 在一般網頁按右鍵，確認有「加入 TabOS 精選待看」
```

如果剛新增 `manifest.json` 權限，例如 `storage`、`alarms`、`contextMenus`，一定要重新載入 extension。

---

## 📘 詳細操作步驟

### 0. 自動備份 / 重開機救援

用途：防止還沒手動匯出的分頁因重開機、當機、瀏覽器 crash 而消失。

操作：

```text
1. 打開 Tabs Manager Pro Popup
2. 查看「0. 自動備份 / 重開機救援」
3. 確認狀態：已啟用
4. 查看最後備份時間、分頁數、視窗數、保留歷史
5. 整理大量分頁前，先按「立即更新自動備份」
6. 再按「匯出最後自動備份 HTML」留實體檔案
```

原因說明：

```text
installed  = extension 安裝或重新載入後觸發
periodic   = 定時自動備份
manual     = 手動立即更新
curated_saved = 精選儲存後觸發
```

### 0-1. 永久保險 JSON

用途：備份所有 TabOS 重要資料，防止換電腦、重灌、extension ID 改變、localStorage 讀不到。

備份：

```text
1. 打開 Popup
2. 找到「0-1. 永久保險 JSON」
3. 點「一鍵永久備份 JSON」
4. 存到 D:\TabOS_Backup\日期\
```

還原：

```text
1. 打開 Popup
2. 在「從永久備份 JSON 還原」選擇備份 JSON
3. 點還原
4. 重新開啟 Planner / Weekly / Trading / Sync 頁面確認資料
```

建議檔名：

```text
tabos_full_backup_2026-05-14_before_cleanup.json
tabos_full_backup_2026-05-14_after_cleanup.json
```

### 1. 備份目前所有分頁

用途：把目前開著的所有一般網頁分頁匯出為 managed HTML。

操作：

```text
1. 打開 Popup
2. 點「備份目前所有分頁」
3. 下載產生的 HTML
4. 用瀏覽器打開 HTML，即可搜尋、分類、標記已讀、修改狀態
```

選項：

```text
備份後關閉目前一般網頁分頁
```

建議在你已經確認 HTML 成功下載後再勾選。

### 2. 合併舊 HTML + 目前所有分頁

用途：把舊的 managed HTML 跟目前開著的所有一般分頁合併。

操作：

```text
1. 打開 Popup
2. 在「合併舊 HTML + 目前所有分頁」選擇舊 managed HTML
3. 點「合併目前所有分頁並匯出新版 HTML」
4. 下載新版 HTML
```

注意：這是「目前所有分頁」，不是單筆。

### 3. 單筆加入 HTML

用途：只加入目前這一頁，或手動輸入一筆 URL。

#### 3-1. 目前這一頁

```text
1. 切到你要加入的網頁
2. 打開 Popup
3. 點「只備份目前這一頁」
```

加入舊 HTML：

```text
1. 選擇舊 managed HTML
2. 點「把目前這一頁加入舊 HTML 並匯出新版」
```

#### 3-2. 手動輸入單筆

```text
1. 輸入 URL
2. 輸入標題
3. 選 priority：P1 / P2 / P3
4. 選 status：待看 / 重要 / 工作 / 深度閱讀
5. 輸入 tags
6. 點「手動單筆匯出新 HTML」或「手動單筆加入舊 HTML」
```

### 4. TabOS 精選層 / 右鍵加入待看

用途：把重要資料變成長期知識卡片。

右鍵加入：

```text
1. 打開任意一般網頁
2. 在頁面空白處按右鍵
3. 點「加入 TabOS 精選待看」
4. 小視窗會自動帶入 title / URL
5. 選 P1 / P2 / P3
6. 選 status
7. 輸入 tags / note
8. 點儲存
```

選取文字加入 note：

```text
1. 在文章中選取一段重點文字
2. 對選取文字按右鍵
3. 點「加入 TabOS 精選待看」
4. 選取文字會自動填入 note
```

右鍵連結加入：

```text
1. 對網頁中的連結按右鍵
2. 點「加入 TabOS 精選待看」
3. URL 會優先使用該連結
```

Popup 操作：

```text
- 把目前這一頁加入 TabOS 精選
- 匯出 TabOS 精選 HTML
- 把 TabOS 精選加入舊 HTML 並匯出新版
- 清空 TabOS 精選
```

### 5. 舊版轉新版

用途：把早期 `tabs_backup.html` 轉成新 managed HTML。

```text
1. 選擇舊 tabs_backup.html
2. 點「轉成新版可管理 HTML」
3. 下載新版 HTML
```

---

## 📅 Daily Planner

開啟方式：

```text
Popup → Daily Planner
```

功能：

- 今日 Top 3
- 今日行程
- 任務 Todo / Doing / Done
- P1 / P2 / P3
- 日期切換
- 月份 / 年份切換
- 從 Tabs HTML 匯入
- 從 Worklog HTML 匯入
- 匯出 Planner HTML / JSON

資料保護：

```text
localStorage + chrome.storage.local 雙寫
```

如果 localStorage 讀不到，會嘗試從 `chrome.storage.local` 補回。

---

## 📊 Weekly Review

開啟方式：

```text
Popup → Weekly Review
或
Planner → 每週復盤 Weekly Review
```

功能：

- 統計本週完成任務
- 統計未完成 P1
- 統計 Doing 任務
- 統計 Tabs 分類
- 統計 Worklog 關鍵字
- 統計 Trading 訊號
- 統計 Curated Tabs
- 產生 TabOS Clean Score
- 產生下週 Top 3
- 匯出 weekly review HTML

資料保護：

```text
localStorage + chrome.storage.local 雙寫
```

---

## 📈 Trading Mode

開啟方式：

```text
Popup → Trading Mode
```

功能：

- 台股自選股
- 當沖 / 短線 / 中線 / 長線策略
- 支撐、壓力、買區、停損、停利
- EV、Score、Win Rate、Profit Factor、Sharpe、Max Drawdown、Similarity、Confidence
- Python Engine API Sync
- 轉 Planner 任務
- 匯出 / 匯入 Trading JSON

Python Engine 預設 endpoint：

```text
http://127.0.0.1:8787
```

支援：

```text
/health
/signals
/signal/{symbol}
```

資料保護：

```text
localStorage + chrome.storage.local 雙寫
```

免責：Trading Mode 僅供研究與紀錄，不構成投資建議。

---

## ☁ Sync Center

開啟方式：

```text
Popup → Sync Center
```

功能：

- 匯出全部資料 JSON
- 匯入全部資料 JSON
- GitHub Gist 遠端同步
- 只同步 Planner
- 只同步 Weekly Review
- 只同步 Trading
- 只同步 Tabs
- 只同步 Auto Session
- 只同步 Curated Tabs

安全注意：

```text
GitHub Token 只存在本機 localStorage
不要 commit 到 GitHub
永久備份 JSON 不應包含 GitHub Token
```

---

## 🧾 Worklog Manager

用途：把 `工作日誌.txt` 或 `command.txt` 轉成可搜尋、可分類、可編輯的 HTML。

執行：

```powershell
run_worklog.bat
```

或：

```powershell
python tools\worklog_parser.py 工作日誌.txt output\worklog.html
```

功能：

- 日期 timeline
- 搜尋
- 分類
- command 高亮
- TODO 抽取
- IP highlight
- 可編輯
- 匯出修改後 HTML
- 自動分類：BIOS、BMC、RDMA、Liqid、Network、Storage、GPU、Project、Travel / Expense、Command、General

---

## 🛡 永久保險策略

一句話：

```text
自動備份是防重開機；
HTML 匯出是防 extension 資料消失；
JSON / Gist 是防換電腦與重灌。
```

### 每日安全 SOP

每日開始工作：

```text
1. 打開 Popup
2. 確認 Auto Backup 狀態為已啟用
3. 確認最後備份時間是今天
```

整理大量分頁前：

```text
1. 立即更新自動備份
2. 匯出最後自動備份 HTML
3. 一鍵永久備份 JSON
```

整理完成後：

```text
1. 備份目前所有分頁成 managed HTML
2. 匯出 TabOS 精選 HTML
3. 再做一次一鍵永久備份 JSON
4. 需要跨電腦時，再用 Sync Center / GitHub Gist
```

建議資料夾：

```text
D:\TabOS_Backup\2026-05-14\
├── tabs_auto_session_2026-05-14_1053.html
├── tabs_managed_2026-05-14.html
├── tabs_curated_2026-05-14.html
├── tabos_full_backup_2026-05-14_before_cleanup.json
└── tabos_full_backup_2026-05-14_after_cleanup.json
```

---

## 📂 專案結構

```text
Tabs-Manager-Pro/
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.css
│   ├── popup.js
│   ├── merge_engine.js
│   ├── template_manager.js
│   │
│   ├── focus_add/
│   │   ├── focus_add.html
│   │   ├── focus_add.css
│   │   └── focus_add.js
│   │
│   ├── planner/
│   │   ├── planner.html
│   │   ├── planner.css
│   │   └── planner.js
│   │
│   ├── weekly_review/
│   │   ├── weekly_review.html
│   │   ├── weekly_review.css
│   │   └── weekly_review.js
│   │
│   ├── trading/
│   │   ├── trading.html
│   │   ├── trading.css
│   │   └── trading.js
│   │
│   └── sync/
│       ├── sync.html
│       ├── sync.css
│       └── sync.js
│
├── tools/
│   ├── worklog_parser.py
│   └── html_generator.py
│
├── output/
├── demo/
├── icons/
├── run_worklog.bat
├── README.md
├── How to use.txt
└── .gitignore
```

---

## ❓ 常見問題

### Q1. Planner / Weekly / Trading 為什麼重開機後資料消失？

正常重開機不應該消失。常見原因：

```text
1. extension 載入路徑改變
2. extension ID 改變
3. 移除 extension 後重新載入
4. 清除瀏覽器資料
5. 使用不同瀏覽器 profile
6. localStorage 綁定來源不同
```

目前新版已加入：

```text
localStorage + chrome.storage.local 雙寫
```

並提供永久備份 JSON 還原。

### Q2. Auto Backup 是不是永久保存？

不是。Auto Backup 是救援層，存在 `chrome.storage.local`。如果移除 extension 或清瀏覽器資料，仍可能消失。

永久保險要搭配：

```text
1. 匯出 HTML
2. 一鍵永久備份 JSON
3. Sync Center / Gist
```

### Q3. 右鍵選單沒出現怎麼辦？

```text
1. 到 extension 管理頁重新載入
2. 確認 manifest.json 有 contextMenus 權限
3. 在一般 http/https 網頁上測試
4. 不要在 chrome://、opera://、extension 內部頁面測試
```

### Q4. 800～1000 個分頁怎麼整理最安全？

```text
1. 立即更新自動備份
2. 匯出最後自動備份 HTML
3. 一鍵永久備份 JSON
4. 備份目前所有分頁
5. 再開始合併、分類、清理、關閉分頁
```

### Q5. HTML 和 JSON 差在哪？

```text
HTML：人可以直接打開看，適合長期閱讀與整理
JSON：完整資料備份，適合還原、換電腦、同步
```

### Q6. GitHub Token 會不會被備份？

永久備份與 commit 都不應包含 GitHub Token。Token 只應存在本機，不應上傳 GitHub。

---

## 🧪 Git Commit 範例

```powershell
cd D:\code\Claude\Tabs-Manager-Pro

git status

git add README.md

git commit -m "docs: optimize README for TabOS storage hardening" -m "Update README with optimized Tabs Manager Pro / TabOS documentation.

Changes:
- Reorganize README around TabOS positioning.
- Document Emergency Backup, Managed Tabs and Curated Tabs architecture.
- Add detailed installation and update steps.
- Add detailed workflows for Auto Backup, permanent JSON backup, single HTML, right-click curated capture, Planner, Weekly Review, Trading, Sync and Worklog.
- Add daily safety SOP and troubleshooting notes.
- Update project structure for focus_add and weekly_review modules.

Safety:
- Documentation only.
- No runtime code changes."

git status

git push
```

---

## 🇺🇸 English

> **Tabs Manager Pro / TabOS** is not just a browser tab backup tool. It is an engineering personal OS that connects browser tabs, daily planning, weekly review, worklogs, trading notes, sync, auto backup, and curated knowledge capture.

### Core Idea

```text
Turn browser tabs into your personal work system.
```

### Main Features

- Backup all current browser tabs into a managed HTML file
- Merge old managed HTML with all current browser tabs
- Convert legacy `tabs_backup.html` into the latest managed format
- Add a single active tab into HTML
- Manually add a single URL and title
- Auto categorize tabs
- Deduplicate URLs and remove tracking parameters
- Track read / unread status
- Mark items as 待看 / 重要 / 工作 / 深度閱讀
- Set priority: P1 / P2 / P3
- Add tags
- Search and filter managed tabs
- Export cleaned managed HTML
- Background auto session backup
- Restart recovery
- Right-click curated tab capture
- Daily Planner
- Weekly Review
- Trading Mode
- Sync Center
- Worklog Manager

### Three-Layer Architecture

```text
Emergency Backup
- Saves current normal browser tabs into chrome.storage.local
- Used for crash, reboot and browser session recovery

Managed Tabs
- Exports structured, searchable and categorized HTML
- Used for bulk cleanup and long-term readable knowledge base

Curated Tabs
- Saves important pages as curated knowledge cards
- Supports priority, status, tags and notes
```

### Installation

Opera:

```text
1. Open opera://extensions
2. Enable Developer Mode
3. Click Load unpacked
4. Select the extension/ folder
```

Chrome:

```text
1. Open chrome://extensions
2. Enable Developer mode
3. Click Load unpacked
4. Select the extension/ folder
```

Edge:

```text
1. Open edge://extensions
2. Enable Developer mode
3. Load unpacked
4. Select the extension/ folder
```

### Permanent Safety Strategy

```text
Auto Backup protects against reboot.
HTML export protects against extension storage loss.
JSON / Gist protects against migration, reinstall and profile loss.
```

Recommended daily flow:

```text
1. Check Auto Backup status.
2. Export latest auto backup HTML before cleaning many tabs.
3. Run one-click permanent JSON backup.
4. Export managed HTML after cleanup.
5. Export curated tabs HTML.
6. Use Sync Center or GitHub Gist for cross-device backup.
```

### Supported Browsers

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

### Disclaimer

Trading Mode is for research and record-keeping only. It is not investment advice. Broker API keys should not be stored in the extension frontend.

---

Built by Rossi Huang.

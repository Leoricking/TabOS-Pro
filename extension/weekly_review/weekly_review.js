const REVIEW_STORAGE_KEY = "tabs_manager_pro_weekly_review_v1";
const PLANNER_KEY = "tabs_manager_pro_planner_v2";
const TRADING_KEYS = [
  "tabs_manager_pro_trading_v3",
  "tabs_manager_pro_trading_v2",
  "tabs_manager_pro_trading_v1"
];
const CURATED_TABS_KEY = "tabs_manager_pro_curated_tabs_v1";

let currentWeekStart = getWeekStartString(new Date());
let currentReport = null;
let savedReviews = loadSavedReviews();
let curatedTabsCache = [];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getLocalDateString(date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateString) {
  const parts = String(dateString || "").split("-").map(Number);
  if (!parts[0] || !parts[1] || !parts[2]) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function shiftDateString(dateString, days) {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

function getWeekStartString(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return getLocalDateString(d);
}

function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, index) => shiftDateString(weekStart, index));
}

function safeJsonParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getChromeStorage(keys) {
  return new Promise(resolve => {
    if (!chrome.storage || !chrome.storage.local) {
      resolve({});
      return;
    }
    chrome.storage.local.get(keys, resolve);
  });
}

async function loadCuratedTabs() {
  const data = await getChromeStorage([CURATED_TABS_KEY]);
  curatedTabsCache = Array.isArray(data[CURATED_TABS_KEY]) ? data[CURATED_TABS_KEY] : [];
  return curatedTabsCache;
}

function loadSavedReviews() {
  return safeJsonParse(localStorage.getItem(REVIEW_STORAGE_KEY), {});
}

function chromeStorageGet(keys) {
  return new Promise(resolve => {
    if (!chrome.storage || !chrome.storage.local) {
      resolve({});
      return;
    }
    chrome.storage.local.get(keys, resolve);
  });
}

function chromeStorageSet(values) {
  return new Promise(resolve => {
    if (!chrome.storage || !chrome.storage.local) {
      resolve();
      return;
    }
    chrome.storage.local.set(values, resolve);
  });
}

function saveSavedReviews() {
  const serialized = JSON.stringify(savedReviews);
  localStorage.setItem(REVIEW_STORAGE_KEY, serialized);
  chromeStorageSet({
    [REVIEW_STORAGE_KEY]: serialized,
    [REVIEW_STORAGE_KEY + "__json"]: savedReviews,
    [REVIEW_STORAGE_KEY + "__mirrored_at"]: new Date().toISOString()
  }).catch(error => console.warn("Weekly Review chrome.storage mirror failed", error));
}

async function hydrateWeeklyReviewFromChromeStorage() {
  try {
    const localRaw = localStorage.getItem(REVIEW_STORAGE_KEY);
    if (localRaw && localRaw !== "{}") {
      await chromeStorageSet({
        [REVIEW_STORAGE_KEY]: localRaw,
        [REVIEW_STORAGE_KEY + "__json"]: savedReviews,
        [REVIEW_STORAGE_KEY + "__mirrored_at"]: new Date().toISOString()
      });
      return;
    }

    const data = await chromeStorageGet([REVIEW_STORAGE_KEY, REVIEW_STORAGE_KEY + "__json"]);
    const raw = data[REVIEW_STORAGE_KEY];
    const obj = data[REVIEW_STORAGE_KEY + "__json"];

    if (raw) {
      savedReviews = JSON.parse(raw);
      localStorage.setItem(REVIEW_STORAGE_KEY, raw);
      render();
      return;
    }

    if (obj && typeof obj === "object") {
      savedReviews = obj;
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(savedReviews));
      render();
    }
  } catch (error) {
    console.warn("Weekly Review chrome.storage hydrate failed", error);
  }
}


async function hydrateReadableAppDataFromChromeStorage() {
  try {
    const keys = [
      PLANNER_KEY,
      REVIEW_STORAGE_KEY,
      ...TRADING_KEYS
    ];
    const data = await chromeStorageGet(keys);

    for (const key of keys) {
      if (localStorage.getItem(key)) continue;
      if (data[key] !== undefined && data[key] !== null) {
        localStorage.setItem(key, typeof data[key] === "string" ? data[key] : JSON.stringify(data[key]));
      }
    }
  } catch (error) {
    console.warn("Weekly Review app data hydrate failed", error);
  }
}

function loadPlanner() {
  return safeJsonParse(localStorage.getItem(PLANNER_KEY), {});
}

function loadTrading() {
  for (const key of TRADING_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const parsed = safeJsonParse(raw, []);
    if (Array.isArray(parsed)) {
      return { key, stocks: parsed };
    }
  }

  return { key: "", stocks: [] };
}

function getAllLocalStorageKeys() {
  return Object.keys(localStorage).sort();
}

function detectTabsKeys() {
  return getAllLocalStorageKeys().filter(key =>
    key.startsWith("tabs_manager_pro_tabs") ||
    key.startsWith("tabs_manager_pro_merged") ||
    key.startsWith("tabs_manager_pro_converted")
  );
}

function detectWorklogKeys() {
  return getAllLocalStorageKeys().filter(key =>
    key.startsWith("tabs_manager_worklog") ||
    key.includes("worklog")
  );
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function collectWeekPlanner(planner, dates) {
  const tasks = [];
  const focus = [];
  const schedules = [];
  const tabs = [];
  const worklogs = [];
  const notes = [];

  for (const date of dates) {
    const day = planner[date] || {};

    normalizeArray(day.tasks).forEach(item => tasks.push({ ...item, date }));
    normalizeArray(day.focus).forEach(item => focus.push({ ...item, date }));
    normalizeArray(day.schedules).forEach(item => schedules.push({ ...item, date }));
    normalizeArray(day.tabs).forEach(item => tabs.push({ ...item, date, source: "planner" }));
    normalizeArray(day.worklogs).forEach(item => worklogs.push({ ...item, date, source: "planner" }));

    if (String(day.notes || "").trim()) {
      notes.push({ date, text: day.notes });
    }
  }

  return { tasks, focus, schedules, tabs, worklogs, notes };
}

function extractTabsFromStorage() {
  const result = [];
  const keys = detectTabsKeys();

  for (const key of keys) {
    const value = safeJsonParse(localStorage.getItem(key), null);
    const groups = Array.isArray(value) ? value : [];

    for (const group of groups) {
      const category = group.category || group.name || group.title || "未分類";
      const items = normalizeArray(group.items);

      for (const item of items) {
        result.push({
          key,
          category,
          title: item.title || item.name || item.url || "未命名分頁",
          url: item.url || "",
          status: item.status || "",
          priority: item.priority || "",
          tags: normalizeArray(item.tags)
        });
      }
    }
  }

  return result;
}

function extractWorklogsFromStorage() {
  const result = [];
  const keys = detectWorklogKeys();

  for (const key of keys) {
    const value = safeJsonParse(localStorage.getItem(key), null);
    const groups = Array.isArray(value) ? value : [];

    for (const group of groups) {
      const entries = normalizeArray(group.entries || group.items || group.logs);
      for (const entry of entries) {
        result.push({
          key,
          date: entry.date || group.date || "",
          category: entry.category || group.category || "Worklog",
          text: entry.text || entry.content || entry.title || entry.command || ""
        });
      }
    }
  }

  return result;
}

function extractCuratedTabsFromStorage() {
  return normalizeArray(curatedTabsCache).map(item => ({
    id: item.id || "",
    title: item.title || item.url || "未命名精選",
    url: item.url || "",
    priority: item.priority || "P3",
    status: item.status || "待看",
    tags: normalizeArray(item.tags),
    note: item.note || item.selectionText || "",
    createdAt: item.createdAt || "",
    source: item.source || "CURATED"
  }));
}

function isDateInWeek(isoText, weekStart, weekEnd) {
  if (!isoText) return false;
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return false;
  const local = getLocalDateString(date);
  return local >= weekStart && local <= weekEnd;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function calculateStrategyScore(stock) {
  if (Number.isFinite(Number(stock.score))) return Number(stock.score);
  if (Number.isFinite(Number(stock.strategyScore))) return Number(stock.strategyScore);
  if (Number.isFinite(Number(stock.backtest?.score))) return Number(stock.backtest.score);

  let score = 50;
  const ev = toNumber(stock.backtest?.ev ?? stock.ev);
  const winRate = toNumber(stock.backtest?.winRate ?? stock.winRate);
  const pf = toNumber(stock.backtest?.profitFactor ?? stock.profitFactor);

  if (ev > 0) score += 10;
  if (winRate >= 55) score += 10;
  if (pf >= 1.5) score += 10;
  if ((stock.priority || "") === "P1") score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateEV(stock) {
  if (Number.isFinite(Number(stock.ev))) return Number(stock.ev);
  if (Number.isFinite(Number(stock.backtest?.ev))) return Number(stock.backtest.ev);

  const winRate = toNumber(stock.backtest?.winRate ?? stock.winRate) / 100;
  const avgWin = toNumber(stock.backtest?.avgWin ?? stock.avgWin);
  const avgLoss = Math.abs(toNumber(stock.backtest?.avgLoss ?? stock.avgLoss));

  if (winRate > 0 && (avgWin > 0 || avgLoss > 0)) {
    return winRate * avgWin - (1 - winRate) * avgLoss;
  }

  return 0;
}

function getStockText(stock) {
  return [
    stock.symbol,
    stock.name,
    stock.priority,
    stock.mainRating,
    stock.decision?.action,
    stock.decision?.summary,
    stock.decision?.backendSignalMessage,
    stock.decision?.stopLoss,
    stock.decision?.buyZone,
    stock.dayTrade?.conclusion,
    stock.shortTerm?.conclusion,
    stock.midTerm?.conclusion,
    stock.longTerm?.conclusion
  ].filter(Boolean).join(" ");
}

function extractTradingSignals(stocks) {
  return normalizeArray(stocks).map(stock => {
    const ev = calculateEV(stock);
    const score = calculateStrategyScore(stock);
    const text = getStockText(stock);
    const riskWords = /(停損|失效|跌破|轉弱|風險|avoid|no[- ]?chase|不可進場)/i;
    const buyWords = /(買區|低接|進入買區|turn strong|轉強|突破)/i;
    const risk = riskWords.test(text);
    const buy = buyWords.test(text) || (ev > 0 && score >= 70);

    return {
      symbol: stock.symbol || "",
      name: stock.name || "",
      priority: stock.priority || "P2",
      action: stock.decision?.action || "觀察",
      ev,
      score,
      buy,
      risk,
      message: stock.decision?.backendSignalMessage || stock.decision?.summary || text || ""
    };
  });
}

function buildKeywordMap(textList) {
  const allow = [
    "BIOS", "BMC", "RDMA", "Liqid", "Network", "Storage", "GPU", "Project",
    "Travel", "Expense", "Command", "Trading", "Planner", "Tabs", "Sync",
    "Python", "JavaScript", "PowerShell", "Git", "API", "Bug", "Debug",
    "TODO", "P1", "P2", "P3", "IOWN", "SONiC", "OWS", "AI"
  ];

  const map = new Map();
  const joined = textList.join("\n");

  for (const word of allow) {
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const matches = joined.match(re);
    if (matches) map.set(word, matches.length);
  }

  const chineseWords = joined.match(/[\u4e00-\u9fa5]{2,8}/g) || [];
  const stop = new Set(["今日", "本週", "任務", "工作", "完成", "未完成", "分類", "匯入", "匯出", "新增", "編輯", "備註"]);

  for (const word of chineseWords) {
    if (stop.has(word)) continue;
    map.set(word, (map.get(word) || 0) + 1);
  }

  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([word, count]) => ({ word, count }));
}

function countBy(items, getter) {
  const map = new Map();
  for (const item of items) {
    const key = getter(item) || "未分類";
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function calculateCleanScore({ tabs, plannerWeek, unfinishedP1, curatedTabs }) {
  let score = 100;
  const totalTabs = tabs.length + plannerWeek.tabs.length;
  const noCategoryTabs = tabs.filter(t => !t.category || t.category === "未分類").length;
  const unreadTabs = tabs.filter(t => /未看|todo|待看/i.test(t.status || "")).length;
  const p1Penalty = Math.min(25, unfinishedP1.length * 5);
  const volumePenalty = totalTabs > 120 ? 25 : totalTabs > 80 ? 15 : totalTabs > 50 ? 8 : 0;
  const uncategorizedPenalty = Math.min(20, noCategoryTabs * 2);
  const unreadPenalty = Math.min(15, unreadTabs);
  const curatedP1Penalty = Math.min(10, normalizeArray(curatedTabs).filter(item => item.priority === "P1" && item.status !== "已完成").length * 2);

  score -= p1Penalty + volumePenalty + uncategorizedPenalty + unreadPenalty + curatedP1Penalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function buildNextTop3(report) {
  const manual = getManualTop3();
  if (manual.length > 0) return manual.slice(0, 3);

  const suggestions = [];
  const p1 = report.unfinishedP1.slice(0, 3);

  for (const item of p1) {
    suggestions.push(`完成 P1：${item.title || "未命名任務"}`);
  }

  const topCurated = report.curatedThisWeek.find(item => item.priority === "P1") || report.curatedThisWeek.find(item => item.status === "深度閱讀");
  if (topCurated) {
    suggestions.push(`深度閱讀精選：${topCurated.title || "未命名精選"}`);
  }

  const riskTrading = report.tradingSignals.find(x => x.risk);
  if (riskTrading) {
    suggestions.push(`檢查 Trading 風險：${riskTrading.name || riskTrading.symbol || "未命名股票"}`);
  }

  const goodTrading = report.tradingSignals.find(x => x.buy && !x.risk);
  if (goodTrading) {
    suggestions.push(`追蹤偏強訊號：${goodTrading.name || goodTrading.symbol || "未命名股票"}`);
  }

  if (report.tabs.length + report.plannerWeek.tabs.length > 80) {
    suggestions.push("清理 Tabs：把分頁降到 80 以下，保留 P1 / 深度閱讀 / 工作必要項目");
  }

  const topKeyword = report.keywords[0];
  if (topKeyword) {
    suggestions.push(`延續本週主軸：${topKeyword.word}`);
  }

  suggestions.push("安排 1 個 Deep Work Session：一次只處理一個 P1 任務");
  suggestions.push("每日收盤 / 下班前 10 分鐘更新 Planner 狀態");

  return [...new Set(suggestions)].slice(0, 3);
}

function getManualTop3() {
  const input = document.getElementById("manualTop3Input");
  if (!input) return [];
  return input.value
    .split("\n")
    .map(line => line.replace(/^\s*\d+[.)、-]?\s*/, "").trim())
    .filter(Boolean);
}

function generateReport() {
  const weekStart = currentWeekStart;
  const dates = getWeekDates(weekStart);
  const weekEnd = dates[6];
  const planner = loadPlanner();
  const plannerWeek = collectWeekPlanner(planner, dates);
  const tabs = extractTabsFromStorage();
  const storageWorklogs = extractWorklogsFromStorage();
  const worklogs = [...plannerWeek.worklogs, ...storageWorklogs];
  const trading = loadTrading();
  const tradingSignals = extractTradingSignals(trading.stocks);
  const curatedTabs = extractCuratedTabsFromStorage();
  const curatedThisWeek = curatedTabs.filter(item => isDateInWeek(item.createdAt, weekStart, weekEnd));

  const completedTasks = plannerWeek.tasks.filter(task => task.status === "done");
  const unfinishedTasks = plannerWeek.tasks.filter(task => task.status !== "done");
  const unfinishedP1 = unfinishedTasks.filter(task => task.priority === "P1");
  const doingTasks = plannerWeek.tasks.filter(task => task.status === "doing");

  const textList = [
    ...plannerWeek.tasks.map(x => `${x.title || ""} ${x.category || ""} ${normalizeArray(x.tags).join(" ")} ${x.note || ""}`),
    ...plannerWeek.focus.map(x => `${x.title || x.text || ""}`),
    ...worklogs.map(x => `${x.category || ""} ${x.text || x.title || x.content || ""}`),
    ...plannerWeek.notes.map(x => x.text || ""),
    ...tradingSignals.map(x => `${x.symbol} ${x.name} ${x.message}`),
    ...curatedTabs.map(x => `${x.title || ""} ${x.priority || ""} ${x.status || ""} ${normalizeArray(x.tags).join(" ")} ${x.note || ""}`)
  ];

  const keywords = buildKeywordMap(textList);
  const tabCategories = countBy([...tabs, ...plannerWeek.tabs], item => item.category || item.group || "未分類");
  const curatedByStatus = countBy(curatedTabs, item => item.status || "待看");
  const cleanScore = calculateCleanScore({ tabs, plannerWeek, unfinishedP1, curatedTabs });

  const report = {
    weekStart,
    weekEnd,
    dates,
    plannerWeek,
    tabs,
    worklogs,
    tradingKey: trading.key,
    tradingSignals,
    curatedTabs,
    curatedThisWeek,
    curatedByStatus,
    completedTasks,
    unfinishedTasks,
    unfinishedP1,
    doingTasks,
    keywords,
    tabCategories,
    cleanScore,
    detectedKeys: {
      planner: localStorage.getItem(PLANNER_KEY) ? [PLANNER_KEY] : [],
      weeklyReview: localStorage.getItem(REVIEW_STORAGE_KEY) ? [REVIEW_STORAGE_KEY] : [],
      trading: trading.key ? [trading.key] : [],
      tabs: detectTabsKeys(),
      curated: curatedTabs.length ? [CURATED_TABS_KEY] : [],
      worklog: detectWorklogKeys()
    }
  };

  report.nextTop3 = buildNextTop3(report);
  currentReport = report;
  return report;
}

function renderMetric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderList(containerId, items, renderer, emptyText) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!items.length) {
    el.innerHTML = `<div class="empty">${escapeHtml(emptyText)}</div>`;
    return;
  }

  el.innerHTML = items.map(renderer).join("");
}

function renderReport(report) {
  document.getElementById("weekTitle").textContent = `本週復盤：${report.weekStart} ~ ${report.weekEnd}`;
  document.getElementById("weekRangeText").textContent = `週一到週日，共 ${report.dates.length} 天`;
  document.getElementById("cleanScore").textContent = String(report.cleanScore);

  const badge = document.getElementById("dataHealthBadge");
  const hasData = report.plannerWeek.tasks.length || report.tabs.length || report.worklogs.length || report.tradingSignals.length || report.curatedTabs.length;
  badge.textContent = hasData ? "已讀取本機資料" : "目前沒有偵測到資料";
  badge.className = `badge ${hasData ? "good" : "warn"}`;

  document.getElementById("overviewGrid").innerHTML = [
    renderMetric("完成任務", report.completedTasks.length),
    renderMetric("未完成 P1", report.unfinishedP1.length),
    renderMetric("進行中", report.doingTasks.length),
    renderMetric("本週行程", report.plannerWeek.schedules.length),
    renderMetric("Planner Tabs", report.plannerWeek.tabs.length),
    renderMetric("Managed Tabs", report.tabs.length),
    renderMetric("精選卡片", report.curatedTabs.length),
    renderMetric("本週精選", report.curatedThisWeek.length),
    renderMetric("Worklog", report.worklogs.length),
    renderMetric("Trading", report.tradingSignals.length)
  ].join("");

  renderList("completedTasks", report.completedTasks.slice(0, 20), task => `
    <div class="item">
      <div class="item-title">${escapeHtml(task.title)}</div>
      <div class="item-meta">${escapeHtml(task.date)} · ${escapeHtml(task.priority || "")} · ${escapeHtml(task.category || "未分類")}</div>
    </div>
  `, "本週尚未有完成任務。建議回 Planner 把已完成項目切成 Done，復盤才會更準。");

  renderList("unfinishedP1", report.unfinishedP1.slice(0, 20), task => `
    <div class="item">
      <div class="item-title">${escapeHtml(task.title)}</div>
      <div class="item-meta">${escapeHtml(task.date)} · ${escapeHtml(task.status || "todo")} · ${escapeHtml(task.category || "未分類")}</div>
    </div>
  `, "本週沒有未完成 P1，狀態很好。可以挑一個 Deep Work 主題作為下週 Top 3。");

  const tabRows = report.tabCategories.slice(0, 12).map(([name, count]) => `
    <div class="item">
      <div class="item-title">${escapeHtml(name)}</div>
      <div class="item-meta">${count} 個分頁</div>
    </div>
  `);
  document.getElementById("tabsSummary").innerHTML = tabRows.length ? tabRows.join("") : `<div class="empty">尚未偵測到 Tabs 管理頁 localStorage。若 managed HTML 是 file:// 開啟，該頁的 localStorage 不一定會出現在 extension 內。</div>`;

  renderList("curatedSummary", report.curatedTabs.slice(0, 20), item => `
    <div class="item">
      <div class="item-title">${escapeHtml(item.title)}</div>
      <div class="item-meta">${escapeHtml(item.priority)} · ${escapeHtml(item.status)} · ${escapeHtml(normalizeArray(item.tags).join(", "))}</div>
      <div class="item-meta">${escapeHtml(item.note || "").slice(0, 180)}</div>
    </div>
  `, "尚未有 TabOS 精選資料。可在網頁右鍵選「加入 TabOS 精選待看」。");

  document.getElementById("worklogKeywords").innerHTML = report.keywords.length
    ? report.keywords.map(k => `<span class="keyword">${escapeHtml(k.word)} <small>${k.count}</small></span>`).join("")
    : `<div class="empty">本週尚未有足夠 Worklog / Notes 關鍵字。</div>`;

  renderList("tradingSignals", report.tradingSignals.slice(0, 30), sig => {
    const state = sig.risk ? "風險 / 停損" : sig.buy ? "偏強 / 可追蹤" : "觀察";
    return `
      <div class="item">
        <div class="item-title">${escapeHtml(sig.name || sig.symbol || "未命名股票")} · ${escapeHtml(state)}</div>
        <div class="item-meta">${escapeHtml(sig.symbol)} · ${escapeHtml(sig.priority)} · EV ${sig.ev.toFixed(2)} · Score ${sig.score}</div>
        <div class="item-meta">${escapeHtml(sig.message).slice(0, 220)}</div>
      </div>
    `;
  }, "尚未偵測到 Trading localStorage。若有使用 Trading Mode，請確認資料已儲存。 ");

  document.getElementById("nextTop3").innerHTML = report.nextTop3.map((text, index) => `
    <div class="top-card">
      <strong>Top ${index + 1}</strong>
      <div>${escapeHtml(text)}</div>
    </div>
  `).join("");

  document.getElementById("rawDataSummary").textContent = JSON.stringify({
    week: `${report.weekStart} ~ ${report.weekEnd}`,
    detectedKeys: report.detectedKeys,
    counts: {
      plannerTasks: report.plannerWeek.tasks.length,
      plannerTabs: report.plannerWeek.tabs.length,
      managedTabs: report.tabs.length,
      curatedTabs: report.curatedTabs.length,
      curatedThisWeek: report.curatedThisWeek.length,
      worklogs: report.worklogs.length,
      tradingSignals: report.tradingSignals.length,
      savedWeeklyReviews: Object.keys(savedReviews).length
    }
  }, null, 2);
}

function loadReviewToInputs(weekStart) {
  const saved = savedReviews[weekStart] || {};
  document.getElementById("winsInput").value = saved.wins || "";
  document.getElementById("blockersInput").value = saved.blockers || "";
  document.getElementById("improvementsInput").value = saved.improvements || "";
  document.getElementById("manualTop3Input").value = normalizeArray(saved.manualTop3).join("\n");
}

function readReviewInputs() {
  return {
    wins: document.getElementById("winsInput").value.trim(),
    blockers: document.getElementById("blockersInput").value.trim(),
    improvements: document.getElementById("improvementsInput").value.trim(),
    manualTop3: getManualTop3(),
    updatedAt: new Date().toISOString()
  };
}

async function saveCurrentReview() {
  savedReviews[currentWeekStart] = {
    ...(savedReviews[currentWeekStart] || {}),
    ...readReviewInputs()
  };
  saveSavedReviews();
  await generateAndRender();
  alert("已儲存本週復盤筆記。Sync Center 可同步 weekly review localStorage。 ");
}

async function setWeekStart(weekStart) {
  currentWeekStart = getWeekStartString(parseLocalDate(weekStart));
  document.getElementById("weekStartInput").value = currentWeekStart;
  loadReviewToInputs(currentWeekStart);
  await generateAndRender();
}

async function generateAndRender() {
  await hydrateReadableAppDataFromChromeStorage();
  await loadCuratedTabs();
  const report = generateReport();
  renderReport(report);
}

function openPlanner() {
  window.open("../planner/planner.html", "_blank");
}

function openSync() {
  window.open("../sync/sync.html", "_blank");
}

function buildExportHtml(report) {
  const manual = readReviewInputs();
  const generatedAt = new Date().toLocaleString();

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weekly Review ${escapeHtml(report.weekStart)} ~ ${escapeHtml(report.weekEnd)}</title>
  <style>
    body{font-family:Arial,"Microsoft JhengHei",sans-serif;margin:0;background:#f8fafc;color:#111827;line-height:1.7}.app{max-width:1100px;margin:0 auto;padding:28px}h1,h2{line-height:1.35}.card{background:#fff;border:1px solid #cbd5e1;border-radius:16px;padding:18px;margin:14px 0}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.metric{border:1px solid #e5e7eb;border-radius:12px;padding:12px}.metric span{display:block;color:#64748b;font-size:13px}.metric strong{font-size:24px}.item{border-bottom:1px solid #e5e7eb;padding:10px 0}.meta{color:#64748b;font-size:13px}.top3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.top{border:1px solid #dbeafe;border-radius:12px;padding:12px;background:#eff6ff}pre{white-space:pre-wrap;background:#f1f5f9;border-radius:12px;padding:12px}@media(max-width:800px){.grid,.top3{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="app">
    <h1>Weekly Review 每週復盤</h1>
    <p>${escapeHtml(report.weekStart)} ~ ${escapeHtml(report.weekEnd)}｜Generated at ${escapeHtml(generatedAt)}</p>

    <section class="card">
      <h2>總覽</h2>
      <div class="grid">
        <div class="metric"><span>Clean Score</span><strong>${report.cleanScore}</strong></div>
        <div class="metric"><span>完成任務</span><strong>${report.completedTasks.length}</strong></div>
        <div class="metric"><span>未完成 P1</span><strong>${report.unfinishedP1.length}</strong></div>
        <div class="metric"><span>Trading</span><strong>${report.tradingSignals.length}</strong></div>
        <div class="metric"><span>精選卡片</span><strong>${report.curatedTabs.length}</strong></div>
      </div>
    </section>

    <section class="card">
      <h2>下週 Top 3</h2>
      <div class="top3">
        ${report.nextTop3.map((x, i) => `<div class="top"><strong>Top ${i + 1}</strong><br>${escapeHtml(x)}</div>`).join("")}
      </div>
    </section>

    <section class="card">
      <h2>本週完成任務</h2>
      ${report.completedTasks.length ? report.completedTasks.map(task => `<div class="item"><strong>${escapeHtml(task.title)}</strong><div class="meta">${escapeHtml(task.date)} · ${escapeHtml(task.priority || "")} · ${escapeHtml(task.category || "")}</div></div>`).join("") : "<p>無</p>"}
    </section>

    <section class="card">
      <h2>未完成 P1</h2>
      ${report.unfinishedP1.length ? report.unfinishedP1.map(task => `<div class="item"><strong>${escapeHtml(task.title)}</strong><div class="meta">${escapeHtml(task.date)} · ${escapeHtml(task.status || "todo")} · ${escapeHtml(task.category || "")}</div></div>`).join("") : "<p>無</p>"}
    </section>

    <section class="card">
      <h2>Tabs 分類</h2>
      ${report.tabCategories.length ? report.tabCategories.map(([name, count]) => `<div class="item"><strong>${escapeHtml(name)}</strong><div class="meta">${count} 個分頁</div></div>`).join("") : "<p>無</p>"}
    </section>

    <section class="card">
      <h2>TabOS 精選知識卡</h2>
      ${report.curatedTabs.length ? report.curatedTabs.map(item => `<div class="item"><strong>${escapeHtml(item.title)}</strong><div class="meta">${escapeHtml(item.priority)} · ${escapeHtml(item.status)} · ${escapeHtml(normalizeArray(item.tags).join(", "))}</div><div>${escapeHtml(item.note || "").slice(0, 300)}</div></div>`).join("") : "<p>無</p>"}
    </section>

    <section class="card">
      <h2>Worklog / Notes 關鍵字</h2>
      <p>${report.keywords.map(k => `${escapeHtml(k.word)} (${k.count})`).join("、") || "無"}</p>
    </section>

    <section class="card">
      <h2>Trading 訊號</h2>
      ${report.tradingSignals.length ? report.tradingSignals.map(sig => `<div class="item"><strong>${escapeHtml(sig.name || sig.symbol)} · ${sig.risk ? "風險" : sig.buy ? "偏強" : "觀察"}</strong><div class="meta">${escapeHtml(sig.symbol)} · EV ${sig.ev.toFixed(2)} · Score ${sig.score}</div><div>${escapeHtml(sig.message).slice(0, 300)}</div></div>`).join("") : "<p>無</p>"}
    </section>

    <section class="card">
      <h2>手動復盤筆記</h2>
      <h3>做得好的事</h3><pre>${escapeHtml(manual.wins || "")}</pre>
      <h3>卡住 / 沒完成原因</h3><pre>${escapeHtml(manual.blockers || "")}</pre>
      <h3>下週調整策略</h3><pre>${escapeHtml(manual.improvements || "")}</pre>
    </section>
  </div>
</body>
</html>`;
}

function downloadHtml(html, filenameBase) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportWeeklyReviewHtml() {
  const report = currentReport || generateReport();
  savedReviews[currentWeekStart] = {
    ...(savedReviews[currentWeekStart] || {}),
    ...readReviewInputs(),
    exportedAt: new Date().toISOString()
  };
  saveSavedReviews();

  const html = buildExportHtml(report);
  downloadHtml(html, `weekly_review_${report.weekStart}_to_${report.weekEnd}`);
}

function bindEvents() {
  document.getElementById("weekStartInput").addEventListener("change", e => setWeekStart(e.target.value));
  document.getElementById("prevWeekBtn").addEventListener("click", () => setWeekStart(shiftDateString(currentWeekStart, -7)));
  document.getElementById("nextWeekBtn").addEventListener("click", () => setWeekStart(shiftDateString(currentWeekStart, 7)));
  document.getElementById("thisWeekBtn").addEventListener("click", () => setWeekStart(getWeekStartString(new Date())));
  document.getElementById("generateBtn").addEventListener("click", generateAndRender);
  document.getElementById("saveBtn").addEventListener("click", saveCurrentReview);
  document.getElementById("exportBtn").addEventListener("click", exportWeeklyReviewHtml);
  document.getElementById("openPlannerBtn").addEventListener("click", openPlanner);
  document.getElementById("openSyncBtn").addEventListener("click", openSync);

  ["winsInput", "blockersInput", "improvementsInput", "manualTop3Input"].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener("input", () => {
      if (id === "manualTop3Input") generateAndRender();
    });
  });
}

async function init() {
  document.getElementById("weekStartInput").value = currentWeekStart;
  bindEvents();
  await hydrateWeeklyReviewFromChromeStorage();
  loadReviewToInputs(currentWeekStart);
  await generateAndRender();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

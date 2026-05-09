function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("讀取檔案失敗"));
    reader.readAsText(file, "utf-8");
  });
}

function downloadHtml(html, prefix) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const pad = n => String(n).padStart(2, "0");

  const filename =
    prefix + "_" +
    now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + "_" +
    pad(now.getHours()) + "-" + pad(now.getMinutes()) + "-" + pad(now.getSeconds()) +
    ".html";

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function isNormalPageUrl(url) {
  if (typeof url !== "string" || !url.trim()) return false;

  const blockedPrefixes = [
    "chrome://",
    "opera://",
    "edge://",
    "about:",
    "chrome-extension://",
    "opera-extension://",
    "moz-extension://"
  ];

  return !blockedPrefixes.some(prefix => url.startsWith(prefix));
}

function buildTabItem(tab, source) {
  const normalizedUrl = TabOSMergeEngine.normalizeUrl(tab.url || "");

  return {
    title: tab.title || normalizedUrl || "(無標題)",
    url: normalizedUrl,
    read: false,
    status: tab.status || "待看",
    priority: tab.priority || "P3",
    tags: Array.isArray(tab.tags) ? tab.tags : [],
    source: source || "NEW"
  };
}

function buildManagedHtmlFromItems(items, title, storagePrefix) {
  const groups = TabOSMergeEngine.groupItems(items);

  return TabOSTemplateManager.buildManagedHtml(groups, {
    title,
    storageKey: storagePrefix + "_" + Date.now()
  });
}

async function getCurrentTabs() {
  const response = await chrome.runtime.sendMessage({ action: "GET_ALL_TABS" });

  if (!response || !response.success) {
    throw new Error(response?.error || "無法取得目前分頁");
  }

  return response.tabs;
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs && tabs[0];

  if (!tab) {
    throw new Error("無法取得目前這一頁");
  }

  if (!isNormalPageUrl(tab.url || "")) {
    throw new Error("目前這一頁不是一般網頁，不能加入 HTML");
  }

  return {
    id: tab.id,
    title: tab.title || tab.url || "(無標題)",
    url: tab.url || "",
    windowId: tab.windowId
  };
}

async function closeNormalTabs() {
  const response = await chrome.runtime.sendMessage({ action: "CLOSE_NORMAL_TABS" });

  if (!response || !response.success) {
    throw new Error(response?.error || "關閉分頁失敗");
  }

  return response.closedCount || 0;
}

async function closeTabById(tabId) {
  if (typeof tabId !== "number") return 0;
  await chrome.tabs.remove(tabId);
  return 1;
}

async function backupCurrentTabs() {
  const btn = document.getElementById("backupBtn");
  const closeAfter = document.getElementById("closeAfterBackup").checked;

  try {
    btn.disabled = true;
    setStatus("正在讀取目前所有分頁...");

    const tabs = await getCurrentTabs();
    const items = tabs.map(tab => buildTabItem(tab, "NEW"));
    const html = buildManagedHtmlFromItems(
      items,
      "Tabs Manager Pro Managed Tabs",
      "tabs_manager_pro_tabs"
    );

    downloadHtml(html, "tabs_manager_pro_tabs");

    if (closeAfter) {
      const count = await closeNormalTabs();
      setStatus("完成：已備份目前所有分頁，並關閉 " + count + " 個分頁。");
    } else {
      setStatus("完成：已備份目前所有分頁。");
    }
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function mergeWithCurrentTabs() {
  const btn = document.getElementById("mergeBtn");
  const input = document.getElementById("mergeFile");
  const closeAfterMerge = document.getElementById("closeAfterMerge").checked;

  try {
    if (!input.files[0]) {
      throw new Error("請先選擇舊 managed HTML");
    }

    btn.disabled = true;
    setStatus("正在讀取舊 HTML...");

    const htmlText = await readFile(input.files[0]);
    const oldGroups = TabOSTemplateManager.parseAnyHtml(htmlText);

    setStatus("正在抓目前所有分頁...");
    const currentTabs = await getCurrentTabs();

    setStatus("正在合併舊 HTML + 目前所有分頁，並保留狀態、分類、去重...");
    const mergedItems = TabOSMergeEngine.mergeOldGroupsWithCurrentTabs(oldGroups, currentTabs);
    const mergedGroups = TabOSMergeEngine.groupItems(mergedItems);

    const html = TabOSTemplateManager.buildManagedHtml(mergedGroups, {
      title: "Tabs Manager Pro Merged Tabs",
      storageKey: "tabs_manager_pro_merged_" + Date.now()
    });

    downloadHtml(html, "tabs_manager_pro_merged_tabs");

    if (closeAfterMerge) {
      setStatus("合併完成，正在關閉目前一般網頁分頁...");
      const closedCount = await closeNormalTabs();
      setStatus("完成：已合併舊 HTML + 目前所有分頁，並關閉 " + closedCount + " 個分頁。");
    } else {
      setStatus("完成：已合併舊 HTML + 目前所有分頁。");
    }
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function backupActiveTabOnly() {
  const btn = document.getElementById("backupActiveTabBtn");

  try {
    btn.disabled = true;
    setStatus("正在讀取目前這一頁...");

    const tab = await getActiveTab();
    const item = buildTabItem(tab, "NEW");
    const html = buildManagedHtmlFromItems(
      [item],
      "Tabs Manager Pro Single Tab",
      "tabs_manager_pro_single"
    );

    downloadHtml(html, "tabs_manager_pro_single_tab");
    setStatus("完成：已只備份目前這一頁。" + (item.title ? " 標題：「" + item.title + "」" : ""));
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function mergeActiveTabWithOldHtml() {
  const btn = document.getElementById("mergeActiveTabBtn");
  const input = document.getElementById("mergeSingleFile");
  const closeAfter = document.getElementById("closeAfterSingleMerge").checked;

  try {
    if (!input.files[0]) {
      throw new Error("請先選擇舊 managed HTML");
    }

    btn.disabled = true;
    setStatus("正在讀取舊 HTML...");

    const htmlText = await readFile(input.files[0]);
    const oldGroups = TabOSTemplateManager.parseAnyHtml(htmlText);

    setStatus("正在抓目前這一頁...");
    const activeTab = await getActiveTab();

    setStatus("正在把目前這一頁加入舊 HTML，並保留狀態、分類、去重...");
    const mergedItems = TabOSMergeEngine.mergeOldGroupsWithCurrentTabs(oldGroups, [activeTab]);
    const mergedGroups = TabOSMergeEngine.groupItems(mergedItems);

    const html = TabOSTemplateManager.buildManagedHtml(mergedGroups, {
      title: "Tabs Manager Pro Single Tab Merged Tabs",
      storageKey: "tabs_manager_pro_single_merged_" + Date.now()
    });

    downloadHtml(html, "tabs_manager_pro_single_merged_tabs");

    if (closeAfter) {
      await closeTabById(activeTab.id);
      setStatus("完成：已把目前這一頁加入舊 HTML，並關閉目前這一頁。");
    } else {
      setStatus("完成：已把目前這一頁加入舊 HTML。");
    }
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

function getManualTabInput() {
  const urlInput = document.getElementById("manualUrl");
  const titleInput = document.getElementById("manualTitle");
  const priorityInput = document.getElementById("manualPriority");
  const statusInput = document.getElementById("manualStatus");
  const tagsInput = document.getElementById("manualTags");

  const rawUrl = (urlInput.value || "").trim();
  const normalizedUrl = TabOSMergeEngine.normalizeUrl(rawUrl);

  if (!normalizedUrl) {
    throw new Error("請輸入有效 URL，例如：https://example.com/article");
  }

  const tags = (tagsInput.value || "")
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);

  return {
    title: (titleInput.value || normalizedUrl).trim(),
    url: normalizedUrl,
    read: false,
    status: statusInput.value || "待看",
    priority: priorityInput.value || "P3",
    tags,
    source: "MANUAL"
  };
}

async function exportManualSingleHtml() {
  const btn = document.getElementById("manualExportBtn");

  try {
    btn.disabled = true;
    setStatus("正在建立手動單筆 HTML...");

    const item = getManualTabInput();
    const html = buildManagedHtmlFromItems(
      [item],
      "Tabs Manager Pro Manual Single Tab",
      "tabs_manager_pro_manual_single"
    );

    downloadHtml(html, "tabs_manager_pro_manual_single_tab");
    setStatus("完成：已匯出手動單筆 HTML。標題：「" + item.title + "」");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function mergeManualSingleWithOldHtml() {
  const btn = document.getElementById("manualMergeBtn");
  const input = document.getElementById("manualMergeFile");

  try {
    if (!input.files[0]) {
      throw new Error("請先選擇舊 managed HTML");
    }

    btn.disabled = true;
    setStatus("正在讀取舊 HTML...");

    const item = getManualTabInput();
    const htmlText = await readFile(input.files[0]);
    const oldGroups = TabOSTemplateManager.parseAnyHtml(htmlText);

    setStatus("正在把手動單筆加入舊 HTML，並保留狀態、分類、去重...");
    const mergedItems = TabOSMergeEngine.mergeOldGroupsWithCurrentTabs(oldGroups, [item]);
    const mergedGroups = TabOSMergeEngine.groupItems(mergedItems);

    const html = TabOSTemplateManager.buildManagedHtml(mergedGroups, {
      title: "Tabs Manager Pro Manual Single Merged Tabs",
      storageKey: "tabs_manager_pro_manual_single_merged_" + Date.now()
    });

    downloadHtml(html, "tabs_manager_pro_manual_single_merged_tabs");
    setStatus("完成：已把手動單筆加入舊 HTML。標題：「" + item.title + "」");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function convertOldHtml() {
  const btn = document.getElementById("convertBtn");
  const input = document.getElementById("convertFile");

  try {
    if (!input.files[0]) {
      throw new Error("請先選擇 HTML");
    }

    btn.disabled = true;
    setStatus("正在解析 HTML...");

    const htmlText = await readFile(input.files[0]);
    const oldGroups = TabOSTemplateManager.parseAnyHtml(htmlText);

    const items = oldGroups.flatMap(g => g.items || []);
    const groups = TabOSMergeEngine.groupItems(items);

    const html = TabOSTemplateManager.buildManagedHtml(groups, {
      title: "Tabs Manager Pro Converted Tabs",
      storageKey: "tabs_manager_pro_converted_" + Date.now()
    });

    downloadHtml(html, "tabs_manager_pro_converted_tabs");
    setStatus("完成：已轉成新版可管理 HTML。");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

function openPlanner() {
  chrome.tabs.create({
    url: chrome.runtime.getURL("planner/planner.html")
  });
}

function openWeeklyReview() {
  chrome.tabs.create({
    url: chrome.runtime.getURL("weekly_review/weekly_review.html")
  });
}

function openTrading() {
  chrome.tabs.create({
    url: chrome.runtime.getURL("trading/trading.html")
  });
}

function openSync() {
  chrome.tabs.create({
    url: chrome.runtime.getURL("sync/sync.html")
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("backupBtn").addEventListener("click", backupCurrentTabs);
  document.getElementById("mergeBtn").addEventListener("click", mergeWithCurrentTabs);
  document.getElementById("backupActiveTabBtn").addEventListener("click", backupActiveTabOnly);
  document.getElementById("mergeActiveTabBtn").addEventListener("click", mergeActiveTabWithOldHtml);
  document.getElementById("manualExportBtn").addEventListener("click", exportManualSingleHtml);
  document.getElementById("manualMergeBtn").addEventListener("click", mergeManualSingleWithOldHtml);
  document.getElementById("convertBtn").addEventListener("click", convertOldHtml);

  const plannerBtn = document.getElementById("openPlannerBtn");
  if (plannerBtn) {
    plannerBtn.addEventListener("click", openPlanner);
  }

  const weeklyReviewBtn = document.getElementById("openWeeklyReviewBtn");
  if (weeklyReviewBtn) {
    weeklyReviewBtn.addEventListener("click", openWeeklyReview);
  }

  const tradingBtn = document.getElementById("openTradingBtn");
  if (tradingBtn) {
    tradingBtn.addEventListener("click", openTrading);
  }

  const syncBtn = document.getElementById("openSyncBtn");
  if (syncBtn) {
    syncBtn.addEventListener("click", openSync);
  }
});

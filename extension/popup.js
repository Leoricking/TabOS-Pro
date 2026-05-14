const CURATED_TABS_KEY = "tabs_manager_pro_curated_tabs_v1";
const TABOS_KEY_PREFIX = "tabs_manager_pro_";
const PERMANENT_BACKUP_VERSION = "1.3-storage-hardening";
const SENSITIVE_LOCAL_STORAGE_KEYS = new Set([
  "tabs_manager_pro_sync_settings"
]);

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

function makeTimestampedFilename(prefix, ext) {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  return (
    prefix + "_" +
    now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + "_" +
    pad(now.getHours()) + "-" + pad(now.getMinutes()) + "-" + pad(now.getSeconds()) +
    "." + ext
  );
}

function downloadHtml(html, prefix) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = makeTimestampedFilename(prefix, "html");
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadJson(obj, prefix) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = makeTimestampedFilename(prefix, "json");
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


function formatLocalDateTime(isoText) {
  if (!isoText) return "尚未建立";

  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return isoText;

  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function sendRuntimeMessage(message) {
  return chrome.runtime.sendMessage(message);
}

function getChromeStorage(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

function setChromeStorage(values) {
  return new Promise(resolve => chrome.storage.local.set(values, resolve));
}

function removeChromeStorage(keys) {
  return new Promise(resolve => chrome.storage.local.remove(keys, resolve));
}

async function getAutoBackupState() {
  const response = await sendRuntimeMessage({ action: "GET_AUTO_BACKUP" });

  if (!response || !response.success) {
    throw new Error(response?.error || "無法讀取自動備份狀態");
  }

  return response;
}

async function forceAutoBackup() {
  const response = await sendRuntimeMessage({ action: "FORCE_AUTO_BACKUP" });

  if (!response || !response.success) {
    throw new Error(response?.error || "無法建立自動備份");
  }

  return response;
}

async function setAutoBackupEnabled(enabled) {
  const response = await sendRuntimeMessage({
    action: "SET_AUTO_BACKUP_ENABLED",
    enabled
  });

  if (!response || !response.success) {
    throw new Error(response?.error || "無法更新自動備份設定");
  }

  return response;
}

async function restoreAutoBackupTabs() {
  const response = await sendRuntimeMessage({ action: "RESTORE_AUTO_BACKUP" });

  if (!response || !response.success) {
    throw new Error(response?.error || "無法還原自動備份分頁");
  }

  return response;
}

function tabsFromAutoBackupSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.tabs)) return [];

  return snapshot.tabs
    .filter(tab => isNormalPageUrl(tab.url || ""))
    .map(tab => ({
      title: tab.title || tab.url || "(無標題)",
      url: tab.url || "",
      windowId: tab.windowId,
      index: typeof tab.index === "number" ? tab.index : 0,
      active: Boolean(tab.active),
      pinned: Boolean(tab.pinned)
    }));
}

function buildAutoBackupHtml(snapshot) {
  const tabs = tabsFromAutoBackupSnapshot(snapshot);
  const items = tabs.map(tab => buildTabItem(tab, "AUTO_BACKUP"));

  if (items.length === 0) {
    throw new Error("最後自動備份內沒有一般網頁分頁");
  }

  return buildManagedHtmlFromItems(
    items,
    "Tabs Manager Pro Auto Session Backup",
    "tabs_manager_pro_auto_session"
  );
}

function renderAutoBackupSummary(state) {
  const box = document.getElementById("autoBackupSummary");
  const enabledInput = document.getElementById("autoBackupEnabled");

  if (!box || !enabledInput) return;

  enabledInput.checked = state.enabled !== false;

  const latest = state.latest;
  if (!latest) {
    box.textContent = [
      "狀態：尚未建立自動備份",
      "建議：點「立即更新自動備份」先建立第一份保護點。"
    ].join("\n");
    return;
  }

  box.textContent = [
    "狀態：" + (state.enabled === false ? "已停用" : "已啟用"),
    "最後備份：" + formatLocalDateTime(latest.savedAt),
    "分頁數：" + (latest.tabCount || 0),
    "視窗數：" + (latest.windowCount || 0),
    "保留歷史：" + (Array.isArray(state.history) ? state.history.length : 0) + " 份",
    "原因：" + (latest.reason || "unknown")
  ].join("\n");
}

async function refreshAutoBackupSummary() {
  try {
    const state = await getAutoBackupState();
    renderAutoBackupSummary(state);
  } catch (error) {
    const box = document.getElementById("autoBackupSummary");
    if (box) {
      box.textContent = "讀取自動備份失敗：" + error.message;
    }
  }
}

async function forceAutoBackupNow() {
  const btn = document.getElementById("forceAutoBackupBtn");

  try {
    btn.disabled = true;
    setStatus("正在建立目前所有分頁的自動備份...");

    const state = await forceAutoBackup();
    renderAutoBackupSummary(state);
    setStatus("完成：已更新自動備份，共 " + ((state.latest && state.latest.tabCount) || 0) + " 個分頁。");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function exportAutoBackupHtml() {
  const btn = document.getElementById("exportAutoBackupBtn");

  try {
    btn.disabled = true;
    setStatus("正在讀取最後自動備份...");

    const state = await getAutoBackupState();
    const html = buildAutoBackupHtml(state.latest);

    downloadHtml(html, "tabs_manager_pro_auto_session_backup");
    renderAutoBackupSummary(state);
    setStatus("完成：已匯出最後自動備份 HTML。");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function mergeAutoBackupWithOldHtml() {
  const btn = document.getElementById("mergeAutoBackupBtn");
  const input = document.getElementById("autoBackupMergeFile");

  try {
    if (!input.files[0]) {
      throw new Error("請先選擇舊 managed HTML");
    }

    btn.disabled = true;
    setStatus("正在讀取舊 HTML 與最後自動備份...");

    const htmlText = await readFile(input.files[0]);
    const oldGroups = TabOSTemplateManager.parseAnyHtml(htmlText);
    const state = await getAutoBackupState();
    const tabs = tabsFromAutoBackupSnapshot(state.latest);

    if (tabs.length === 0) {
      throw new Error("最後自動備份內沒有一般網頁分頁");
    }

    setStatus("正在把最後自動備份加入舊 HTML，並保留狀態、分類、去重...");
    const mergedItems = TabOSMergeEngine.mergeOldGroupsWithCurrentTabs(oldGroups, tabs);
    const mergedGroups = TabOSMergeEngine.groupItems(mergedItems);

    const html = TabOSTemplateManager.buildManagedHtml(mergedGroups, {
      title: "Tabs Manager Pro Auto Session Merged Tabs",
      storageKey: "tabs_manager_pro_auto_session_merged_" + Date.now()
    });

    downloadHtml(html, "tabs_manager_pro_auto_session_merged_tabs");
    renderAutoBackupSummary(state);
    setStatus("完成：已把最後自動備份加入舊 HTML。");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function restoreAutoBackupFromStorage() {
  const btn = document.getElementById("restoreAutoBackupBtn");

  try {
    if (!confirm("會把最後自動備份的分頁重新開啟到新視窗。確定要繼續？")) return;

    btn.disabled = true;
    setStatus("正在重新開啟最後自動備份分頁...");

    const response = await restoreAutoBackupTabs();
    setStatus("完成：已重新開啟 " + (response.openedCount || 0) + " 個分頁。");
    await refreshAutoBackupSummary();
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function toggleAutoBackupEnabled() {
  const input = document.getElementById("autoBackupEnabled");

  try {
    const state = await setAutoBackupEnabled(input.checked);
    renderAutoBackupSummary(state);
    setStatus(input.checked ? "已啟用自動備份。" : "已停用自動備份。");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
    input.checked = !input.checked;
  }
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


async function getCuratedTabs() {
  const data = await getChromeStorage([CURATED_TABS_KEY]);
  return Array.isArray(data[CURATED_TABS_KEY]) ? data[CURATED_TABS_KEY] : [];
}

function curatedToTabItems(items) {
  return items
    .filter(item => isNormalPageUrl(item.url || ""))
    .map(item => ({
      title: item.title || item.url || "(無標題)",
      url: item.url || "",
      read: Boolean(item.read),
      status: item.status || "待看",
      priority: item.priority || "P3",
      tags: Array.isArray(item.tags) ? item.tags : [],
      note: item.note || "",
      source: "CURATED"
    }));
}

function formatCuratedDate(isoText) {
  if (!isoText) return "無時間";
  const date = new Date(isoText);
  if (Number.isNaN(date.getTime())) return isoText;
  return date.toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function countCuratedBy(items, getter) {
  const map = new Map();
  for (const item of items) {
    const key = getter(item) || "未分類";
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

async function refreshCuratedSummary() {
  const box = document.getElementById("curatedSummary");
  if (!box) return;

  try {
    const items = await getCuratedTabs();
    const p1Count = items.filter(item => item.priority === "P1").length;
    const deepReadCount = items.filter(item => item.status === "深度閱讀").length;
    const latest = items[0];
    const topTags = countCuratedBy(items.flatMap(item => Array.isArray(item.tags) ? item.tags : []), tag => tag)
      .slice(0, 5)
      .map(([tag, count]) => `${tag} ${count}`)
      .join("、") || "無";

    box.textContent = [
      "精選總數：" + items.length,
      "P1：" + p1Count + " / 深度閱讀：" + deepReadCount,
      "最新：" + (latest ? `${formatCuratedDate(latest.createdAt)}｜${latest.title || latest.url}` : "無"),
      "Top tags：" + topTags
    ].join("\n");
  } catch (error) {
    box.textContent = "讀取精選資料失敗：" + error.message;
  }
}

async function openCuratedCaptureForActiveTab() {
  try {
    setStatus("正在開啟 TabOS 精選加入視窗...");
    const response = await sendRuntimeMessage({ action: "OPEN_CURATED_CAPTURE_FOR_ACTIVE_TAB" });
    if (!response || !response.success) {
      throw new Error(response?.error || "無法開啟精選加入視窗");
    }
    setStatus("已開啟 TabOS 精選加入視窗。也可以在網頁右鍵選「加入 TabOS 精選待看」。");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  }
}

async function exportCuratedHtml() {
  const btn = document.getElementById("exportCuratedBtn");

  try {
    btn.disabled = true;
    setStatus("正在匯出 TabOS 精選 HTML...");

    const curated = await getCuratedTabs();
    const items = curatedToTabItems(curated);
    if (!items.length) {
      throw new Error("目前沒有 TabOS 精選資料可匯出");
    }

    const html = buildManagedHtmlFromItems(
      items,
      "Tabs Manager Pro Curated Tabs",
      "tabs_manager_pro_curated"
    );

    downloadHtml(html, "tabs_manager_pro_curated_tabs");
    await refreshCuratedSummary();
    setStatus("完成：已匯出 TabOS 精選 HTML，共 " + items.length + " 筆。");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function mergeCuratedWithOldHtml() {
  const btn = document.getElementById("mergeCuratedBtn");
  const input = document.getElementById("curatedMergeFile");

  try {
    if (!input.files[0]) {
      throw new Error("請先選擇舊 managed HTML");
    }

    btn.disabled = true;
    setStatus("正在讀取舊 HTML 與 TabOS 精選...");

    const htmlText = await readFile(input.files[0]);
    const oldGroups = TabOSTemplateManager.parseAnyHtml(htmlText);
    const curated = await getCuratedTabs();
    const items = curatedToTabItems(curated);

    if (!items.length) {
      throw new Error("目前沒有 TabOS 精選資料可合併");
    }

    setStatus("正在把 TabOS 精選加入舊 HTML，並保留狀態、分類、去重...");
    const mergedItems = TabOSMergeEngine.mergeOldGroupsWithCurrentTabs(oldGroups, items);
    const mergedGroups = TabOSMergeEngine.groupItems(mergedItems);

    const html = TabOSTemplateManager.buildManagedHtml(mergedGroups, {
      title: "Tabs Manager Pro Curated Merged Tabs",
      storageKey: "tabs_manager_pro_curated_merged_" + Date.now()
    });

    downloadHtml(html, "tabs_manager_pro_curated_merged_tabs");
    await refreshCuratedSummary();
    setStatus("完成：已把 TabOS 精選加入舊 HTML，共 " + items.length + " 筆。");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function clearCuratedTabs() {
  const btn = document.getElementById("clearCuratedBtn");

  try {
    const items = await getCuratedTabs();
    if (!items.length) {
      setStatus("目前沒有 TabOS 精選資料需要清空。");
      return;
    }

    if (!confirm("確定清空 TabOS 精選？建議先用 Sync Center 或匯出 HTML 備份。")) return;

    btn.disabled = true;
    await removeChromeStorage(CURATED_TABS_KEY);
    await refreshCuratedSummary();
    setStatus("完成：已清空 TabOS 精選。");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

function isTabOSKey(key) {
  return String(key || "").startsWith(TABOS_KEY_PREFIX);
}

function getAllTabOSLocalStorageData() {
  const data = {};
  Object.keys(localStorage).sort().forEach(key => {
    if (!isTabOSKey(key)) return;
    if (SENSITIVE_LOCAL_STORAGE_KEYS.has(key)) return;
    data[key] = localStorage.getItem(key);
  });
  return data;
}

async function getAllTabOSChromeStorageData() {
  const all = await getChromeStorage(null);
  const data = {};

  Object.keys(all || {}).sort().forEach(key => {
    if (isTabOSKey(key)) {
      data[key] = all[key];
    }
  });

  return data;
}

function mirrorLocalDataToChromeStorage(localData, chromeData) {
  const next = { ...(chromeData || {}) };

  for (const [key, value] of Object.entries(localData || {})) {
    if (!isTabOSKey(key)) continue;
    next[key] = value;

    try {
      next[key + "__json"] = JSON.parse(value);
    } catch {
      // Some TabOS keys store plain strings, such as API endpoint.
    }

    next[key + "__mirrored_at"] = new Date().toISOString();
  }

  return next;
}

async function buildPermanentBackupPackage() {
  try {
    await forceAutoBackup();
  } catch (error) {
    console.warn("Permanent backup: force auto backup failed, continuing with last saved state", error);
  }

  const localData = getAllTabOSLocalStorageData();
  const chromeData = await getAllTabOSChromeStorageData();

  return {
    app: "Tabs Manager Pro",
    type: "tabos_permanent_backup",
    version: PERMANENT_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    note: "Permanent backup includes TabOS localStorage keys and all chrome.storage.local keys starting with tabs_manager_pro_. GitHub token sync settings are excluded.",
    localStorage: localData,
    chromeStorage: mirrorLocalDataToChromeStorage(localData, chromeData)
  };
}

async function refreshPermanentBackupSummary() {
  const box = document.getElementById("permanentBackupSummary");
  if (!box) return;

  try {
    const localData = getAllTabOSLocalStorageData();
    const chromeData = await getAllTabOSChromeStorageData();
    const plannerMirror = chromeData.tabs_manager_pro_planner_v2 ? "已鏡像" : "尚未鏡像";
    const weeklyMirror = chromeData.tabs_manager_pro_weekly_review_v1 ? "已鏡像" : "尚未鏡像";
    const tradingMirror = chromeData.tabs_manager_pro_trading_v3 ? "已鏡像" : "尚未鏡像";

    box.textContent = [
      "localStorage TabOS keys：" + Object.keys(localData).length,
      "chrome.storage TabOS keys：" + Object.keys(chromeData).length,
      "Planner：" + plannerMirror,
      "Weekly Review：" + weeklyMirror,
      "Trading：" + tradingMirror,
      "提醒：GitHub Token 同步設定不會放進永久備份 JSON。"
    ].join("\n");
  } catch (error) {
    box.textContent = "讀取永久備份狀態失敗：" + error.message;
  }
}

async function exportPermanentBackupJson() {
  const btn = document.getElementById("exportPermanentBackupBtn");

  try {
    btn.disabled = true;
    setStatus("正在建立永久備份 JSON...");
    const pkg = await buildPermanentBackupPackage();
    downloadJson(pkg, "tabs_manager_pro_permanent_backup");
    await refreshPermanentBackupSummary();
    await refreshAutoBackupSummary();
    setStatus("完成：已匯出永久備份 JSON。localStorage keys=" + Object.keys(pkg.localStorage).length + "，chrome.storage keys=" + Object.keys(pkg.chromeStorage).length + "。");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

async function restorePermanentBackupJson() {
  const btn = document.getElementById("restorePermanentBackupBtn");
  const input = document.getElementById("importPermanentBackupInput");

  try {
    if (!input.files[0]) {
      throw new Error("請先選擇永久備份 JSON");
    }

    if (!confirm("確定要從永久備份 JSON 還原？這會覆蓋目前 TabOS localStorage / chrome.storage.local 內同名資料。")) {
      return;
    }

    btn.disabled = true;
    setStatus("正在讀取永久備份 JSON...");

    const text = await readFile(input.files[0]);
    const pkg = JSON.parse(text);
    const localData = pkg.localStorage || pkg.data || {};
    const chromeData = pkg.chromeStorage || pkg.storage || {};

    if (!pkg || typeof pkg !== "object" || (!Object.keys(localData).length && !Object.keys(chromeData).length)) {
      throw new Error("永久備份 JSON 格式錯誤，找不到 localStorage / chromeStorage 資料");
    }

    for (const [key, value] of Object.entries(localData)) {
      if (isTabOSKey(key) && !SENSITIVE_LOCAL_STORAGE_KEYS.has(key)) {
        localStorage.setItem(key, value);
      }
    }

    const safeChromeData = {};
    for (const [key, value] of Object.entries(mirrorLocalDataToChromeStorage(localData, chromeData))) {
      if (isTabOSKey(key)) {
        safeChromeData[key] = value;
      }
    }

    if (Object.keys(safeChromeData).length) {
      await setChromeStorage(safeChromeData);
    }

    await refreshPermanentBackupSummary();
    await refreshAutoBackupSummary();
    await refreshCuratedSummary();
    setStatus("完成：已從永久備份 JSON 還原。建議重新開啟 Planner / Weekly / Trading 頁面確認資料。localStorage keys=" + Object.keys(localData).length + "，chrome.storage keys=" + Object.keys(safeChromeData).length + "。");
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
  document.getElementById("forceAutoBackupBtn").addEventListener("click", forceAutoBackupNow);
  document.getElementById("exportAutoBackupBtn").addEventListener("click", exportAutoBackupHtml);
  document.getElementById("mergeAutoBackupBtn").addEventListener("click", mergeAutoBackupWithOldHtml);
  document.getElementById("restoreAutoBackupBtn").addEventListener("click", restoreAutoBackupFromStorage);
  document.getElementById("autoBackupEnabled").addEventListener("change", toggleAutoBackupEnabled);
  refreshAutoBackupSummary();

  document.getElementById("exportPermanentBackupBtn").addEventListener("click", exportPermanentBackupJson);
  document.getElementById("restorePermanentBackupBtn").addEventListener("click", restorePermanentBackupJson);
  refreshPermanentBackupSummary();

  document.getElementById("backupBtn").addEventListener("click", backupCurrentTabs);
  document.getElementById("mergeBtn").addEventListener("click", mergeWithCurrentTabs);
  document.getElementById("backupActiveTabBtn").addEventListener("click", backupActiveTabOnly);
  document.getElementById("mergeActiveTabBtn").addEventListener("click", mergeActiveTabWithOldHtml);
  document.getElementById("manualExportBtn").addEventListener("click", exportManualSingleHtml);
  document.getElementById("manualMergeBtn").addEventListener("click", mergeManualSingleWithOldHtml);
  document.getElementById("openCuratedCaptureBtn").addEventListener("click", openCuratedCaptureForActiveTab);
  document.getElementById("exportCuratedBtn").addEventListener("click", exportCuratedHtml);
  document.getElementById("mergeCuratedBtn").addEventListener("click", mergeCuratedWithOldHtml);
  document.getElementById("clearCuratedBtn").addEventListener("click", clearCuratedTabs);
  refreshCuratedSummary();

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

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

async function getCurrentTabs() {
  const response = await chrome.runtime.sendMessage({ action: "GET_ALL_TABS" });

  if (!response || !response.success) {
    throw new Error(response?.error || "無法取得目前分頁");
  }

  return response.tabs;
}

async function closeNormalTabs() {
  const response = await chrome.runtime.sendMessage({ action: "CLOSE_NORMAL_TABS" });

  if (!response || !response.success) {
    throw new Error(response?.error || "關閉分頁失敗");
  }

  return response.closedCount || 0;
}

async function backupCurrentTabs() {
  const btn = document.getElementById("backupBtn");
  const closeAfter = document.getElementById("closeAfterBackup").checked;

  try {
    btn.disabled = true;
    setStatus("正在讀取目前分頁...");

    const tabs = await getCurrentTabs();

    const items = tabs.map(tab => ({
      title: tab.title,
      url: tab.url,
      read: false,
      status: "待看",
      priority: "P3",
      tags: [],
      source: "NEW"
    }));

    const groups = TabOSMergeEngine.groupItems(items);

    const html = TabOSTemplateManager.buildManagedHtml(groups, {
      title: "TabOS Pro Managed Tabs",
      storageKey: "tabos_pro_tabs_" + Date.now()
    });

    downloadHtml(html, "tabos_pro_tabs");

    if (closeAfter) {
      const count = await closeNormalTabs();
      setStatus("完成：已備份並關閉 " + count + " 個分頁。");
    } else {
      setStatus("完成：已備份目前分頁。");
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

    setStatus("正在抓目前分頁...");
    const currentTabs = await getCurrentTabs();

    setStatus("正在合併、保留狀態、分類、去重...");
    const mergedItems = TabOSMergeEngine.mergeOldGroupsWithCurrentTabs(oldGroups, currentTabs);
    const mergedGroups = TabOSMergeEngine.groupItems(mergedItems);

    const html = TabOSTemplateManager.buildManagedHtml(mergedGroups, {
      title: "TabOS Pro Merged Tabs",
      storageKey: "tabos_pro_merged_" + Date.now()
    });

    downloadHtml(html, "tabos_pro_merged_tabs");

    if (closeAfterMerge) {
      setStatus("合併完成，正在關閉目前一般網頁分頁...");
      const closedCount = await closeNormalTabs();
      setStatus("完成：已合併舊 HTML + 目前分頁，並關閉 " + closedCount + " 個分頁。");
    } else {
      setStatus("完成：已合併舊 HTML + 目前分頁。");
    }
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
      title: "TabOS Pro Converted Tabs",
      storageKey: "tabos_pro_converted_" + Date.now()
    });

    downloadHtml(html, "tabos_pro_converted_tabs");
    setStatus("完成：已轉成新版可管理 HTML。");
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    btn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("backupBtn").addEventListener("click", backupCurrentTabs);
  document.getElementById("mergeBtn").addEventListener("click", mergeWithCurrentTabs);
  document.getElementById("convertBtn").addEventListener("click", convertOldHtml);
});
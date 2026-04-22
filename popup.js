function setStatus(message) {
  document.getElementById("status").textContent = message;
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("讀取檔案失敗"));
    reader.readAsText(file, "utf-8");
  });
}

function downloadHtml(content, filenamePrefix) {
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const filename =
    `${filenamePrefix}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_` +
    `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}.html`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveManagedBackup() {
  const button = document.getElementById("saveManagedBtn");
  const closeTabsAfterSave = document.getElementById("closeTabsAfterSave").checked;

  try {
    button.disabled = true;
    setStatus("正在抓取 Opera 所有分頁...");

    const response = await chrome.runtime.sendMessage({
      action: "GET_ALL_TABS"
    });

    if (!response || !response.success) {
      throw new Error(response?.error || "無法取得分頁資料");
    }

    const groups = TabTemplateManager.groupTabsByCategoryAndHost(response.tabs);
    if (!groups.length) {
      throw new Error("沒有可備份的有效分頁");
    }

    setStatus(`找到 ${response.tabs.length} 個分頁，正在產生可管理版 HTML...`);

    const managedHtml = TabTemplateManager.buildManagedHtml(groups, {
      title: "Managed Tabs Backup",
      storageKey: "tabs_manager_" + Date.now()
    });

    downloadHtml(managedHtml, "tabs_backup_managed");
    setStatus("下載完成：已輸出可管理版 HTML。");

    if (closeTabsAfterSave) {
      setStatus("下載完成，正在關閉一般網頁分頁...");
      const closeResponse = await chrome.runtime.sendMessage({
        action: "CLOSE_NORMAL_TABS"
      });

      if (!closeResponse || !closeResponse.success) {
        throw new Error(closeResponse?.error || "已下載，但關閉分頁失敗");
      }

      setStatus(`完成：已下載可管理版 HTML，並關閉 ${closeResponse.closedCount} 個分頁。`);
    }
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    button.disabled = false;
  }
}

async function convertLegacyBackup() {
  const fileInput = document.getElementById("legacyFileInput");
  const button = document.getElementById("convertLegacyBtn");

  try {
    const file = fileInput.files[0];
    if (!file) {
      throw new Error("請先選擇舊版第一版 tabs_backup.html");
    }

    button.disabled = true;
    setStatus("正在讀取舊版 HTML...");

    const htmlText = await readFileAsText(file);
    const groups = TabTemplateManager.parseLegacyBackupHtml(htmlText);

    if (!groups.length) {
      throw new Error("無法從舊版 HTML 解析出任何連結");
    }

    setStatus(`解析完成，共 ${groups.length} 個群組，正在轉成新版可管理版 HTML...`);

    const managedHtml = TabTemplateManager.buildManagedHtml(groups, {
      title: "Converted Managed Tabs Backup",
      storageKey: "legacy_tabs_manager_" + Date.now()
    });

    downloadHtml(managedHtml, "tabs_backup_converted");
    setStatus("轉檔完成：已輸出新版可管理版 HTML。");
  } catch (error) {
    console.error(error);
    setStatus("轉檔失敗：" + error.message);
  } finally {
    button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("saveManagedBtn").addEventListener("click", saveManagedBackup);
  document.getElementById("convertLegacyBtn").addEventListener("click", convertLegacyBackup);
});
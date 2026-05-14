const SYNC_SETTINGS_KEY = "tabs_manager_pro_sync_settings";
const AUTO_SESSION_STORAGE_KEYS = [
  "tabs_manager_pro_auto_session_v1",
  "tabs_manager_pro_auto_session_history_v1",
  "tabs_manager_pro_auto_session_settings_v1"
];
const CURATED_STORAGE_KEYS = [
  "tabs_manager_pro_curated_tabs_v1"
];

const APP_DATA_STORAGE_KEYS = [
  "tabs_manager_pro_planner_v2",
  "tabs_manager_pro_planner_v2__json",
  "tabs_manager_pro_planner_v2__mirrored_at",
  "tabs_manager_pro_weekly_review_v1",
  "tabs_manager_pro_weekly_review_v1__json",
  "tabs_manager_pro_weekly_review_v1__mirrored_at",
  "tabs_manager_pro_trading_v3",
  "tabs_manager_pro_trading_v3__json",
  "tabs_manager_pro_trading_v3__mirrored_at",
  "tabs_manager_pro_trading_api_endpoint",
  "tabs_manager_pro_trading_api_endpoint__mirrored_at"
];

const KEY_GROUPS = {
  planner: [
    "tabs_manager_pro_planner_v2"
  ],
  weekly_review: [
    "tabs_manager_pro_weekly_review_v1"
  ],
  trading: [
    "tabs_manager_pro_trading_v3",
    "tabs_manager_pro_trading_v2",
    "tabs_manager_pro_trading_v1"
  ],
  tabs: [],
  curated: []
};

function getAllLocalStorageKeys() {
  return Object.keys(localStorage).sort();
}

function detectTabsKeys() {
  return getAllLocalStorageKeys().filter(key =>
    key.startsWith("tabs_manager_pro_tabs") ||
    key.startsWith("tabs_manager_pro_merged") ||
    key.startsWith("tabs_manager_pro_converted") ||
    key.startsWith("tabs_manager_pro_single") ||
    key.startsWith("tabs_manager_pro_manual_single") ||
    key.startsWith("tabs_manager_pro_auto_session")
  );
}

function keysForMode(mode) {
  if (mode === "planner") return KEY_GROUPS.planner;
  if (mode === "weekly_review") return KEY_GROUPS.weekly_review;
  if (mode === "trading") return KEY_GROUPS.trading;
  if (mode === "tabs") return detectTabsKeys();
  if (mode === "curated") return [];
  if (mode === "auto_session") return [];

  return [
    ...KEY_GROUPS.planner,
    ...KEY_GROUPS.weekly_review,
    ...KEY_GROUPS.trading,
    ...detectTabsKeys()
  ];
}

function isTabOSStorageKey(key) {
  return String(key || "").startsWith("tabs_manager_pro_");
}

function shouldIncludeAppDataStorage(mode) {
  return mode === "all" || mode === "planner" || mode === "weekly_review" || mode === "trading";
}

function storageKeysForMode(mode, allChromeStorage = {}) {
  if (mode === "all") {
    return Object.keys(allChromeStorage).filter(isTabOSStorageKey).sort();
  }

  if (mode === "planner") {
    return APP_DATA_STORAGE_KEYS.filter(key => key.startsWith("tabs_manager_pro_planner"));
  }

  if (mode === "weekly_review") {
    return APP_DATA_STORAGE_KEYS.filter(key => key.startsWith("tabs_manager_pro_weekly_review"));
  }

  if (mode === "trading") {
    return APP_DATA_STORAGE_KEYS.filter(key => key.startsWith("tabs_manager_pro_trading"));
  }

  if (mode === "auto_session") return AUTO_SESSION_STORAGE_KEYS;
  if (mode === "curated") return CURATED_STORAGE_KEYS;
  return [];
}

function shouldIncludeAutoSession(mode) {
  return mode === "all" || mode === "auto_session";
}

function shouldIncludeCurated(mode) {
  return mode === "all" || mode === "curated";
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

function setChromeStorage(values) {
  return new Promise(resolve => {
    if (!chrome.storage || !chrome.storage.local) {
      resolve();
      return;
    }
    chrome.storage.local.set(values, resolve);
  });
}

async function buildBackupPackage(mode = "all") {
  const keys = keysForMode(mode);
  const data = {};

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      data[key] = value;
    }
  }

  const allChromeStorage = await getChromeStorage(null);
  const storage = {};
  const storageKeys = storageKeysForMode(mode, allChromeStorage);

  for (const key of storageKeys) {
    if (allChromeStorage[key] !== undefined) {
      storage[key] = allChromeStorage[key];
    }
  }

  return {
    app: "Tabs Manager Pro",
    version: "1.3-storage-hardening",
    exportedAt: new Date().toISOString(),
    mode,
    data,
    storage
  };
}

async function restoreBackupPackage(pkg) {
  if (!pkg || typeof pkg !== "object") {
    throw new Error("同步檔格式錯誤");
  }

  const data = pkg.data || {};
  for (const [key, value] of Object.entries(data)) {
    localStorage.setItem(key, value);
  }

  if (pkg.storage && typeof pkg.storage === "object") {
    const storageValues = {};
    for (const [key, value] of Object.entries(pkg.storage)) {
      if (isTabOSStorageKey(key)) {
        storageValues[key] = value;
      }
    }

    if (Object.keys(storageValues).length > 0) {
      await setChromeStorage(storageValues);
    }
  }
}


function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {
    type: "application/json;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("讀取檔案失敗"));

    reader.readAsText(file, "utf-8");
  });
}

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSettings() {
  const settings = {
    token: document.getElementById("githubTokenInput").value.trim(),
    gistId: document.getElementById("gistIdInput").value.trim(),
    filename: document.getElementById("gistFileInput").value.trim() || "tabs-manager-pro-sync.json",
    mode: document.getElementById("syncModeInput").value
  };

  localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(settings));
  setGistStatus("同步設定已儲存。");
}

function applySettings() {
  const settings = loadSettings();

  document.getElementById("githubTokenInput").value = settings.token || "";
  document.getElementById("gistIdInput").value = settings.gistId || "";
  document.getElementById("gistFileInput").value = settings.filename || "tabs-manager-pro-sync.json";
  document.getElementById("syncModeInput").value = settings.mode || "all";
}

function clearSettings() {
  if (!confirm("確定清除 GitHub Gist 同步設定？")) return;

  localStorage.removeItem(SYNC_SETTINGS_KEY);

  document.getElementById("githubTokenInput").value = "";
  document.getElementById("gistIdInput").value = "";
  document.getElementById("gistFileInput").value = "tabs-manager-pro-sync.json";
  document.getElementById("syncModeInput").value = "all";

  setGistStatus("同步設定已清除。");
}

function setGistStatus(text) {
  document.getElementById("gistStatus").textContent = text;
}

async function renderLocalSummary() {
  const planner = localStorage.getItem("tabs_manager_pro_planner_v2");
  const weeklyReview = localStorage.getItem("tabs_manager_pro_weekly_review_v1");
  const tradingV3 = localStorage.getItem("tabs_manager_pro_trading_v3");
  const tradingV2 = localStorage.getItem("tabs_manager_pro_trading_v2");
  const tradingV1 = localStorage.getItem("tabs_manager_pro_trading_v1");
  const tabsKeys = detectTabsKeys();
  const extensionStorage = await getChromeStorage(null);
  const autoSession = extensionStorage.tabs_manager_pro_auto_session_v1;
  const autoHistory = extensionStorage.tabs_manager_pro_auto_session_history_v1;
  const curatedTabs = extensionStorage.tabs_manager_pro_curated_tabs_v1;

  let plannerInfo = "無";
  let weeklyReviewInfo = "無";
  let tradingInfo = "無";
  let autoSessionInfo = "無";
  let curatedInfo = "無";

  try {
    if (planner) {
      const p = JSON.parse(planner);
      plannerInfo = `${Object.keys(p).length} 天資料`;
    }
  } catch {
    plannerInfo = "讀取失敗";
  }

  try {
    if (weeklyReview) {
      const w = JSON.parse(weeklyReview);
      weeklyReviewInfo = `${Object.keys(w).length} 週資料`;
    }
  } catch {
    weeklyReviewInfo = "讀取失敗";
  }

  try {
    const raw = tradingV3 || tradingV2 || tradingV1;
    if (raw) {
      const t = JSON.parse(raw);
      tradingInfo = `${Array.isArray(t) ? t.length : 0} 檔股票`;
    }
  } catch {
    tradingInfo = "讀取失敗";
  }

  try {
    if (autoSession) {
      autoSessionInfo = `${autoSession.tabCount || 0} 個分頁 / ${autoSession.windowCount || 0} 個視窗 / ${autoSession.savedAt || "無時間"}`;
      if (Array.isArray(autoHistory)) {
        autoSessionInfo += ` / 歷史 ${autoHistory.length} 份`;
      }
    }
  } catch {
    autoSessionInfo = "讀取失敗";
  }

  try {
    if (Array.isArray(curatedTabs)) {
      const p1 = curatedTabs.filter(item => item.priority === "P1").length;
      const deep = curatedTabs.filter(item => item.status === "深度閱讀").length;
      curatedInfo = `${curatedTabs.length} 筆 / P1 ${p1} / 深度閱讀 ${deep}`;
    }
  } catch {
    curatedInfo = "讀取失敗";
  }

  const selectedMode = document.getElementById("syncModeInput").value;
  const localKeys = keysForMode(selectedMode);
  const storageKeys = storageKeysForMode(selectedMode, extensionStorage);

  document.getElementById("localSummary").textContent = [
    `Planner：${plannerInfo}`,
    `Weekly Review：${weeklyReviewInfo}`,
    `Trading：${tradingInfo}`,
    `Tabs keys：${tabsKeys.length}`,
    `Curated Tabs：${curatedInfo}`,
    `Auto Session Backup：${autoSessionInfo}`,
    "",
    "同步會備份以下 localStorage key：",
    ...(localKeys.length ? localKeys.map(k => `- ${k}`) : ["- 無"]),
    "",
    "同步會備份以下 chrome.storage key：",
    ...(storageKeys.length ? storageKeys.map(k => `- ${k}`) : ["- 無"])
  ].join("\n");
}

async function uploadToGist() {
  const token = document.getElementById("githubTokenInput").value.trim();
  let gistId = document.getElementById("gistIdInput").value.trim();
  const filename = document.getElementById("gistFileInput").value.trim() || "tabs-manager-pro-sync.json";
  const mode = document.getElementById("syncModeInput").value;

  if (!token) {
    alert("請輸入 GitHub Token");
    return;
  }

  const pkg = await buildBackupPackage(mode);
  const content = JSON.stringify(pkg, null, 2);

  setGistStatus("正在上傳到 GitHub Gist...");

  if (!gistId) {
    const response = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        description: "Tabs Manager Pro Sync",
        public: false,
        files: {
          [filename]: {
            content
          }
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error("建立 Gist 失敗：" + text);
    }

    const data = await response.json();
    gistId = data.id;

    document.getElementById("gistIdInput").value = gistId;
    saveSettings();

    setGistStatus("已建立並上傳 Gist。\nGist ID：" + gistId);
    return;
  }

  const response = await fetch("https://api.github.com/gists/" + encodeURIComponent(gistId), {
    method: "PATCH",
    headers: {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      files: {
        [filename]: {
          content
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error("更新 Gist 失敗：" + text);
  }

  setGistStatus("已上傳到 Gist。\nGist ID：" + gistId + "\n檔案：" + filename);
}

async function downloadFromGist() {
  const token = document.getElementById("githubTokenInput").value.trim();
  const gistId = document.getElementById("gistIdInput").value.trim();
  const filename = document.getElementById("gistFileInput").value.trim() || "tabs-manager-pro-sync.json";

  if (!token) {
    alert("請輸入 GitHub Token");
    return;
  }

  if (!gistId) {
    alert("請輸入 Gist ID");
    return;
  }

  setGistStatus("正在從 Gist 下載...");

  const response = await fetch("https://api.github.com/gists/" + encodeURIComponent(gistId), {
    method: "GET",
    headers: {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json"
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error("讀取 Gist 失敗：" + text);
  }

  const data = await response.json();

  if (!data.files || !data.files[filename]) {
    throw new Error("Gist 中找不到檔案：" + filename);
  }

  const content = data.files[filename].content;
  const pkg = JSON.parse(content);

  await restoreBackupPackage(pkg);
  await renderLocalSummary();

  setGistStatus("已從 Gist 下載並還原。\n時間：" + new Date().toLocaleString("zh-TW"));
}

document.getElementById("exportAllBtn").addEventListener("click", async () => {
  try {
    const mode = document.getElementById("syncModeInput").value;
    const pkg = await buildBackupPackage(mode);
    downloadJson(pkg, "tabs_manager_pro_sync_backup.json");
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("importAllInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await readFile(file);
    const pkg = JSON.parse(text);
    await restoreBackupPackage(pkg);
    await renderLocalSummary();
    alert("已匯入同步資料");
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("saveSettingsBtn").addEventListener("click", async () => {
  saveSettings();
  await renderLocalSummary();
});

document.getElementById("clearSettingsBtn").addEventListener("click", clearSettings);

document.getElementById("uploadGistBtn").addEventListener("click", async () => {
  try {
    await uploadToGist();
  } catch (error) {
    setGistStatus(error.message);
  }
});

document.getElementById("downloadGistBtn").addEventListener("click", async () => {
  try {
    await downloadFromGist();
  } catch (error) {
    setGistStatus(error.message);
  }
});

document.getElementById("syncModeInput").addEventListener("change", () => {
  renderLocalSummary();
});

applySettings();
renderLocalSummary();

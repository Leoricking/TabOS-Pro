const SYNC_SETTINGS_KEY = "tabs_manager_pro_sync_settings";

const KEY_GROUPS = {
  planner: [
    "tabs_manager_pro_planner_v2"
  ],
  trading: [
    "tabs_manager_pro_trading_v2",
    "tabs_manager_pro_trading_v1"
  ],
  tabs: []
};

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

function keysForMode(mode) {
  if (mode === "planner") return KEY_GROUPS.planner;
  if (mode === "trading") return KEY_GROUPS.trading;
  if (mode === "tabs") return detectTabsKeys();

  return [
    ...KEY_GROUPS.planner,
    ...KEY_GROUPS.trading,
    ...detectTabsKeys()
  ];
}

function buildBackupPackage(mode = "all") {
  const keys = keysForMode(mode);
  const data = {};

  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      data[key] = value;
    }
  }

  return {
    app: "Tabs Manager Pro",
    version: "1.0",
    exportedAt: new Date().toISOString(),
    mode,
    data
  };
}

function restoreBackupPackage(pkg) {
  if (!pkg || typeof pkg !== "object" || !pkg.data) {
    throw new Error("同步檔格式錯誤");
  }

  for (const [key, value] of Object.entries(pkg.data)) {
    localStorage.setItem(key, value);
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

function renderLocalSummary() {
  const planner = localStorage.getItem("tabs_manager_pro_planner_v2");
  const tradingV2 = localStorage.getItem("tabs_manager_pro_trading_v2");
  const tradingV1 = localStorage.getItem("tabs_manager_pro_trading_v1");
  const tabsKeys = detectTabsKeys();

  let plannerInfo = "無";
  let tradingInfo = "無";

  try {
    if (planner) {
      const p = JSON.parse(planner);
      plannerInfo = `${Object.keys(p).length} 天資料`;
    }
  } catch {
    plannerInfo = "讀取失敗";
  }

  try {
    const raw = tradingV2 || tradingV1;
    if (raw) {
      const t = JSON.parse(raw);
      tradingInfo = `${Array.isArray(t) ? t.length : 0} 檔股票`;
    }
  } catch {
    tradingInfo = "讀取失敗";
  }

  document.getElementById("localSummary").textContent = [
    `Planner：${plannerInfo}`,
    `Trading：${tradingInfo}`,
    `Tabs keys：${tabsKeys.length}`,
    "",
    "同步會備份以下 key：",
    ...keysForMode(document.getElementById("syncModeInput").value).map(k => `- ${k}`)
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

  const pkg = buildBackupPackage(mode);
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

  restoreBackupPackage(pkg);
  renderLocalSummary();

  setGistStatus("已從 Gist 下載並還原。\n時間：" + new Date().toLocaleString("zh-TW"));
}

document.getElementById("exportAllBtn").addEventListener("click", () => {
  const mode = document.getElementById("syncModeInput").value;
  const pkg = buildBackupPackage(mode);
  downloadJson(pkg, "tabs_manager_pro_sync_backup.json");
});

document.getElementById("importAllInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await readFile(file);
    const pkg = JSON.parse(text);
    restoreBackupPackage(pkg);
    renderLocalSummary();
    alert("已匯入同步資料");
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  saveSettings();
  renderLocalSummary();
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

document.getElementById("syncModeInput").addEventListener("change", renderLocalSummary);

applySettings();
renderLocalSummary();
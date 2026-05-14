const AUTO_SESSION_KEY = "tabs_manager_pro_auto_session_v1";
const AUTO_SESSION_HISTORY_KEY = "tabs_manager_pro_auto_session_history_v1";
const AUTO_SESSION_SETTINGS_KEY = "tabs_manager_pro_auto_session_settings_v1";
const AUTO_BACKUP_ALARM_NAME = "tabs_manager_pro_auto_backup_alarm";
const AUTO_BACKUP_MAX_HISTORY = 20;
const AUTO_BACKUP_MIN_INTERVAL_MS = 5000;
const AUTO_BACKUP_ALARM_MINUTES = 1;
const CURATED_TABS_KEY = "tabs_manager_pro_curated_tabs_v1";
const CURATED_CAPTURE_CONTEXT_MENU_ID = "tabs_manager_pro_add_to_curated";
const CURATED_CAPTURE_TEMP_PREFIX = "tabs_manager_pro_curated_capture_";
const CURATED_CAPTURE_TEMP_TTL_MS = 10 * 60 * 1000;

let autoBackupTimer = null;
let lastAutoBackupAt = 0;

function isClosableNormalTab(url) {
  if (typeof url !== "string") return false;

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

function isNormalBackupTab(tab) {
  return tab && isClosableNormalTab(tab.url || "");
}

function normalizeTabForSnapshot(tab) {
  return {
    title: tab.title || tab.url || "(無標題)",
    url: tab.url || "",
    windowId: tab.windowId,
    index: typeof tab.index === "number" ? tab.index : 0,
    active: Boolean(tab.active),
    pinned: Boolean(tab.pinned)
  };
}

function uniqueNormalTabs(tabs) {
  const seen = new Set();
  const result = [];

  for (const tab of tabs) {
    if (!isNormalBackupTab(tab)) continue;

    const key = `${tab.windowId || 0}|${tab.url || ""}`;
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalizeTabForSnapshot(tab));
  }

  return result.sort((a, b) => {
    if ((a.windowId || 0) !== (b.windowId || 0)) {
      return (a.windowId || 0) - (b.windowId || 0);
    }
    return (a.index || 0) - (b.index || 0);
  });
}

function createSnapshotSignature(tabs) {
  return tabs.map(tab => `${tab.windowId || 0}:${tab.url}`).join("\n");
}

function getStorage(keys) {
  return new Promise(resolve => chrome.storage.local.get(keys, resolve));
}

function setStorage(values) {
  return new Promise(resolve => chrome.storage.local.set(values, resolve));
}

function removeStorage(keys) {
  return new Promise(resolve => chrome.storage.local.remove(keys, resolve));
}

function createCuratedContextMenu() {
  if (!chrome.contextMenus) return;

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CURATED_CAPTURE_CONTEXT_MENU_ID,
      title: "加入 TabOS 精選待看",
      contexts: ["page", "selection", "link"]
    });
  });
}

function makeCaptureId() {
  return "cap_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
}

function buildCuratedCapturePayload(info, tab) {
  const linkUrl = info && info.linkUrl ? info.linkUrl : "";
  const pageUrl = tab && tab.url ? tab.url : "";
  const targetUrl = linkUrl || pageUrl;

  return {
    title: (tab && tab.title) || targetUrl || "",
    url: targetUrl || "",
    pageUrl: pageUrl || "",
    linkUrl: linkUrl || "",
    selectionText: (info && info.selectionText) || "",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + CURATED_CAPTURE_TEMP_TTL_MS).toISOString()
  };
}

async function openCuratedCaptureWindow(payload) {
  if (!payload || !isClosableNormalTab(payload.url || payload.pageUrl || "")) {
    throw new Error("目前頁面不是一般網頁，不能加入 TabOS 精選");
  }

  const captureId = makeCaptureId();
  await setStorage({
    [CURATED_CAPTURE_TEMP_PREFIX + captureId]: payload
  });

  await chrome.windows.create({
    url: chrome.runtime.getURL("focus_add/focus_add.html?captureId=" + encodeURIComponent(captureId)),
    type: "popup",
    width: 460,
    height: 640,
    focused: true
  });
}

async function cleanupExpiredCuratedCapturePayloads() {
  const all = await getStorage(null);
  const now = Date.now();
  const expired = [];

  for (const [key, value] of Object.entries(all || {})) {
    if (!key.startsWith(CURATED_CAPTURE_TEMP_PREFIX)) continue;
    const expires = value && value.expiresAt ? new Date(value.expiresAt).getTime() : 0;
    if (!expires || expires < now) expired.push(key);
  }

  if (expired.length) {
    await removeStorage(expired);
  }
}

async function getAutoBackupSettings() {
  const data = await getStorage([AUTO_SESSION_SETTINGS_KEY]);
  const settings = data[AUTO_SESSION_SETTINGS_KEY] || {};

  return {
    enabled: settings.enabled !== false
  };
}

async function setAutoBackupEnabled(enabled) {
  await setStorage({
    [AUTO_SESSION_SETTINGS_KEY]: {
      enabled: Boolean(enabled),
      updatedAt: new Date().toISOString()
    }
  });

  if (enabled) {
    scheduleAutoBackup("enabled");
  }
}

async function captureCurrentSession(reason = "manual") {
  const settings = await getAutoBackupSettings();

  if (!settings.enabled && reason !== "manual" && reason !== "force") {
    return null;
  }

  const tabs = await chrome.tabs.query({});
  const normalTabs = uniqueNormalTabs(tabs);
  const windowIds = Array.from(new Set(normalTabs.map(tab => tab.windowId).filter(id => typeof id === "number")));
  const nowIso = new Date().toISOString();
  const signature = createSnapshotSignature(normalTabs);

  const snapshot = {
    app: "Tabs Manager Pro",
    type: "auto_session_backup",
    version: 1,
    savedAt: nowIso,
    reason,
    tabCount: normalTabs.length,
    windowCount: windowIds.length,
    signature,
    tabs: normalTabs
  };

  const existing = await getStorage([AUTO_SESSION_KEY, AUTO_SESSION_HISTORY_KEY]);
  const previous = existing[AUTO_SESSION_KEY];
  const history = Array.isArray(existing[AUTO_SESSION_HISTORY_KEY])
    ? existing[AUTO_SESSION_HISTORY_KEY]
    : [];

  const nextHistory = [snapshot, ...history.filter(item => item && item.signature !== signature)]
    .slice(0, AUTO_BACKUP_MAX_HISTORY);

  await setStorage({
    [AUTO_SESSION_KEY]: snapshot,
    [AUTO_SESSION_HISTORY_KEY]: nextHistory
  });

  lastAutoBackupAt = Date.now();

  if (!previous || previous.signature !== signature || reason === "manual" || reason === "force") {
    console.log("[Tabs Manager Pro] Auto session backup saved", {
      reason,
      tabCount: snapshot.tabCount,
      windowCount: snapshot.windowCount,
      savedAt: snapshot.savedAt
    });
  }

  return snapshot;
}

function scheduleAutoBackup(reason = "tab_change") {
  if (autoBackupTimer) {
    clearTimeout(autoBackupTimer);
  }

  autoBackupTimer = setTimeout(async () => {
    autoBackupTimer = null;

    const elapsed = Date.now() - lastAutoBackupAt;
    if (elapsed < AUTO_BACKUP_MIN_INTERVAL_MS && reason !== "manual" && reason !== "force") {
      return;
    }

    try {
      await captureCurrentSession(reason);
    } catch (error) {
      console.error("[Tabs Manager Pro] Auto backup failed", error);
    }
  }, 1200);
}

async function getAutoBackupState() {
  const data = await getStorage([
    AUTO_SESSION_KEY,
    AUTO_SESSION_HISTORY_KEY,
    AUTO_SESSION_SETTINGS_KEY
  ]);

  const settings = data[AUTO_SESSION_SETTINGS_KEY] || {};

  return {
    enabled: settings.enabled !== false,
    latest: data[AUTO_SESSION_KEY] || null,
    history: Array.isArray(data[AUTO_SESSION_HISTORY_KEY])
      ? data[AUTO_SESSION_HISTORY_KEY]
      : []
  };
}

async function restoreAutoBackupTabs(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.tabs) || snapshot.tabs.length === 0) {
    throw new Error("沒有可還原的自動備份分頁");
  }

  const tabs = snapshot.tabs.filter(tab => isClosableNormalTab(tab.url || ""));
  if (tabs.length === 0) {
    throw new Error("自動備份內沒有一般網頁分頁可還原");
  }

  const tabsByWindow = new Map();
  for (const tab of tabs) {
    const windowId = typeof tab.windowId === "number" ? tab.windowId : 0;
    if (!tabsByWindow.has(windowId)) {
      tabsByWindow.set(windowId, []);
    }
    tabsByWindow.get(windowId).push(tab);
  }

  let openedCount = 0;

  for (const group of tabsByWindow.values()) {
    const sorted = group.slice().sort((a, b) => (a.index || 0) - (b.index || 0));
    const first = sorted[0];
    const createdWindow = await chrome.windows.create({
      url: first.url,
      focused: true
    });

    openedCount += 1;

    if (first.pinned && createdWindow.tabs && createdWindow.tabs[0] && typeof createdWindow.tabs[0].id === "number") {
      await chrome.tabs.update(createdWindow.tabs[0].id, { pinned: true });
    }

    for (const tab of sorted.slice(1)) {
      const createdTab = await chrome.tabs.create({
        windowId: createdWindow.id,
        url: tab.url,
        active: Boolean(tab.active),
        pinned: Boolean(tab.pinned)
      });

      if (tab.pinned && createdTab && typeof createdTab.id === "number") {
        await chrome.tabs.update(createdTab.id, { pinned: true });
      }

      openedCount += 1;
    }
  }

  return openedCount;
}

chrome.runtime.onInstalled.addListener(() => {
  createCuratedContextMenu();
  cleanupExpiredCuratedCapturePayloads();

  chrome.alarms.create(AUTO_BACKUP_ALARM_NAME, {
    periodInMinutes: AUTO_BACKUP_ALARM_MINUTES
  });
  scheduleAutoBackup("installed");
});

chrome.runtime.onStartup.addListener(() => {
  createCuratedContextMenu();
  cleanupExpiredCuratedCapturePayloads();

  chrome.alarms.create(AUTO_BACKUP_ALARM_NAME, {
    periodInMinutes: AUTO_BACKUP_ALARM_MINUTES
  });
  scheduleAutoBackup("startup");
});

if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!info || info.menuItemId !== CURATED_CAPTURE_CONTEXT_MENU_ID) return;

    openCuratedCaptureWindow(buildCuratedCapturePayload(info, tab)).catch(error => {
      console.error("[Tabs Manager Pro] Failed to open curated capture window", error);
    });
  });
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm && alarm.name === AUTO_BACKUP_ALARM_NAME) {
    cleanupExpiredCuratedCapturePayloads();
    scheduleAutoBackup("periodic");
  }
});

chrome.tabs.onCreated.addListener(() => scheduleAutoBackup("tab_created"));
chrome.tabs.onRemoved.addListener(() => scheduleAutoBackup("tab_removed"));
chrome.tabs.onMoved.addListener(() => scheduleAutoBackup("tab_moved"));
chrome.tabs.onAttached.addListener(() => scheduleAutoBackup("tab_attached"));
chrome.tabs.onDetached.addListener(() => scheduleAutoBackup("tab_detached"));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.title || changeInfo.status === "complete") {
    scheduleAutoBackup("tab_updated");
  }
});
chrome.tabs.onActivated.addListener(() => scheduleAutoBackup("tab_activated"));
chrome.windows.onRemoved.addListener(() => scheduleAutoBackup("window_removed"));

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === "GET_ALL_TABS") {
        const tabs = await chrome.tabs.query({});

        sendResponse({
          success: true,
          tabs: tabs.map(tab => ({
            id: tab.id,
            title: tab.title || tab.url || "(無標題)",
            url: tab.url || "",
            windowId: tab.windowId,
            index: typeof tab.index === "number" ? tab.index : 0,
            active: Boolean(tab.active),
            pinned: Boolean(tab.pinned)
          }))
        });

        return;
      }

      if (message.action === "CLOSE_NORMAL_TABS") {
        const tabs = await chrome.tabs.query({});
        const ids = tabs
          .filter(tab => isClosableNormalTab(tab.url))
          .map(tab => tab.id)
          .filter(id => typeof id === "number");

        if (ids.length > 0) {
          await chrome.tabs.remove(ids);
        }

        sendResponse({
          success: true,
          closedCount: ids.length
        });

        return;
      }

      if (message.action === "GET_AUTO_BACKUP") {
        const state = await getAutoBackupState();
        sendResponse({
          success: true,
          ...state
        });
        return;
      }

      if (message.action === "FORCE_AUTO_BACKUP") {
        const snapshot = await captureCurrentSession("force");
        const state = await getAutoBackupState();
        sendResponse({
          success: true,
          snapshot,
          ...state
        });
        return;
      }

      if (message.action === "SET_AUTO_BACKUP_ENABLED") {
        await setAutoBackupEnabled(message.enabled !== false);
        const state = await getAutoBackupState();
        sendResponse({
          success: true,
          ...state
        });
        return;
      }

      if (message.action === "RESTORE_AUTO_BACKUP") {
        const state = await getAutoBackupState();
        const openedCount = await restoreAutoBackupTabs(state.latest);
        sendResponse({
          success: true,
          openedCount
        });
        return;
      }

      if (message.action === "OPEN_CURATED_CAPTURE_FOR_ACTIVE_TAB") {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs && tabs[0];

        if (!activeTab) {
          throw new Error("無法取得目前這一頁");
        }

        await openCuratedCaptureWindow(buildCuratedCapturePayload({}, activeTab));
        sendResponse({ success: true });
        return;
      }

      if (message.action === "CURATED_SAVED_TRIGGER_BACKUP") {
        const snapshot = await captureCurrentSession(message.reason || "curated_saved");
        sendResponse({
          success: true,
          snapshot
        });
        return;
      }

      sendResponse({
        success: false,
        error: "Unknown action"
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
  })();

  return true;
});

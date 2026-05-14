const CURATED_TABS_KEY = "tabs_manager_pro_curated_tabs_v1";
const CURATED_CAPTURE_TEMP_PREFIX = "tabs_manager_pro_curated_capture_";

let selectedPriority = "P3";
let selectedStatus = "待看";
let captureId = "";
let capturePayload = null;

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name) || "";
}

function setStatus(text) {
  document.getElementById("status").textContent = text;
}

function escapeTag(value) {
  return String(value || "").trim();
}

function parseTags(text) {
  return String(text || "")
    .split(",")
    .map(escapeTag)
    .filter(Boolean);
}

function normalizeUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "gclid"
    ].forEach(key => parsed.searchParams.delete(key));
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return raw;
  }
}

function isNormalPageUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return false;

  const blocked = [
    "chrome://",
    "opera://",
    "edge://",
    "about:",
    "chrome-extension://",
    "opera-extension://",
    "moz-extension://"
  ];

  return !blocked.some(prefix => raw.startsWith(prefix));
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

function makeId() {
  return "curated_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function formatSourceInfo(payload) {
  if (!payload) return "來源：手動建立";

  return [
    "來源：右鍵精選",
    payload.linkUrl ? "模式：連結" : "模式：頁面",
    payload.selectionText ? "已帶入選取文字到 Note" : "未偵測到選取文字",
    payload.createdAt ? "建立時間：" + new Date(payload.createdAt).toLocaleString("zh-TW") : ""
  ].filter(Boolean).join("\n");
}

function bindButtonGroups() {
  document.querySelectorAll(".button-group").forEach(group => {
    group.addEventListener("click", event => {
      const btn = event.target.closest("button[data-value]");
      if (!btn) return;

      group.querySelectorAll("button").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");

      if (group.dataset.field === "priority") {
        selectedPriority = btn.dataset.value || "P3";
      }

      if (group.dataset.field === "status") {
        selectedStatus = btn.dataset.value || "待看";
      }
    });
  });
}

async function loadCapturePayload() {
  captureId = getQueryParam("captureId");

  if (!captureId) {
    document.getElementById("sourceInfo").textContent = "來源：手動開啟，請自行輸入 URL / 標題。";
    return;
  }

  const key = CURATED_CAPTURE_TEMP_PREFIX + captureId;
  const data = await getStorage([key]);
  capturePayload = data[key] || null;

  if (!capturePayload) {
    document.getElementById("sourceInfo").textContent = "找不到右鍵來源資料，請自行輸入。";
    return;
  }

  const url = normalizeUrl(capturePayload.url || capturePayload.pageUrl || "");
  document.getElementById("titleInput").value = capturePayload.title || url || "";
  document.getElementById("urlInput").value = url;
  document.getElementById("noteInput").value = capturePayload.selectionText || "";
  document.getElementById("sourceInfo").textContent = formatSourceInfo(capturePayload);
}

function readForm() {
  const url = normalizeUrl(document.getElementById("urlInput").value);
  const title = String(document.getElementById("titleInput").value || "").trim() || url;
  const note = String(document.getElementById("noteInput").value || "").trim();
  const tags = parseTags(document.getElementById("tagsInput").value);

  if (!url || !isNormalPageUrl(url)) {
    throw new Error("請輸入一般網頁 URL，不能是 chrome:// / extension:// / about: 等內部頁面");
  }

  return {
    id: makeId(),
    title,
    url,
    priority: selectedPriority,
    status: selectedStatus,
    tags,
    note,
    source: capturePayload ? "CONTEXT_MENU" : "MANUAL_CAPTURE",
    pageUrl: capturePayload?.pageUrl || "",
    selectionText: capturePayload?.selectionText || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    read: false
  };
}

async function saveCurated(closeAfter) {
  const saveBtn = document.getElementById("saveBtn");
  const saveAndCloseBtn = document.getElementById("saveAndCloseBtn");

  try {
    saveBtn.disabled = true;
    saveAndCloseBtn.disabled = true;
    setStatus("正在儲存到 TabOS 精選...");

    const item = readForm();
    const data = await getStorage([CURATED_TABS_KEY]);
    const list = Array.isArray(data[CURATED_TABS_KEY]) ? data[CURATED_TABS_KEY] : [];
    const withoutDuplicate = list.filter(existing => normalizeUrl(existing.url) !== item.url);
    const next = [item, ...withoutDuplicate].slice(0, 2000);

    await setStorage({ [CURATED_TABS_KEY]: next });

    try {
      await chrome.runtime.sendMessage({
        action: "CURATED_SAVED_TRIGGER_BACKUP",
        reason: "curated_saved"
      });
    } catch (backupError) {
      console.warn("[TabOS] Curated saved, but auto backup trigger failed", backupError);
    }

    if (captureId) {
      await removeStorage(CURATED_CAPTURE_TEMP_PREFIX + captureId);
    }

    setStatus("完成：已儲存到 TabOS 精選。目前精選共 " + next.length + " 筆。");

    if (closeAfter) {
      setTimeout(() => window.close(), 350);
    }
  } catch (error) {
    console.error(error);
    setStatus("失敗：" + error.message);
  } finally {
    saveBtn.disabled = false;
    saveAndCloseBtn.disabled = false;
  }
}

function bindEvents() {
  bindButtonGroups();
  document.getElementById("saveBtn").addEventListener("click", () => saveCurated(false));
  document.getElementById("saveAndCloseBtn").addEventListener("click", () => saveCurated(true));
  document.getElementById("cancelBtn").addEventListener("click", () => window.close());
}

async function init() {
  bindEvents();
  await loadCapturePayload();
  setStatus("確認欄位後即可儲存。右鍵選取文字會自動帶入 Note。");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

(function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseManagedInitialData(htmlText) {
    const match = htmlText.match(/const\s+INITIAL_DATA\s*=\s*(\[.*?\]);/s);
    if (!match) return null;

    try {
      const data = JSON.parse(match[1]);
      return Array.isArray(data) ? data : null;
    } catch {
      return null;
    }
  }

  function parseByDom(htmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const items = [];

    const anchors = Array.from(doc.querySelectorAll("a"));

    for (const a of anchors) {
      const href = (a.getAttribute("href") || "").trim();
      const title = (a.textContent || href || "(無標題)").trim();

      if (/^(https?:|file:\/\/)/i.test(href)) {
        items.push({
          title,
          url: href,
          read: false,
          status: "待看",
          priority: "P3",
          tags: [],
          source: "OLD"
        });
      }
    }

    return TabOSMergeEngine.groupItems(items);
  }

  function parseAnyHtml(htmlText) {
    const managed = parseManagedInitialData(htmlText);
    if (managed && managed.length) {
      return managed;
    }

    return parseByDom(htmlText);
  }

  function buildManagedHtml(groups, options = {}) {
    const title = options.title || "TabOS Pro Managed Tabs";
    const storageKey = options.storageKey || "tabos_pro_tabs_" + Date.now();
    const safeData = JSON.stringify(groups).replace(/<\/script/gi, "<\\/script");

    return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
* { box-sizing: border-box; }

body {
  margin: 0;
  background: #0f1115;
  color: #e8e8e8;
  font-family: Arial, "Microsoft JhengHei", sans-serif;
}

.wrap {
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
}

h1 {
  margin: 0 0 8px;
  font-size: 36px;
  font-weight: 800;
}

.sub {
  color: #a9b1bd;
  margin-bottom: 18px;
  line-height: 1.7;
  font-size: 15px;
}

.toolbar {
  display: grid;
  gap: 12px;
  margin-bottom: 18px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  background: #171a21;
  border: 1px solid #252b36;
  border-radius: 16px;
  padding: 14px;
  align-items: center;
}

input,
select {
  background: #0f1115;
  color: white;
  border: 1px solid #353d4c;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
}

#searchInput {
  flex: 1;
  min-width: 280px;
}

button {
  border: none;
  border-radius: 10px;
  padding: 11px 16px;
  cursor: pointer;
  background: #2b3342;
  color: white;
  font-weight: 800;
  font-size: 14px;
}

button:hover {
  opacity: 0.92;
}

.primary { background: #4c7dff; }
.success { background: #2f9d62; }
.warn { background: #c78a21; }
.danger { background: #d84d4d; }

.stats {
  color: #b7c0cd;
  font-size: 15px;
  line-height: 1.8;
}

.stats strong {
  color: #d7e7ff;
}

.stats .active-filter {
  color: #ffb86c;
  font-weight: 900;
}

.card {
  background: #171a21;
  border: 1px solid #252b36;
  border-radius: 18px;
  padding: 20px;
  margin-bottom: 18px;
}

.group-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  align-items: center;
}

.group-head h2 {
  margin: 0;
  color: #ffb86c;
  font-size: 26px;
  font-weight: 900;
}

.group-count {
  color: #d6dde8;
  font-size: 15px;
}

.group-actions {
  margin-bottom: 14px;
}

.links {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* ✅ 新版：壓縮清單列，左右並排 */
.item {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  margin-bottom: 10px;
  background: #101319;
  border: 1px solid #212736;
  border-radius: 14px;
}

.title {
  color: #7cb7ff;
  text-decoration: none;
  font-size: 16px;
  line-height: 1.5;
  word-break: break-word;
}

.title:hover {
  text-decoration: underline;
}

.url {
  margin-top: 6px;
  color: #8f9aad;
  font-size: 12px;
  word-break: break-all;
}

.meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.tag {
  display: inline-flex;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  background: #2a3a58;
  color: #9fc2ff;
}

.tag.read { background: #294534; color: #9ae6b1; }
.tag.unread { background: #2a3a58; color: #9fc2ff; }
.tag.p1 { background: #6b1f1f; color: #ffd0d0; }
.tag.p2 { background: #5b461f; color: #ffe4a3; }
.tag.p3 { background: #26384f; color: #a9d4ff; }
.tag.new { background: #24513b; color: #a7f3d0; }
.tag.old { background: #333b4c; color: #cbd5e1; }
.tag.unchanged { background: #38324f; color: #d9ccff; }

/* ✅ 新版：右側操作列改為橫向排列 */
.actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.actions button {
  width: auto;
  min-width: 72px;
  padding: 10px 14px;
}

.actions select {
  width: 96px;
  min-width: 96px;
  padding: 9px 10px;
}

.actions input {
  width: 150px;
  min-width: 120px;
  padding: 9px 10px;
}

.actions input:focus {
  width: 220px;
}

.empty {
  padding: 48px;
  text-align: center;
  border-radius: 16px;
  border: 1px dashed #394153;
  color: #98a4b6;
}

/* ✅ 小螢幕保護 */
@media (max-width: 900px) {
  .item {
    grid-template-columns: 1fr;
  }

  .actions {
    flex-wrap: wrap;
    justify-content: flex-start;
    white-space: normal;
  }
}
</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">
    產生時間：${escapeHtml(new Date().toLocaleString("zh-TW"))}<br>
    支援搜尋、分類、去重、已看/未看、狀態、重要度、標籤、群組批次操作、匯出。
  </div>

  <div class="toolbar">
    <div class="row">
      <input id="searchInput" placeholder="搜尋標題、網址、分類、tag..." />

      <label>
        <input type="checkbox" id="unreadOnly" />
        只看未看
      </label>

      <select id="categoryFilter">
        <option value="">全部分類</option>
      </select>

      <button id="expandAllBtn">展開全部</button>
      <button id="collapseAllBtn">收合全部</button>
      <button id="removeAllReadBtn" class="danger">刪除全部已看</button>
      <button id="exportBtn" class="success">匯出整理後 HTML</button>
    </div>

    <div class="row stats" id="stats"></div>
  </div>

  <div id="app"></div>
</div>

<script>
const STORAGE_KEY = ${JSON.stringify(storageKey)};
const COLLAPSE_KEY = STORAGE_KEY + "_collapse";
const INITIAL_DATA = ${safeData};

let groups = [];
let collapse = {};

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapse));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const rawCollapse = localStorage.getItem(COLLAPSE_KEY);
  groups = raw ? JSON.parse(raw) : INITIAL_DATA;
  collapse = rawCollapse ? JSON.parse(rawCollapse) : {};
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function allItems(sourceGroups = groups) {
  return sourceGroups.flatMap(g => (g.items || []).map(i => ({
    ...i,
    groupId: g.id,
    groupName: g.name,
    groupCategory: g.category
  })));
}

function getVisibleGroups() {
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  const unreadOnly = document.getElementById("unreadOnly").checked;
  const categoryFilter = document.getElementById("categoryFilter").value;

  return groups.map(group => {
    if (categoryFilter && group.category !== categoryFilter) {
      return { ...group, items: [] };
    }

    const items = group.items.filter(item => {
      if (unreadOnly && item.read) return false;

      const hay = [
        group.name,
        group.category,
        item.title,
        item.url,
        item.status,
        item.priority,
        item.source,
        ...(item.tags || [])
      ].join(" ").toLowerCase();

      return !keyword || hay.includes(keyword);
    });

    return { ...group, items };
  }).filter(g => g.items.length > 0);
}

function updateStats() {
  const categoryFilter = document.getElementById("categoryFilter").value;
  const keyword = document.getElementById("searchInput").value.trim();
  const unreadOnly = document.getElementById("unreadOnly").checked;

  const all = allItems(groups);
  const visibleGroups = getVisibleGroups();
  const visibleItems = allItems(visibleGroups);

  const total = all.length;
  const unread = all.filter(i => !i.read).length;
  const read = total - unread;
  const p1 = all.filter(i => i.priority === "P1").length;
  const newCount = all.filter(i => i.source === "NEW").length;

  const vTotal = visibleItems.length;
  const vUnread = visibleItems.filter(i => !i.read).length;
  const vRead = vTotal - vUnread;
  const vP1 = visibleItems.filter(i => i.priority === "P1").length;
  const vNew = visibleItems.filter(i => i.source === "NEW").length;

  let filterLabel = categoryFilter || "全部分類";
  if (keyword) filterLabel += " + 搜尋";
  if (unreadOnly) filterLabel += " + 只看未看";

  document.getElementById("stats").innerHTML =
    "<div>目前篩選：<span class='active-filter'>" + esc(filterLabel) + "</span></div>" +
    "<div>顯示群組：<strong>" + visibleGroups.length + "</strong></div>" +
    "<div>顯示連結：<strong>" + vTotal + "</strong></div>" +
    "<div>顯示未看：<strong>" + vUnread + "</strong></div>" +
    "<div>顯示已看：<strong>" + vRead + "</strong></div>" +
    "<div>顯示 P1：<strong>" + vP1 + "</strong></div>" +
    "<div>顯示新增：<strong>" + vNew + "</strong></div>" +
    "<br>" +
    "<div>全部群組：<strong>" + groups.length + "</strong></div>" +
    "<div>全部連結：<strong>" + total + "</strong></div>" +
    "<div>全部未看：<strong>" + unread + "</strong></div>" +
    "<div>全部已看：<strong>" + read + "</strong></div>" +
    "<div>全部 P1：<strong>" + p1 + "</strong></div>" +
    "<div>全部新增：<strong>" + newCount + "</strong></div>";
}

function updateCategoryFilter() {
  const select = document.getElementById("categoryFilter");
  const current = select.value;
  const categories = Array.from(new Set(groups.map(g => g.category || "其他"))).sort();

  select.innerHTML =
    '<option value="">全部分類</option>' +
    categories.map(c => '<option value="' + esc(c) + '">' + esc(c) + '</option>').join("");

  select.value = current;
}

function findItem(groupId, itemId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return null;
  const item = group.items.find(i => i.id === itemId);
  return item ? { group, item } : null;
}

function toggleRead(groupId, itemId) {
  const found = findItem(groupId, itemId);
  if (!found) return;
  found.item.read = !found.item.read;
  save();
  render();
}

function removeItem(groupId, itemId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;

  group.items = group.items.filter(i => i.id !== itemId);
  groups = groups.filter(g => g.items.length > 0);

  save();
  render();
}

function setStatus(groupId, itemId, value) {
  const found = findItem(groupId, itemId);
  if (!found) return;
  found.item.status = value;
  save();
  render();
}

function setPriority(groupId, itemId, value) {
  const found = findItem(groupId, itemId);
  if (!found) return;
  found.item.priority = value;
  save();
  render();
}

function setTags(groupId, itemId, value) {
  const found = findItem(groupId, itemId);
  if (!found) return;

  found.item.tags = value
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  save();
  render();
}

function toggleGroup(groupId) {
  collapse[groupId] = !collapse[groupId];
  save();
  render();
}

function expandAll() {
  groups.forEach(g => collapse[g.id] = false);
  save();
  render();
}

function collapseAll() {
  groups.forEach(g => collapse[g.id] = true);
  save();
  render();
}

function markGroupRead(groupId, value) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;

  group.items.forEach(item => item.read = value);

  save();
  render();
}

function removeReadItemsInGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;

  group.items = group.items.filter(item => !item.read);
  groups = groups.filter(g => g.items.length > 0);

  save();
  render();
}

function openUnreadInGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;

  group.items
    .filter(item => !item.read)
    .forEach(item => window.open(item.url, "_blank", "noopener"));
}

function removeAllRead() {
  groups.forEach(group => {
    group.items = group.items.filter(item => !item.read);
  });

  groups = groups.filter(g => g.items.length > 0);

  save();
  render();
}

function exportHtml() {
  save();

  const html = document.documentElement.outerHTML;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");

  a.href = url;
  a.download =
    "tabos_pro_export_" +
    now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate()) + "_" +
    pad(now.getHours()) + "-" + pad(now.getMinutes()) + "-" + pad(now.getSeconds()) +
    ".html";

  a.click();
  URL.revokeObjectURL(url);
}

function render() {
  updateCategoryFilter();

  const filtered = getVisibleGroups();
  const app = document.getElementById("app");

  updateStats();

  if (!filtered.length) {
    app.innerHTML = '<div class="empty">沒有符合條件的資料。</div>';
    return;
  }

  app.innerHTML = filtered.map(group => {
    const isCollapsed = !!collapse[group.id];
    const unreadCount = group.items.filter(i => !i.read).length;

    return '<div class="card">' +
      '<div class="group-head">' +
        '<h2>' + esc(group.name) + '</h2>' +
        '<div class="group-count">共 ' + group.items.length + ' / 未看 ' + unreadCount + '</div>' +
      '</div>' +

      '<div class="row group-actions">' +
        '<button onclick="toggleGroup(\\'' + group.id + '\\')">' + (isCollapsed ? "展開" : "收合") + '</button>' +
        '<button class="success" onclick="markGroupRead(\\'' + group.id + '\\', true)">本群全標已看</button>' +
        '<button class="warn" onclick="markGroupRead(\\'' + group.id + '\\', false)">本群全標未看</button>' +
        '<button class="primary" onclick="openUnreadInGroup(\\'' + group.id + '\\')">開本群未看</button>' +
        '<button class="danger" onclick="removeReadItemsInGroup(\\'' + group.id + '\\')">刪本群已看</button>' +
      '</div>' +

      (isCollapsed ? "" :
        '<ul class="links">' +
          group.items.map(item => {
            const itemTags = (item.tags || [])
              .map(t => '<span class="tag">' + esc(t) + '</span>')
              .join("");

            const source = item.source || "OLD";
            const sourceClass = source.toLowerCase();

            return '<li class="item">' +
              '<div>' +
                '<a class="title" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' + esc(item.title) + '</a>' +
                '<div class="url">' + esc(item.url) + '</div>' +
                '<div class="meta">' +
                  '<span class="tag ' + (item.read ? "read" : "unread") + '">' + (item.read ? "已看" : "未看") + '</span>' +
                  '<span class="tag ' + esc(String(item.priority || "P3").toLowerCase()) + '">' + esc(item.priority || "P3") + '</span>' +
                  '<span class="tag">' + esc(item.status || "待看") + '</span>' +
                  '<span class="tag ' + esc(sourceClass) + '">' + esc(source) + '</span>' +
                  itemTags +
                '</div>' +
              '</div>' +

              '<div class="actions">' +
                '<button onclick="window.open(\\'' + esc(item.url) + '\\', \\'_blank\\', \\'noopener\\')">開啟</button>' +
                '<button class="success" onclick="toggleRead(\\'' + group.id + '\\', \\'' + item.id + '\\')">' + (item.read ? "改未看" : "標已看") + '</button>' +

                '<select onchange="setStatus(\\'' + group.id + '\\', \\'' + item.id + '\\', this.value)">' +
                  ["待看", "重要", "工作", "深度閱讀"].map(s =>
                    '<option value="' + esc(s) + '" ' + ((item.status || "待看") === s ? "selected" : "") + '>' + esc(s) + '</option>'
                  ).join("") +
                '</select>' +

                '<select onchange="setPriority(\\'' + group.id + '\\', \\'' + item.id + '\\', this.value)">' +
                  ["P1", "P2", "P3"].map(p =>
                    '<option value="' + esc(p) + '" ' + ((item.priority || "P3") === p ? "selected" : "") + '>' + esc(p) + '</option>'
                  ).join("") +
                '</select>' +

                '<input value="' + esc((item.tags || []).join(", ")) + '" onchange="setTags(\\'' + group.id + '\\', \\'' + item.id + '\\', this.value)" placeholder="tags" />' +
                '<button class="danger" onclick="removeItem(\\'' + group.id + '\\', \\'' + item.id + '\\')">移除</button>' +
              '</div>' +
            '</li>';
          }).join("") +
        '</ul>'
      ) +
    '</div>';
  }).join("");
}

document.getElementById("searchInput").addEventListener("input", render);
document.getElementById("unreadOnly").addEventListener("change", render);
document.getElementById("categoryFilter").addEventListener("change", render);
document.getElementById("expandAllBtn").addEventListener("click", expandAll);
document.getElementById("collapseAllBtn").addEventListener("click", collapseAll);
document.getElementById("removeAllReadBtn").addEventListener("click", removeAllRead);
document.getElementById("exportBtn").addEventListener("click", exportHtml);

load();
render();
</script>
</body>
</html>`;
  }

  window.TabOSTemplateManager = {
    parseManagedInitialData,
    parseAnyHtml,
    buildManagedHtml
  };
})();
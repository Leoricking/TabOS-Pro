(function () {
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function makeId() {
    return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function isValidSavableUrl(url) {
    return typeof url === "string" && /^(https?:|file:\/\/)/i.test(url.trim());
  }

  function normalizeUrl(rawUrl) {
    if (!isValidSavableUrl(rawUrl)) {
      return "";
    }

    try {
      const url = new URL(rawUrl.trim());

      const removableParams = [
        "fbclid",
        "gclid",
        "igshid",
        "igsh",
        "si",
        "mc_cid",
        "mc_eid",
        "_gl"
      ];

      for (const key of [...url.searchParams.keys()]) {
        const lowerKey = key.toLowerCase();

        if (
          lowerKey.startsWith("utm_") ||
          removableParams.includes(lowerKey)
        ) {
          url.searchParams.delete(key);
        }
      }

      url.hash = "";

      let normalized = url.toString();

      if (normalized.endsWith("?")) {
        normalized = normalized.slice(0, -1);
      }

      return normalized;
    } catch (_) {
      return rawUrl.trim();
    }
  }

  function getHostname(url) {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch (_) {
      return "";
    }
  }

  function textIncludesAny(text, keywords) {
    const lower = (text || "").toLowerCase();
    return keywords.some(keyword => lower.includes(keyword));
  }

  function categorizeTab(title, url) {
    const host = getHostname(url);
    const combined = `${title || ""} ${url || ""}`.toLowerCase();

    const aiHosts = [
      "chatgpt.com",
      "openai.com",
      "claude.ai",
      "gemini.google.com",
      "copilot.microsoft.com",
      "poe.com",
      "perplexity.ai",
      "notebooklm.google.com"
    ];

    const youtubeHosts = [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "youtu.be"
    ];

    const shoppingKeywords = [
      "shopee",
      "momo",
      "pchome",
      "amazon",
      "露天",
      "蝦皮",
      "購物",
      "buy",
      "shop",
      "mall",
      "carousell",
      "ebay",
      "淘寶",
      "taobao",
      "tmall"
    ];

    const workHosts = [
      "docs.google.com",
      "drive.google.com",
      "sheets.google.com",
      "slides.google.com",
      "mail.google.com",
      "calendar.google.com",
      "outlook.office.com",
      "onedrive.live.com",
      "sharepoint.com",
      "teams.microsoft.com",
      "notion.so",
      "www.notion.so",
      "github.com",
      "gitlab.com"
    ];

    const socialHosts = [
      "facebook.com",
      "www.facebook.com",
      "instagram.com",
      "www.instagram.com",
      "x.com",
      "twitter.com",
      "threads.net",
      "www.threads.net",
      "tiktok.com",
      "www.tiktok.com",
      "linkedin.com",
      "www.linkedin.com",
      "reddit.com",
      "www.reddit.com"
    ];

    if (aiHosts.some(h => host === h || host.endsWith("." + h))) {
      return "AI";
    }

    if (youtubeHosts.some(h => host === h || host.endsWith("." + h))) {
      return "YouTube";
    }

    if (workHosts.some(h => host === h || host.endsWith("." + h))) {
      return "工作";
    }

    if (socialHosts.some(h => host === h || host.endsWith("." + h))) {
      return "社群";
    }

    if (
      host.includes("maps") ||
      textIncludesAny(combined, ["google maps", "導航", "地圖", "map", "route"])
    ) {
      return "地圖 / 導航";
    }

    if (textIncludesAny(combined, shoppingKeywords)) {
      return "購物";
    }

    return "其他";
  }

  function dedupeItems(items) {
    const seen = new Set();
    const result = [];

    for (const item of items) {
      if (!isValidSavableUrl(item.url)) continue;

      const normalized = normalizeUrl(item.url);
      if (!normalized) continue;

      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      result.push({
        id: makeId(),
        title: item.title || normalized,
        url: normalized,
        read: !!item.read
      });
    }

    return result;
  }

  function groupTabsByCategoryAndHost(tabs) {
    const categoryOrder = [
      "AI",
      "YouTube",
      "購物",
      "工作",
      "社群",
      "地圖 / 導航",
      "其他"
    ];

    const grouped = new Map();

    for (const tab of tabs) {
      if (!isValidSavableUrl(tab.url)) continue;

      const normalizedUrl = normalizeUrl(tab.url);
      if (!normalizedUrl) continue;

      const category = categorizeTab(tab.title, normalizedUrl);
      const host = getHostname(normalizedUrl) || "未分類";
      const groupName = `${category} / ${host}`;

      if (!grouped.has(groupName)) {
        grouped.set(groupName, {
          id: makeId(),
          category,
          name: groupName,
          items: []
        });
      }

      grouped.get(groupName).items.push({
        id: makeId(),
        title: tab.title || normalizedUrl,
        url: normalizedUrl,
        read: !!tab.read
      });
    }

    const groups = Array.from(grouped.values())
      .map(group => ({
        ...group,
        items: dedupeItems(group.items)
      }))
      .filter(group => group.items.length > 0);

    groups.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category);
      const bIndex = categoryOrder.indexOf(b.category);

      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }

      return a.name.localeCompare(b.name);
    });

    return groups;
  }

  function parseManagedInitialData(htmlText) {
    const match = htmlText.match(/const\s+INITIAL_DATA\s*=\s*(\[.*?\]);/s);
    if (!match) {
      return null;
    }

    try {
      const parsed = JSON.parse(match[1]);

      const extractedItems = [];

      for (const group of parsed) {
        const items = Array.isArray(group.items) ? group.items : [];
        for (const item of items) {
          if (!isValidSavableUrl(item.url)) continue;

          extractedItems.push({
            title: item.title || item.url || "(無標題)",
            url: item.url,
            read: !!item.read
          });
        }
      }

      if (!extractedItems.length) {
        return null;
      }

      return groupTabsByCategoryAndHost(extractedItems);
    } catch (error) {
      console.warn("Failed to parse INITIAL_DATA from managed HTML:", error);
      return null;
    }
  }

  function parseHtmlByDom(htmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const extractedItems = [];

    const groupDivs = Array.from(doc.querySelectorAll(".group"));

    if (groupDivs.length > 0) {
      for (const groupDiv of groupDivs) {
        const links = Array.from(groupDiv.querySelectorAll("a"));

        for (const a of links) {
          const href = (a.getAttribute("href") || "").trim();
          const title = (a.textContent || href || "(無標題)").trim();

          if (!isValidSavableUrl(href)) continue;

          extractedItems.push({
            title,
            url: href,
            read: false
          });
        }
      }
    } else {
      const fallbackLinks = Array.from(doc.querySelectorAll("a"));

      for (const a of fallbackLinks) {
        const href = (a.getAttribute("href") || "").trim();
        const title = (a.textContent || href || "(無標題)").trim();

        if (!isValidSavableUrl(href)) continue;

        extractedItems.push({
          title,
          url: href,
          read: false
        });
      }
    }

    if (!extractedItems.length) {
      return [];
    }

    return groupTabsByCategoryAndHost(extractedItems);
  }

  function parseLegacyBackupHtml(htmlText) {
    const fromManaged = parseManagedInitialData(htmlText);
    if (fromManaged && fromManaged.length) {
      return fromManaged;
    }

    return parseHtmlByDom(htmlText);
  }

  function buildManagedHtml(groups, options = {}) {
    const exportTime = new Date().toLocaleString("zh-TW");
    const title = options.title || "Managed Tabs Backup";
    const storageKey = options.storageKey || ("tabs_manager_" + Date.now());
    const safeDataJson = JSON.stringify(groups).replace(/<\/script/gi, "<\\/script");

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
      font-family: Arial, "Microsoft JhengHei", sans-serif;
      background: #0f1115;
      color: #e8e8e8;
    }
    .wrap {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    h1 {
      margin: 0 0 10px;
      font-size: 32px;
    }
    .sub {
      color: #a9b1bd;
      margin-bottom: 20px;
      line-height: 1.6;
    }
    .toolbar {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .toolbar-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      background: #171a21;
      border: 1px solid #252b36;
      border-radius: 14px;
      padding: 12px;
    }
    .toolbar input[type="text"] {
      flex: 1;
      min-width: 240px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #353d4c;
      background: #0f1115;
      color: #fff;
      outline: none;
    }
    button {
      border: none;
      border-radius: 10px;
      padding: 10px 14px;
      cursor: pointer;
      background: #2b3342;
      color: #fff;
      font-weight: 700;
    }
    button:hover {
      opacity: 0.92;
    }
    button.primary { background: #4c7dff; }
    button.danger { background: #d84d4d; }
    button.success { background: #2f9d62; }
    button.warn { background: #c78a21; }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      color: #b7c0cd;
      font-size: 14px;
    }
    .card {
      background: #171a21;
      border: 1px solid #252b36;
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 18px;
    }
    .group-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .group-title h2 {
      margin: 0;
      color: #ffb86c;
      font-size: 26px;
      word-break: break-word;
    }
    .group-count {
      color: #9ba6b5;
      font-size: 14px;
      white-space: nowrap;
    }
    .group-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 14px;
    }
    ul.links {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    li.link-item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: start;
      padding: 12px;
      border-radius: 12px;
      background: #101319;
      border: 1px solid #212736;
      margin-bottom: 10px;
    }
    .link-main { min-width: 0; }
    .link-title-row {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }
    .link-title {
      color: #7cb7ff;
      text-decoration: none;
      font-size: 16px;
      line-height: 1.5;
      word-break: break-word;
    }
    .link-title:hover { text-decoration: underline; }
    .link-url {
      font-size: 12px;
      color: #8f9aad;
      word-break: break-all;
      line-height: 1.5;
    }
    .item-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: flex-end;
    }
    .tag {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }
    .tag.unread {
      background: #2a3a58;
      color: #9fc2ff;
    }
    .tag.read {
      background: #294534;
      color: #9ae6b1;
    }
    .empty {
      color: #98a4b6;
      text-align: center;
      padding: 40px 20px;
      background: #171a21;
      border: 1px dashed #394153;
      border-radius: 16px;
    }
    .toggle {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      color: #d4dbe6;
      font-size: 14px;
    }
    .footer-space { height: 60px; }
    @media (max-width: 720px) {
      li.link-item { grid-template-columns: 1fr; }
      .item-actions { justify-content: flex-start; }
      .group-title { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(title)}</h1>
    <div class="sub">
      備份時間：${escapeHtml(exportTime)}<br>
      已整合自動分類、去重、搜尋、已看/未看、移除、匯出整理後版本。
    </div>

    <div class="toolbar">
      <div class="toolbar-row">
        <input type="text" id="searchInput" placeholder="搜尋標題、網址、群組名稱..." />
        <label class="toggle">
          <input type="checkbox" id="showUnreadOnly" />
          只顯示未看
        </label>
        <button id="expandAllBtn">展開全部</button>
        <button id="collapseAllBtn">收合全部</button>
        <button class="danger" id="removeAllReadBtn">刪除全部已看</button>
        <button class="success" id="exportBtn">匯出整理後 HTML</button>
      </div>
      <div class="toolbar-row stats" id="stats"></div>
    </div>

    <div id="app"></div>
    <div class="footer-space"></div>
  </div>

  <script>
    const STORAGE_KEY = ${JSON.stringify(storageKey)};
    const COLLAPSE_KEY = STORAGE_KEY + "_collapse";
    const INITIAL_DATA = ${safeDataJson};

    let groups = [];
    let collapseState = {};

    function saveData() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapseState));
    }

    function loadData() {
      const raw = localStorage.getItem(STORAGE_KEY);
      const rawCollapse = localStorage.getItem(COLLAPSE_KEY);
      groups = raw ? JSON.parse(raw) : INITIAL_DATA;
      collapseState = rawCollapse ? JSON.parse(rawCollapse) : {};
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function updateStats() {
      const groupCount = groups.length;
      const itemCount = groups.reduce((sum, g) => sum + g.items.length, 0);
      const unreadCount = groups.reduce((sum, g) => sum + g.items.filter(x => !x.read).length, 0);
      const readCount = itemCount - unreadCount;

      document.getElementById("stats").innerHTML = \`
        <div>群組：<strong>\${groupCount}</strong></div>
        <div>總連結：<strong>\${itemCount}</strong></div>
        <div>未看：<strong>\${unreadCount}</strong></div>
        <div>已看：<strong>\${readCount}</strong></div>
      \`;
    }

    function removeItem(groupId, itemId) {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      group.items = group.items.filter(item => item.id !== itemId);
      groups = groups.filter(g => g.items.length > 0);
      saveData();
      render();
    }

    function toggleRead(groupId, itemId) {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      const item = group.items.find(x => x.id === itemId);
      if (!item) return;
      item.read = !item.read;
      saveData();
      render();
    }

    function markGroupRead(groupId, readValue) {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      group.items.forEach(item => item.read = readValue);
      saveData();
      render();
    }

    function removeReadItemsInGroup(groupId) {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      group.items = group.items.filter(item => !item.read);
      groups = groups.filter(g => g.items.length > 0);
      saveData();
      render();
    }

    function removeReadItemsGlobal() {
      groups.forEach(group => {
        group.items = group.items.filter(item => !item.read);
      });
      groups = groups.filter(g => g.items.length > 0);
      saveData();
      render();
    }

    function openAllUnreadInGroup(groupId) {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;
      const unreadItems = group.items.filter(item => !item.read);
      unreadItems.forEach(item => {
        window.open(item.url, "_blank", "noopener");
      });
    }

    function toggleGroupCollapse(groupId) {
      collapseState[groupId] = !collapseState[groupId];
      saveData();
      render();
    }

    function expandAll() {
      groups.forEach(g => collapseState[g.id] = false);
      saveData();
      render();
    }

    function collapseAll() {
      groups.forEach(g => collapseState[g.id] = true);
      saveData();
      render();
    }

    function exportManagedHtml() {
      const visibleData = groups.map(group => ({
        id: group.id,
        category: group.category || "",
        name: group.name,
        items: group.items
      }));

      const safeData = JSON.stringify(visibleData).replace(/<\\/script/gi, "<\\\\/script");
      const html = \`<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Managed Tabs Export</title>
<style>
body {
  margin: 0;
  font-family: Arial, "Microsoft JhengHei", sans-serif;
  background: #0f1115;
  color: #e8e8e8;
}
.wrap {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}
h1 {
  margin: 0 0 12px;
}
.meta {
  color: #9ba6b5;
  margin-bottom: 20px;
}
.group {
  background: #171a21;
  border: 1px solid #252b36;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
}
h2 {
  margin: 0 0 10px;
  color: #ffb86c;
}
ul {
  margin: 0;
  padding-left: 20px;
}
li {
  margin: 8px 0;
}
a {
  color: #7cb7ff;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}
.tag {
  display: inline-block;
  margin-left: 8px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
}
.read {
  background: #294534;
  color: #9ae6b1;
}
.unread {
  background: #2a3a58;
  color: #9fc2ff;
}
</style>
</head>
<body>
<div class="wrap">
  <h1>Managed Tabs Export</h1>
  <div class="meta">匯出時間：\${new Date().toLocaleString("zh-TW")}</div>
  \${JSON.parse(safeData).map(group => \`
    <div class="group">
      <h2>\${group.name} (\${group.items.length})</h2>
      <ul>
        \${group.items.map(item => \`
          <li>
            <a href="\${item.url}" target="_blank" rel="noopener noreferrer">\${item.title}</a>
            <span class="tag \${item.read ? "read" : "unread"}">\${item.read ? "已看" : "未看"}</span>
          </li>
        \`).join("")}
      </ul>
    </div>
  \`).join("")}
</div>
</body>
</html>\`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const now = new Date();
      const pad = n => String(n).padStart(2, "0");
      const filename =
        \`managed_tabs_\${now.getFullYear()}-\${pad(now.getMonth() + 1)}-\${pad(now.getDate())}_\` +
        \`\${pad(now.getHours())}-\${pad(now.getMinutes())}-\${pad(now.getSeconds())}.html\`;

      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    function render() {
      updateStats();

      const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
      const unreadOnly = document.getElementById("showUnreadOnly").checked;
      const app = document.getElementById("app");

      const filteredGroups = groups
        .map(group => {
          const items = group.items.filter(item => {
            if (unreadOnly && item.read) return false;
            const hay = [group.name, group.category || "", item.title, item.url].join(" ").toLowerCase();
            return !keyword || hay.includes(keyword);
          });
          return { ...group, items };
        })
        .filter(group => group.items.length > 0);

      if (!filteredGroups.length) {
        app.innerHTML = \`
          <div class="empty">
            沒有可顯示的資料。<br><br>
            你可能已經全部刪掉，或目前搜尋條件沒有匹配結果。
          </div>
        \`;
        return;
      }

      app.innerHTML = filteredGroups.map(group => {
        const isCollapsed = !!collapseState[group.id];
        const unreadCount = group.items.filter(x => !x.read).length;

        return \`
          <div class="card">
            <div class="group-title">
              <h2>\${escapeHtml(group.name)}</h2>
              <div class="group-count">共 \${group.items.length} / 未看 \${unreadCount}</div>
            </div>

            <div class="group-actions">
              <button onclick="toggleGroupCollapse('\${group.id}')">\${isCollapsed ? "展開" : "收合"}</button>
              <button class="success" onclick="markGroupRead('\${group.id}', true)">本群全標已看</button>
              <button class="warn" onclick="markGroupRead('\${group.id}', false)">本群全標未看</button>
              <button class="primary" onclick="openAllUnreadInGroup('\${group.id}')">開本群未看</button>
              <button class="danger" onclick="removeReadItemsInGroup('\${group.id}')">刪本群已看</button>
            </div>

            \${isCollapsed ? "" : \`
              <ul class="links">
                \${group.items.map(item => \`
                  <li class="link-item">
                    <div class="link-main">
                      <div class="link-title-row">
                        <a class="link-title" href="\${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">\${escapeHtml(item.title)}</a>
                        <span class="tag \${item.read ? "read" : "unread"}">\${item.read ? "已看" : "未看"}</span>
                      </div>
                      <div class="link-url">\${escapeHtml(item.url)}</div>
                    </div>

                    <div class="item-actions">
                      <button onclick="window.open('\${escapeHtml(item.url)}', '_blank', 'noopener')">開啟</button>
                      <button class="success" onclick="toggleRead('\${group.id}', '\${item.id}')">\${item.read ? "改未看" : "標已看"}</button>
                      <button class="danger" onclick="removeItem('\${group.id}', '\${item.id}')">移除</button>
                    </div>
                  </li>
                \`).join("")}
              </ul>
            \`}
          </div>
        \`;
      }).join("");
    }

    document.getElementById("searchInput").addEventListener("input", render);
    document.getElementById("showUnreadOnly").addEventListener("change", render);
    document.getElementById("expandAllBtn").addEventListener("click", expandAll);
    document.getElementById("collapseAllBtn").addEventListener("click", collapseAll);
    document.getElementById("removeAllReadBtn").addEventListener("click", removeReadItemsGlobal);
    document.getElementById("exportBtn").addEventListener("click", exportManagedHtml);

    loadData();
    render();
  </script>
</body>
</html>`;
  }

  window.TabTemplateManager = {
    normalizeUrl,
    categorizeTab,
    dedupeItems,
    groupTabsByCategoryAndHost,
    parseManagedInitialData,
    parseLegacyBackupHtml,
    buildManagedHtml
  };
})();
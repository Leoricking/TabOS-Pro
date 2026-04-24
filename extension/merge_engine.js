(function () {
    function isValidUrl(url) {
      return typeof url === "string" && /^(https?:|file:\/\/)/i.test(url.trim());
    }
  
    function normalizeUrl(rawUrl) {
      if (!isValidUrl(rawUrl)) return "";
  
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
          const lower = key.toLowerCase();
          if (lower.startsWith("utm_") || removableParams.includes(lower)) {
            url.searchParams.delete(key);
          }
        }
  
        url.hash = "";
  
        let normalized = url.toString();
        if (normalized.endsWith("?")) normalized = normalized.slice(0, -1);
        return normalized;
      } catch {
        return rawUrl.trim();
      }
    }
  
    function getHost(url) {
      try {
        return new URL(url).hostname.toLowerCase();
      } catch {
        return "";
      }
    }
  
    function containsAny(text, keywords) {
      const t = String(text || "").toLowerCase();
      return keywords.some(k => t.includes(k.toLowerCase()));
    }
  
    function autoCategory(title, url) {
      const host = getHost(url);
      const text = `${title || ""} ${url || ""}`.toLowerCase();
  
      const ai = [
        "chatgpt.com",
        "openai.com",
        "claude.ai",
        "gemini.google.com",
        "copilot.microsoft.com",
        "poe.com",
        "perplexity.ai",
        "notebooklm.google.com"
      ];
  
      const youtube = [
        "youtube.com",
        "youtu.be"
      ];
  
      const shopping = [
        "shopee",
        "momo",
        "pchome",
        "amazon",
        "taobao",
        "tmall",
        "ebay",
        "carousell",
        "蝦皮",
        "購物"
      ];
  
      const work = [
        "github.com",
        "gitlab.com",
        "docs.google.com",
        "drive.google.com",
        "sheets.google.com",
        "slides.google.com",
        "notion.so",
        "sharepoint.com",
        "onedrive.live.com",
        "office.com",
        "teams.microsoft.com",
        "mail.google.com",
        "outlook.office.com"
      ];
  
      const social = [
        "facebook.com",
        "instagram.com",
        "x.com",
        "twitter.com",
        "threads.net",
        "linkedin.com",
        "reddit.com",
        "tiktok.com"
      ];
  
      if (ai.some(h => host === h || host.endsWith("." + h))) return "AI";
      if (youtube.some(h => host === h || host.endsWith("." + h))) return "YouTube";
      if (work.some(h => host === h || host.endsWith("." + h))) return "工作";
      if (social.some(h => host === h || host.endsWith("." + h))) return "社群";
      if (host.includes("maps") || containsAny(text, ["map", "地圖", "導航", "route"])) return "地圖 / 導航";
      if (containsAny(text, shopping)) return "購物";
      return "其他";
    }
  
    function makeId() {
      return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  
    function defaultItem(item) {
      const normalized = normalizeUrl(item.url);
  
      return {
        id: item.id || makeId(),
        title: item.title || normalized || "(無標題)",
        url: normalized,
        read: !!item.read,
        status: item.status || "待看",
        priority: item.priority || "P3",
        tags: Array.isArray(item.tags) ? item.tags : [],
        category: item.category || autoCategory(item.title, normalized),
        source: item.source || "OLD"
      };
    }
  
    function flattenGroups(groups) {
      const result = [];
  
      for (const group of groups || []) {
        for (const item of group.items || []) {
          result.push({
            ...item,
            category: item.category || group.category || "",
            groupName: group.name || ""
          });
        }
      }
  
      return result;
    }
  
    function mergeOldGroupsWithCurrentTabs(oldGroups, currentTabs) {
      const map = new Map();
  
      const oldItems = flattenGroups(oldGroups);
  
      for (const item of oldItems) {
        const normalized = normalizeUrl(item.url);
        if (!normalized) continue;
  
        map.set(normalized, {
          ...defaultItem(item),
          source: "OLD"
        });
      }
  
      for (const tab of currentTabs || []) {
        const normalized = normalizeUrl(tab.url);
        if (!normalized) continue;
  
        if (map.has(normalized)) {
          const old = map.get(normalized);
          map.set(normalized, {
            ...old,
            title: old.title || tab.title || normalized,
            source: "UNCHANGED"
          });
        } else {
          map.set(normalized, {
            id: makeId(),
            title: tab.title || normalized,
            url: normalized,
            read: false,
            status: "待看",
            priority: "P3",
            tags: [],
            category: autoCategory(tab.title, normalized),
            source: "NEW"
          });
        }
      }
  
      return Array.from(map.values());
    }
  
    function groupItems(items) {
      const order = ["AI", "YouTube", "購物", "工作", "社群", "地圖 / 導航", "其他"];
      const map = new Map();
  
      for (const item of items || []) {
        const normalized = normalizeUrl(item.url);
        if (!normalized) continue;
  
        const category = item.category || autoCategory(item.title, normalized);
        const host = getHost(normalized) || "unknown";
        const groupName = `${category} / ${host}`;
  
        if (!map.has(groupName)) {
          map.set(groupName, {
            id: makeId(),
            name: groupName,
            category,
            items: []
          });
        }
  
        map.get(groupName).items.push({
          ...defaultItem({
            ...item,
            url: normalized,
            category
          })
        });
      }
  
      const groups = Array.from(map.values());
  
      groups.sort((a, b) => {
        const ai = order.indexOf(a.category);
        const bi = order.indexOf(b.category);
        if (ai !== bi) return ai - bi;
        return a.name.localeCompare(b.name);
      });
  
      return groups;
    }
  
    window.TabOSMergeEngine = {
      normalizeUrl,
      autoCategory,
      mergeOldGroupsWithCurrentTabs,
      groupItems
    };
  })();
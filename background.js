function isClosableNormalTab(url) {
  if (typeof url !== "string") return false;

  const blockedPrefixes = [
    "opera://",
    "chrome://",
    "chrome-extension://",
    "opera-extension://",
    "about:"
  ];

  return !blockedPrefixes.some(prefix => url.startsWith(prefix));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === "GET_ALL_TABS") {
        const tabs = await chrome.tabs.query({});

        const safeTabs = tabs.map(tab => ({
          id: tab.id,
          title: tab.title || tab.url || "(無標題)",
          url: tab.url || ""
        }));

        sendResponse({
          success: true,
          tabs: safeTabs
        });
        return;
      }

      if (message.action === "CLOSE_NORMAL_TABS") {
        const tabs = await chrome.tabs.query({});
        const closableIds = tabs
          .filter(tab => isClosableNormalTab(tab.url))
          .map(tab => tab.id)
          .filter(id => typeof id === "number");

        if (closableIds.length > 0) {
          await chrome.tabs.remove(closableIds);
        }

        sendResponse({
          success: true,
          closedCount: closableIds.length
        });
        return;
      }

      sendResponse({
        success: false,
        error: "未知指令"
      });
    } catch (error) {
      console.error(error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  })();

  return true;
});
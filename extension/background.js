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
              windowId: tab.windowId
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
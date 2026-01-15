// Background service worker for the Chrome extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('Bookmark Orchestrator extension installed');
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({
          url: tabs[0].url,
          title: tabs[0].title,
        });
      }
    });
    return true; // Keep the message channel open for async response
  }
});

// Optional: Add context menu for quick bookmark saving
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'save-bookmark',
    title: 'Save to Bookmark Orchestrator',
    contexts: ['page', 'link'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'save-bookmark') {
    // Open popup or handle saving directly
    console.log('Context menu clicked:', info.linkUrl || tab?.url);
  }
});

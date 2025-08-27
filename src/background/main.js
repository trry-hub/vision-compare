// Background script for Vision Check extension
chrome.commands.onCommand.addListener((command) => {
  // 向当前活动标签页的 content script 转发命令
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs?.[0]?.id;
    if (!tabId) return;
    chrome.tabs.sendMessage(tabId, { action: 'command', command });
  });
});

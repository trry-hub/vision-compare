// Background script for Vision Check extension

// 处理快捷键命令
chrome.commands.onCommand.addListener((command: string) => {
  // 向当前活动标签页的 content script 转发命令
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs?.[0]?.id
    if (!tabId) return
    
    chrome.tabs.sendMessage(tabId, { action: 'command', command }).catch(() => {
      // Failed to send command to content script
    })
  })
})

// 扩展安装时的处理
chrome.runtime.onInstalled.addListener(() => {
  // Vision Check extension installed
})

// 处理扩展图标点击（如果需要的话）
chrome.action.onClicked?.addListener((_tab) => {
  // Extension icon clicked
})

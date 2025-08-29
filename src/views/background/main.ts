// Background script for Vision Compare extension

// Chrome API 类型声明
declare const chrome: {
  commands: {
    onCommand: {
      addListener: (callback: (command: string) => void) => void
    }
  }
  tabs: {
    query: (queryInfo: { active?: boolean, currentWindow?: boolean }, callback: (tabs: Array<{ id?: number }>) => void) => void
    sendMessage: (tabId: number, message: any) => Promise<any>
  }
  runtime: {
    onInstalled: {
      addListener: (callback: () => void) => void
    }
  }
  action: {
    onClicked?: {
      addListener: (callback: (tab: any) => void) => void
    }
  }
}

// 处理快捷键命令
chrome.commands.onCommand.addListener((command: string) => {
  // 向当前活动标签页的 content script 转发命令
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs?.[0]?.id
    if (!tabId) {
      return
    }

    chrome.tabs.sendMessage(tabId, { action: 'command', command }).catch(() => {
      // Failed to send command to content script
    })
  })
})

// 扩展安装时的处理
chrome.runtime.onInstalled.addListener(() => {
  // Vision Compare extension installed
})

// 处理扩展图标点击（如果需要的话）
chrome.action.onClicked?.addListener((_tab) => {
  // Extension icon clicked
})

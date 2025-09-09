// Background script for Vision Compare extension
console.log('Vision Compare Service Worker started')

// Chrome API 类型声明
declare const chrome: {
  commands: {
    onCommand: {
      addListener: (callback: (command: string) => void) => void
    }
  }
  tabs: {
    query: (queryInfo: { active?: boolean, currentWindow?: boolean }, callback: (tabs: Array<{ id?: number, url?: string }>) => void) => void
    sendMessage: (tabId: number, message: any) => Promise<any>
  }
  runtime: {
    onInstalled: {
      addListener: (callback: (details: { reason: string }) => void) => void
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
  console.log('Command received:', command)

  // 向当前活动标签页的 content script 转发命令
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0]
    const tabId = tab?.id
    if (!tabId) {
      console.error('No active tab found')
      return
    }

    // 检查页面是否支持（content script 只会在 http/https 页面自动注入）
    if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
      console.error('Page not supported for extension')
      return
    }

    console.log('Sending command to tab:', tabId)
    chrome.tabs.sendMessage(tabId, { action: 'command', command }).catch((error) => {
      console.error('Failed to send command to content script:', error)
    })
  })
})

// 扩展安装时的处理
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Vision Compare extension installed:', details.reason)
})

// 处理扩展图标点击（如果需要的话）
if (chrome.action?.onClicked) {
  chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked for tab:', tab.id)
  })
}

// 全局错误处理
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error)
})

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason)
})

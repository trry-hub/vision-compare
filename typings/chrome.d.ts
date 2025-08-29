/**
 * Chrome 扩展 API 类型声明
 */

declare global {
  interface Window {
    chrome: typeof chrome
  }
}

declare namespace chrome {
  namespace runtime {
    interface Port {
      name: string
      disconnect: () => void
      onDisconnect: chrome.events.Event<(port: Port) => void>
      onMessage: chrome.events.Event<(message: any, port: Port) => void>
      postMessage: (message: any) => void
      sender?: chrome.runtime.MessageSender
    }

    interface MessageSender {
      tab?: chrome.tabs.Tab
      frameId?: number
      id?: string
      url?: string
      tlsChannelId?: string
    }

    const onMessage: chrome.events.Event<
      (message: any, sender: MessageSender, sendResponse: (response?: any) => void) => boolean | void
    >

    function sendMessage(message: any): Promise<any>
    function sendMessage(extensionId: string, message: any): Promise<any>
    function sendMessage(message: any, responseCallback: (response: any) => void): void
    function sendMessage(extensionId: string, message: any, responseCallback: (response: any) => void): void

    const onInstalled: chrome.events.Event<(details: { reason: string }) => void>
  }

  namespace tabs {
    interface Tab {
      id?: number
      index: number
      windowId: number
      highlighted: boolean
      active: boolean
      pinned: boolean
      url?: string
      title?: string
      favIconUrl?: string
      status?: string
      incognito: boolean
      width?: number
      height?: number
      sessionId?: string
    }

    function query(queryInfo: {
      active?: boolean
      currentWindow?: boolean
      highlighted?: boolean
      pinned?: boolean
      status?: string
      title?: string
      url?: string | string[]
      windowId?: number
      windowType?: string
    }): Promise<Tab[]>

    function sendMessage(tabId: number, message: any): Promise<any>
    function sendMessage(tabId: number, message: any, responseCallback: (response: any) => void): void
  }

  namespace action {
    const onClicked: chrome.events.Event<(tab: chrome.tabs.Tab) => void>
  }

  namespace commands {
    const onCommand: chrome.events.Event<(command: string) => void>
  }

  namespace events {
    interface Event<T extends (...args: any[]) => void> {
      addListener: (callback: T) => void
      removeListener: (callback: T) => void
      hasListener: (callback: T) => boolean
    }
  }
}

export {}

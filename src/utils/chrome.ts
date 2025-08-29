/**
 * Chrome 扩展相关工具函数
 */

import { isPageSupported, sleep } from './helpers'

// 定义 Tab 类型
export interface ChromeTab {
  id?: number
  url?: string
}

// Chrome 消息类型
export interface ChromeMessage {
  action: string
  [key: string]: any
}

// Chrome API 类型声明
declare const chrome: {
  tabs: {
    query: (queryInfo: { active?: boolean, currentWindow?: boolean }, callback: (tabs: ChromeTab[]) => void) => void
    sendMessage: (tabId: number, message: any, callback?: (response: any) => void) => void
  }
  runtime: {
    lastError?: {
      message: string
    }
  }
}

/**
 * Chrome 扩展工具类
 */
export class ChromeExtensionUtils {
  /**
   * 获取当前活动标签页
   */
  static async getCurrentTab(): Promise<ChromeTab | null> {
    return new Promise((resolve) => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          resolve(tabs[0] || null)
        })
      }
      catch (error) {
        console.error('获取当前标签页失败:', error)
        resolve(null)
      }
    })
  }

  /**
   * 发送消息到 content script
   */
  static async sendMessageToContentScript(
    tabId: number,
    message: ChromeMessage,
    timeout: number = 10000,
  ): Promise<any> {
    return Promise.race([
      new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          }
          else {
            resolve(response)
          }
        })
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('消息发送超时')), timeout),
      ),
    ])
  }

  /**
   * 检查 content script 是否就绪
   */
  static async waitForContentScript(
    tabId: number,
    maxRetries: number = 15,
    retryInterval: number = 500,
  ): Promise<boolean> {
    let retries = 0

    while (retries < maxRetries) {
      try {
        const response = await this.sendMessageToContentScript(tabId, { action: 'ping' }, 2000)
        if (response?.status === 'ready') {
          return true
        }
      }
      catch {
        console.log(`Content script 未就绪，重试 ${retries + 1}/${maxRetries}`)
      }

      await sleep(retryInterval)
      retries++
    }

    return false
  }

  /**
   * 验证标签页是否支持扩展功能
   */
  static validateTab(tab: ChromeTab | null): { valid: boolean, error?: string } {
    if (!tab?.id) {
      return { valid: false, error: '未找到活动标签页' }
    }

    if (!tab.url) {
      return { valid: false, error: '无法获取页面URL' }
    }

    if (!isPageSupported(tab.url)) {
      return { valid: false, error: '当前页面不支持扩展功能' }
    }

    return { valid: true }
  }

  /**
   * 安全地向标签页发送消息
   */
  static async safelyExecuteOnTab(
    tabId: number,
    action: string,
    data?: any,
    options: {
      timeout?: number
      waitForReady?: boolean
      maxRetries?: number
    } = {},
  ): Promise<{ success: boolean, data?: any, error?: string }> {
    const { timeout = 10000, waitForReady = true, maxRetries = 3 } = options

    try {
      // 如果需要等待 content script 就绪
      if (waitForReady) {
        const isReady = await this.waitForContentScript(tabId, maxRetries)
        if (!isReady) {
          return { success: false, error: 'Content script 未就绪' }
        }
      }

      // 发送消息
      const response = await this.sendMessageToContentScript(
        tabId,
        { action, ...data },
        timeout,
      )

      return { success: true, data: response }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      return { success: false, error: errorMessage }
    }
  }
}

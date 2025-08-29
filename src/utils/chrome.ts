/**
 * Chrome 扩展相关工具函数
 */

import { isPageSupported, sleep } from './helpers'

/**
 * Chrome 消息类型
 */
export interface ChromeMessage {
  action: string
  [key: string]: any
}

/**
 * Chrome 扩展工具类
 */
export class ChromeExtensionUtils {
  /**
   * 获取当前活动标签页
   */
  static async getCurrentTab(): Promise<chrome.tabs.Tab | null> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      return tab || null
    } catch (error) {
      console.error('获取当前标签页失败:', error)
      return null
    }
  }

  /**
   * 发送消息到 content script
   */
  static async sendMessageToContentScript(
    tabId: number,
    message: ChromeMessage,
    timeout: number = 10000
  ): Promise<any> {
    return Promise.race([
      chrome.tabs.sendMessage(tabId, message),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('消息发送超时')), timeout)
      )
    ])
  }

  /**
   * 检查 content script 是否就绪
   */
  static async waitForContentScript(
    tabId: number,
    maxRetries: number = 15,
    retryInterval: number = 500
  ): Promise<boolean> {
    let retries = 0

    while (retries < maxRetries) {
      try {
        console.log(`尝试连接 content script (${retries + 1}/${maxRetries})...`)
        const response = await this.sendMessageToContentScript(tabId, { action: 'ping' })
        
        if (response?.success) {
          console.log('Content script 连接成功')
          return true
        }
      } catch (error) {
        console.log('Content script 未就绪，等待中...', error)
      }

      retries++
      await sleep(retryInterval)
    }

    return false
  }

  /**
   * 验证标签页是否支持扩展功能
   */
  static validateTab(tab: chrome.tabs.Tab | null): { valid: boolean; error?: string } {
    if (!tab?.id) {
      return { valid: false, error: '未找到活动标签页' }
    }

    if (!isPageSupported(tab.url)) {
      return {
        valid: false,
        error: '当前页面不支持扩展功能，请在普通网页中使用'
      }
    }

    return { valid: true }
  }

  /**
   * 上传图片到 content script
   */
  static async uploadImageToContentScript(imageData: string): Promise<void> {
    const tab = await this.getCurrentTab()
    const validation = this.validateTab(tab)
    
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const tabId = tab!.id!
    
    // 等待 content script 就绪
    const isReady = await this.waitForContentScript(tabId)
    if (!isReady) {
      throw new Error('内容脚本加载失败，请刷新页面后重试。如果问题持续存在，请检查页面是否阻止了扩展脚本运行。')
    }

    // 发送图片数据
    console.log('开始发送图片数据...')
    const response = await this.sendMessageToContentScript(tabId, {
      action: 'uploadImage',
      imageData
    })

    if (!response?.success) {
      throw new Error(response?.error || '图片上传失败，请重试')
    }
  }

  /**
   * 发送退出消息
   */
  static async exitComparison(): Promise<void> {
    try {
      const tab = await this.getCurrentTab()
      if (tab?.id) {
        await this.sendMessageToContentScript(tab.id, { action: 'exit' })
      }
    } catch (error) {
      console.error('发送退出消息失败:', error)
    }
  }

  /**
   * 检查扩展状态
   */
  static async checkExtensionStatus(): Promise<{ isActive: boolean; toolbarVisible: boolean }> {
    try {
      const tab = await this.getCurrentTab()
      if (!tab?.id) {
        return { isActive: false, toolbarVisible: false }
      }

      const response = await this.sendMessageToContentScript(tab.id, { action: 'checkStatus' })
      return {
        isActive: response?.isActive || false,
        toolbarVisible: response?.toolbarVisible || false
      }
    } catch (error) {
      console.error('检查扩展状态失败:', error)
      return { isActive: false, toolbarVisible: false }
    }
  }
}

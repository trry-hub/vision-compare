/**
 * 消息服务
 * 封装 Chrome 扩展的消息通信
 */
import { MessageRequest, MessageResponse } from '../../typings'

export class MessageService {
  private static instance: MessageService
  private listeners: Map<string, (message: MessageRequest) => Promise<MessageResponse>> = new Map()

  private constructor() {
    this.initializeListener()
  }

  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService()
    }
    return MessageService.instance
  }

  /**
   * 初始化消息监听器
   */
  private initializeListener(): void {
    chrome.runtime.onMessage.addListener(
      (message: MessageRequest, _sender, sendResponse: (response: MessageResponse) => void) => {
        this.handleMessage(message)
          .then(response => sendResponse(response))
          .catch(error => sendResponse({ success: false, error: error.message }))

        return true // 保持消息通道开放
      }
    )
  }

  /**
   * 处理消息
   */
  private async handleMessage(message: MessageRequest): Promise<MessageResponse> {
    const handler = this.listeners.get(message.action)
    
    if (handler) {
      return await handler(message)
    }

    return { success: false, error: 'Unknown action' }
  }

  /**
   * 注册消息处理器
   */
  registerHandler(
    action: string,
    handler: (message: MessageRequest) => Promise<MessageResponse>
  ): void {
    this.listeners.set(action, handler)
  }

  /**
   * 注销消息处理器
   */
  unregisterHandler(action: string): void {
    this.listeners.delete(action)
  }

  /**
   * 发送消息到后台脚本
   */
  static async sendToBackground(message: MessageRequest): Promise<MessageResponse> {
    try {
      return await chrome.runtime.sendMessage(message)
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * 发送消息到内容脚本
   */
  static async sendToContent(
    tabId: number,
    message: MessageRequest
  ): Promise<MessageResponse> {
    try {
      return await chrome.tabs.sendMessage(tabId, message)
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * 获取当前活动标签页
   */
  static async getCurrentTab(): Promise<chrome.tabs.Tab | null> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      return tab || null
    } catch (error) {
      console.warn('Failed to get current tab:', error)
      return null
    }
  }

  /**
   * 向当前活动标签页发送消息
   */
  static async sendToCurrentTab(message: MessageRequest): Promise<MessageResponse> {
    const tab = await this.getCurrentTab()
    if (!tab?.id) {
      return { success: false, error: 'No active tab found' }
    }

    return this.sendToContent(tab.id, message)
  }

  /**
   * 创建标准响应
   */
  static createResponse(
    success: boolean,
    data?: any,
    error?: string
  ): MessageResponse {
    return {
      success,
      error,
      ...data
    }
  }

  /**
   * 创建成功响应
   */
  static createSuccessResponse(data?: any): MessageResponse {
    return this.createResponse(true, data)
  }

  /**
   * 创建错误响应
   */
  static createErrorResponse(error: string): MessageResponse {
    return this.createResponse(false, undefined, error)
  }
}

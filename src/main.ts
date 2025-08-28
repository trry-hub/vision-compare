/**
 * Vision Compare 主入口文件
 * 
 * 这个文件作为整个扩展的主入口，负责：
 * 1. 导出核心模块
 * 2. 提供统一的类型定义
 * 3. 管理全局配置
 */

// 导出类型定义
export interface VisionCheckConfig {
  version: string
  name: string
  defaultOpacity: number
  defaultPosition: { x: number; y: number }
  defaultSize: { width: number; height: number }
  maxImageSize: number
  supportedFormats: string[]
}

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface VisionCheckState {
  visible: boolean
  frozen: boolean
  toolbarVisible: boolean
  opacity: number
  blendMode: string
  position: Position
  size: Size
  originalSize: Size
  toolbarPosition: Position
  handlesVisible: boolean
}

export interface MessageRequest {
  action: string
  imageData?: string
  command?: string
}

export interface MessageResponse {
  success?: boolean
  isActive?: boolean
  toolbarVisible?: boolean
  error?: string
}

// 扩展配置
export const VISION_CHECK_CONFIG: VisionCheckConfig = {
  version: '2.0.0',
  name: 'Vision Compare（你的眼睛不是尺）',
  defaultOpacity: 50,
  defaultPosition: { x: 100, y: 100 },
  defaultSize: { width: 300, height: 200 },
  maxImageSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
}

// 常量定义
export const STORAGE_KEY_PREFIX = 'vision-compare-'
export const EXTENSION_ID = 'vision-compare-app'
export const Z_INDEX_BASE = 999999998

// 工具函数
export const utils = {
  /**
   * 生成存储键名
   */
  getStorageKey: (hostname: string): string => {
    return `${STORAGE_KEY_PREFIX}${hostname}`
  },

  /**
   * 检查文件类型是否支持
   */
  isSupportedImageType: (type: string): boolean => {
    return VISION_CHECK_CONFIG.supportedFormats.includes(type)
  },

  /**
   * 检查文件大小是否在限制内
   */
  isValidFileSize: (size: number): boolean => {
    return size <= VISION_CHECK_CONFIG.maxImageSize
  },

  /**
   * 格式化文件大小
   */
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * 防抖函数
   */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(null, args), wait)
    }
  },

  /**
   * 节流函数
   */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(null, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }
}

// 错误类定义
export class VisionCheckError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'VisionCheckError'
  }
}

// 日志工具（生产环境下禁用）
export const logger = {
  info: (_message: string, ..._args: any[]) => {
    // Disabled in production
  },

  warn: (_message: string, ..._args: any[]) => {
    // Disabled in production
  },

  error: (_message: string, ..._args: any[]) => {
    // Disabled in production
  }
}

export default {
  config: VISION_CHECK_CONFIG,
  utils,
  logger,
  VisionCheckError
}

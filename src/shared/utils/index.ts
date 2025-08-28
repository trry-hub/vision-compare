/**
 * 工具类统一导出
 */
export { StorageManager } from './storage-manager'
export { EventHandler } from './event-handler'
export { DOMUtils } from './dom-utils'
export { StateManager } from './state-manager'

/**
 * 常用工具函数
 */
export const Utils = {
  /**
   * 延迟执行
   */
  delay: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * 生成唯一ID
   */
  generateId: (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  /**
   * 深拷贝对象
   */
  deepClone: <T>(obj: T): T => JSON.parse(JSON.stringify(obj)),

  /**
   * 检查是否为空值
   */
  isEmpty: (value: any): boolean => {
    if (value == null) return true
    if (typeof value === 'string') return value.trim() === ''
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value).length === 0
    return false
  },

  /**
   * 限制数值范围
   */
  clamp: (value: number, min: number, max: number): number => {
    return Math.min(Math.max(value, min), max)
  },

  /**
   * 格式化数字
   */
  formatNumber: (num: number, decimals = 0): string => {
    return num.toFixed(decimals)
  },

  /**
   * 安全的JSON解析
   */
  safeJsonParse: <T>(str: string, defaultValue: T): T => {
    try {
      return JSON.parse(str)
    } catch {
      return defaultValue
    }
  },

  /**
   * 安全的JSON字符串化
   */
  safeJsonStringify: (obj: any, defaultValue = '{}'): string => {
    try {
      return JSON.stringify(obj)
    } catch {
      return defaultValue
    }
  },

  /**
   * 检查是否为有效的URL
   */
  isValidUrl: (str: string): boolean => {
    try {
      new URL(str)
      return true
    } catch {
      return false
    }
  },

  /**
   * 获取文件扩展名
   */
  getFileExtension: (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
  },

  /**
   * 首字母大写
   */
  capitalize: (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  },

  /**
   * 驼峰转短横线
   */
  camelToKebab: (str: string): string => {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase()
  },

  /**
   * 短横线转驼峰
   */
  kebabToCamel: (str: string): string => {
    return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
  }
}

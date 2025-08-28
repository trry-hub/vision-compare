/**
 * 存储管理工具类
 * 统一管理 sessionStorage 的操作，避免重复代码
 */
export class StorageManager {
  /**
   * 通用存储操作
   */
  static saveToStorage(
    keyName: string,
    keyPrefix: string,
    data: any,
    useReusableKey = true
  ): void {
    try {
      let stateKey: string

      if (useReusableKey) {
        // 检查是否已有现有的键，如果有就重用
        stateKey = sessionStorage.getItem(keyName) || ''
        if (!stateKey) {
          stateKey = `${keyPrefix}-${window.location.href}-${Date.now()}`
          sessionStorage.setItem(keyName, stateKey)
        }
      } else {
        // 使用固定键
        stateKey = `${keyPrefix}-${window.location.href}`
      }

      sessionStorage.setItem(stateKey, JSON.stringify(data))
    } catch (error) {
      console.warn('Storage save failed:', error)
    }
  }

  /**
   * 通用清理操作
   */
  static clearFromStorage(keyName: string): void {
    try {
      const stateKey = sessionStorage.getItem(keyName)
      if (stateKey) {
        sessionStorage.removeItem(stateKey)
        sessionStorage.removeItem(keyName)
      }
    } catch (error) {
      console.warn('Storage clear failed:', error)
    }
  }

  /**
   * 通用加载操作
   */
  static loadFromStorage<T>(
    keyName: string,
    validator?: (data: any) => boolean
  ): T | null {
    try {
      const currentKey = sessionStorage.getItem(keyName)
      if (!currentKey) return null

      const savedStateStr = sessionStorage.getItem(currentKey)
      if (!savedStateStr) return null

      const savedState = JSON.parse(savedStateStr)

      // 如果提供了验证器，则验证数据
      if (validator && !validator(savedState)) {
        return null
      }

      return savedState
    } catch (error) {
      console.warn('Storage load failed:', error)
      return null
    }
  }

  /**
   * 直接存储到固定键
   */
  static saveToFixedKey(key: string, data: any): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.warn('Fixed key storage save failed:', error)
    }
  }

  /**
   * 从固定键加载
   */
  static loadFromFixedKey<T>(key: string): T | null {
    try {
      const savedStateStr = sessionStorage.getItem(key)
      if (!savedStateStr) return null

      return JSON.parse(savedStateStr)
    } catch (error) {
      console.warn('Fixed key storage load failed:', error)
      return null
    }
  }

  /**
   * 移除固定键
   */
  static removeFixedKey(key: string): void {
    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      console.warn('Fixed key storage remove failed:', error)
    }
  }
}

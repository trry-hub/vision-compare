/**
 * 统一存储管理工具
 */

// 存储键名常量
export const STORAGE_KEYS = {
  STATE: 'vision-compare-state',
  FROZEN: 'vision-compare-frozen'
} as const

// 状态接口定义
export interface VisionCompareState {
  isActive: boolean
  imageData: string
  controllerVisible: boolean
  controllerExpanded: boolean
  imageVisible: boolean
  imageLocked: boolean
  imageFrozen: boolean
  opacity: number
  position: { x: number; y: number }
  rotation: number
  aspectRatioLocked: boolean
  positionMode: string
  positionInputs: { top: number; left: number; right: number; bottom: number }
  blendMode: string
}

export interface FrozenState extends VisionCompareState {
  size: { width: number; height: number }
  originalSize: { width: number; height: number }
  timestamp: number
  url: string
}

/**
 * 存储管理器
 */
export class StorageManager {
  /**
   * 获取完整状态
   */
  static getState(): Partial<VisionCompareState> {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.STATE)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('读取状态失败:', error)
      return {}
    }
  }

  /**
   * 保存完整状态
   */
  static setState(state: Partial<VisionCompareState>): void {
    try {
      sessionStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state))
    } catch (error) {
      console.error('保存状态失败:', error)
    }
  }

  /**
   * 更新部分状态
   */
  static updateState(updates: Partial<VisionCompareState>): void {
    const currentState = this.getState()
    const newState = { ...currentState, ...updates }
    this.setState(newState)
  }

  /**
   * 获取冻结状态
   */
  static getFrozenState(): FrozenState | null {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.FROZEN)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('读取冻结状态失败:', error)
      return null
    }
  }

  /**
   * 保存冻结状态
   */
  static setFrozenState(state: FrozenState | null): void {
    try {
      if (state === null) {
        sessionStorage.removeItem(STORAGE_KEYS.FROZEN)
      } else {
        sessionStorage.setItem(STORAGE_KEYS.FROZEN, JSON.stringify(state))
      }
    } catch (error) {
      console.error('保存冻结状态失败:', error)
    }
  }

  /**
   * 清理所有状态
   */
  static clearAll(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEYS.STATE)
      sessionStorage.removeItem(STORAGE_KEYS.FROZEN)
      console.log('所有状态已清理')
    } catch (error) {
      console.error('清理状态失败:', error)
    }
  }
}

/**
 * 默认状态值
 */
export const DEFAULT_STATE: VisionCompareState = {
  isActive: false,
  imageData: '',
  controllerVisible: true,
  controllerExpanded: false,
  imageVisible: true,
  imageLocked: false,
  imageFrozen: false,
  opacity: 50,
  position: { x: 0, y: 0 },
  rotation: 0,
  aspectRatioLocked: true,
  positionMode: 'top-left',
  positionInputs: { top: 0, left: 0, right: 0, bottom: 0 },
  blendMode: 'normal'
}

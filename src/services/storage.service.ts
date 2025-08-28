/**
 * 存储服务
 * 封装所有存储相关的操作
 */
import { StorageManager } from '../shared/utils'
import { AppConfig } from '../config/app.config'
import { VisionState, StorageData } from '../../typings'

export class StorageService {
  private static instance: StorageService
  private readonly config = AppConfig.storage

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService()
    }
    return StorageService.instance
  }

  /**
   * 保存锁定状态
   */
  saveLocked(state: VisionState, imageData: string): void {
    const data: StorageData = {
      ...state,
      imageData,
      timestamp: Date.now()
    }

    StorageManager.saveToStorage(
      this.config.keys.locked,
      this.config.prefixes.locked,
      data
    )
  }

  /**
   * 加载锁定状态
   */
  loadLocked(): StorageData | null {
    return StorageManager.loadFromStorage<StorageData>(
      this.config.keys.locked,
      (data) => data && data.imageData && data.frozen
    )
  }

  /**
   * 清除锁定状态
   */
  clearLocked(): void {
    StorageManager.clearFromStorage(this.config.keys.locked)
  }

  /**
   * 保存冻结状态
   */
  saveFreezed(state: VisionState, imageData: string): void {
    const data: StorageData = {
      ...state,
      imageData,
      timestamp: Date.now()
    }

    StorageManager.saveToStorage(
      this.config.keys.freezed,
      this.config.prefixes.freezed,
      data
    )
  }

  /**
   * 加载冻结状态
   */
  loadFreezed(): StorageData | null {
    return StorageManager.loadFromStorage<StorageData>(
      this.config.keys.freezed,
      (data) => data && data.imageData && data.freezed
    )
  }

  /**
   * 清除冻结状态
   */
  clearFreezed(): void {
    StorageManager.clearFromStorage(this.config.keys.freezed)
  }

  /**
   * 保存临时状态
   */
  saveTemp(state: VisionState, imageData: string): void {
    const data: StorageData = {
      ...state,
      imageData,
      timestamp: Date.now()
    }

    const key = `${this.config.prefixes.temp}-${window.location.href}`
    StorageManager.saveToFixedKey(key, data)
  }

  /**
   * 加载临时状态
   */
  loadTemp(): StorageData | null {
    const key = `${this.config.prefixes.temp}-${window.location.href}`
    return StorageManager.loadFromFixedKey<StorageData>(key)
  }

  /**
   * 清除临时状态
   */
  clearTemp(): void {
    const key = `${this.config.prefixes.temp}-${window.location.href}`
    StorageManager.removeFixedKey(key)
  }

  /**
   * 清除所有状态
   */
  clearAll(): void {
    this.clearLocked()
    this.clearFreezed()
    this.clearTemp()
  }

  /**
   * 检查状态是否匹配图片
   */
  isStateMatchingImage(state: StorageData | null, imageData: string): boolean {
    return state?.imageData === imageData
  }
}

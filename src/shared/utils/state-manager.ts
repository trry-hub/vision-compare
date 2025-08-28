/**
 * 状态管理工具类
 * 提供通用的状态管理方法
 */
export class StateManager<T extends Record<string, any>> {
  private state: T
  private listeners: Array<(state: T, changedKeys: (keyof T)[]) => void> = []

  constructor(initialState: T) {
    this.state = { ...initialState }
  }

  /**
   * 获取当前状态
   */
  getState(): T {
    return { ...this.state }
  }

  /**
   * 获取特定属性值
   */
  get<K extends keyof T>(key: K): T[K] {
    return this.state[key]
  }

  /**
   * 设置单个属性
   */
  set<K extends keyof T>(key: K, value: T[K]): void {
    if (this.state[key] !== value) {
      ;(this.state as any)[key] = value
      this.notifyListeners([key])
    }
  }

  /**
   * 批量更新状态
   */
  update(updates: Partial<T>): void {
    const changedKeys: (keyof T)[] = []

    Object.entries(updates).forEach(([key, value]) => {
      if (this.state[key] !== value) {
        ;(this.state as any)[key] = value
        changedKeys.push(key)
      }
    })

    if (changedKeys.length > 0) {
      this.notifyListeners(changedKeys)
    }
  }

  /**
   * 切换布尔值属性
   */
  toggle<K extends keyof T>(key: K): void {
    if (typeof this.state[key] === 'boolean') {
      ;(this.state as any)[key] = !this.state[key]
      this.notifyListeners([key])
    }
  }

  /**
   * 重置状态
   */
  reset(newState: T): void {
    const changedKeys = Object.keys(this.state) as (keyof T)[]
    this.state = { ...newState }
    this.notifyListeners(changedKeys)
  }

  /**
   * 添加状态变化监听器
   */
  subscribe(listener: (state: T, changedKeys: (keyof T)[]) => void): () => void {
    this.listeners.push(listener)

    // 返回取消订阅函数
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(changedKeys: (keyof T)[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState(), changedKeys)
      } catch (error) {
        console.warn('State listener error:', error)
      }
    })
  }

  /**
   * 创建状态的深拷贝
   */
  clone(): T {
    return JSON.parse(JSON.stringify(this.state))
  }

  /**
   * 比较两个状态对象
   */
  static isEqual<T>(state1: T, state2: T): boolean {
    return JSON.stringify(state1) === JSON.stringify(state2)
  }

  /**
   * 合并状态对象
   */
  static merge<T extends Record<string, any>>(
    target: T,
    ...sources: Partial<T>[]
  ): T {
    return Object.assign({}, target, ...sources)
  }
}

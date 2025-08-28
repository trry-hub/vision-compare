/**
 * 事件处理工具类
 * 提供通用的事件处理方法，减少重复代码
 */
export class EventHandler {
  /**
   * 批量绑定按钮事件
   */
  static bindButtons(
    container: HTMLElement | null,
    buttonConfigs: Array<{
      id: string
      action: () => void
      options?: {
        checkFrozen?: boolean
        frozenState?: () => boolean
      }
    }>
  ): void {
    if (!container) return

    buttonConfigs.forEach(({ id, action, options }) => {
      const button = container.querySelector(id)
      if (!button) return

      const handler = options?.checkFrozen
        ? () => {
            if (options.frozenState?.() === true) return
            action()
          }
        : action

      button.addEventListener('click', handler)
    })
  }

  /**
   * 批量绑定输入框事件
   */
  static bindInputs(
    container: HTMLElement | null,
    inputConfigs: Array<{
      id: string
      updateFn: (value: number) => void
      options?: {
        checkFrozen?: boolean
        frozenState?: () => boolean
        allowEmpty?: boolean
        minValue?: number
      }
    }>
  ): void {
    if (!container) return

    inputConfigs.forEach(({ id, updateFn, options }) => {
      const input = container.querySelector(id) as HTMLInputElement
      if (!input) return

      const handler = (e: Event) => {
        if (options?.checkFrozen && options.frozenState?.() === true) return

        const value = (e.target as HTMLInputElement).value
        if (options?.allowEmpty && value === '') return

        const numValue = parseInt(value) || 0
        const finalValue = options?.minValue ? Math.max(options.minValue, numValue) : numValue

        updateFn(finalValue)
      }

      input.addEventListener('input', handler)
    })
  }

  /**
   * 防抖函数
   */
  static debounce<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: number | null = null

    return (...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = window.setTimeout(() => {
        func(...args)
        timeoutId = null
      }, delay)
    }
  }

  /**
   * 安全的DOM查询
   */
  static querySelector<T extends HTMLElement>(
    container: HTMLElement | null,
    selector: string
  ): T | null {
    return container?.querySelector(selector) as T | null
  }

  /**
   * 批量设置元素属性
   */
  static setElementProperties(
    element: HTMLElement | null,
    properties: Record<string, string | number | boolean>
  ): void {
    if (!element) return

    Object.entries(properties).forEach(([key, value]) => {
      if (key === 'textContent') {
        element.textContent = String(value)
      } else if (key === 'className') {
        element.className = String(value)
      } else if (key === 'disabled') {
        ;(element as any).disabled = Boolean(value)
      } else if (key === 'value') {
        ;(element as any).value = String(value)
      } else {
        element.setAttribute(key, String(value))
      }
    })
  }
}

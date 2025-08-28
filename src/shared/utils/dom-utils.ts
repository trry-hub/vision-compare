/**
 * DOM 操作工具类
 * 提供通用的DOM操作方法
 */
export class DOMUtils {
  /**
   * 安全的元素查询
   */
  static querySelector<T extends HTMLElement>(
    container: HTMLElement | Document | null,
    selector: string
  ): T | null {
    return container?.querySelector(selector) as T | null
  }

  /**
   * 安全的多元素查询
   */
  static querySelectorAll<T extends HTMLElement>(
    container: HTMLElement | Document | null,
    selector: string
  ): NodeListOf<T> | [] {
    return container?.querySelectorAll(selector) as NodeListOf<T> || []
  }

  /**
   * 创建元素并设置属性
   */
  static createElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: {
      className?: string
      id?: string
      innerHTML?: string
      textContent?: string
      attributes?: Record<string, string>
      styles?: Partial<CSSStyleDeclaration>
    }
  ): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName)

    if (options) {
      if (options.className) element.className = options.className
      if (options.id) element.id = options.id
      if (options.innerHTML) element.innerHTML = options.innerHTML
      if (options.textContent) element.textContent = options.textContent

      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          element.setAttribute(key, value)
        })
      }

      if (options.styles) {
        Object.assign(element.style, options.styles)
      }
    }

    return element
  }

  /**
   * 批量设置样式
   */
  static setStyles(
    element: HTMLElement | null,
    styles: Partial<CSSStyleDeclaration> | string
  ): void {
    if (!element) return

    if (typeof styles === 'string') {
      element.style.cssText = styles
    } else {
      Object.assign(element.style, styles)
    }
  }

  /**
   * 切换类名
   */
  static toggleClass(
    element: HTMLElement | null,
    className: string,
    force?: boolean
  ): boolean {
    if (!element) return false
    return element.classList.toggle(className, force)
  }

  /**
   * 批量添加类名
   */
  static addClasses(element: HTMLElement | null, ...classNames: string[]): void {
    if (!element) return
    element.classList.add(...classNames)
  }

  /**
   * 批量移除类名
   */
  static removeClasses(element: HTMLElement | null, ...classNames: string[]): void {
    if (!element) return
    element.classList.remove(...classNames)
  }

  /**
   * 检查元素是否包含类名
   */
  static hasClass(element: HTMLElement | null, className: string): boolean {
    return element?.classList.contains(className) ?? false
  }

  /**
   * 安全的元素移除
   */
  static removeElement(element: HTMLElement | null): void {
    element?.remove()
  }

  /**
   * 获取元素的计算样式
   */
  static getComputedStyle(element: HTMLElement | null): CSSStyleDeclaration | null {
    return element ? window.getComputedStyle(element) : null
  }

  /**
   * 检查元素是否在视口内
   */
  static isInViewport(element: HTMLElement | null): boolean {
    if (!element) return false

    const rect = element.getBoundingClientRect()
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  }

  /**
   * 限制元素位置在视口内
   */
  static constrainToViewport(
    x: number,
    y: number,
    elementWidth: number,
    elementHeight: number,
    margin = 0
  ): { x: number; y: number } {
    const maxX = window.innerWidth - elementWidth - margin
    const maxY = window.innerHeight - elementHeight - margin

    return {
      x: Math.max(margin, Math.min(x, maxX)),
      y: Math.max(margin, Math.min(y, maxY))
    }
  }
}

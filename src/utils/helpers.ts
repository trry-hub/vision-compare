/**
 * 工具函数集合
 */

import { MAX_FILE_SIZE, SUPPORTED_IMAGE_TYPES } from './constants'

/**
 * 验证文件是否为支持的图片格式
 */
export function validateImageFile(file: File): { valid: boolean, error?: string } {
  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: '图片文件过大，请选择小于10MB的图片',
    }
  }

  // 检查文件类型
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: '不支持的图片格式，请选择 JPG、PNG、GIF、WebP 或 SVG 格式',
    }
  }

  return { valid: true }
}

/**
 * 读取文件为 DataURL
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const result = e.target?.result as string
      if (!result) {
        reject(new Error('文件读取结果为空'))
        return
      }
      resolve(result)
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

/**
 * 检查页面是否支持扩展功能
 */
export function isPageSupported(url?: string): boolean {
  if (!url) {
    return false
  }

  const unsupportedProtocols = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'file://',
  ]

  return !unsupportedProtocols.some(protocol => url.startsWith(protocol))
}

/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 限制数值在指定范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * 计算宽高比
 */
export function calculateAspectRatio(width: number, height: number): number {
  return height === 0 ? 1 : width / height
}

/**
 * 根据宽高比调整尺寸
 */
export function adjustSizeByAspectRatio(
  type: 'width' | 'height',
  value: number,
  aspectRatio: number,
): { width: number, height: number } {
  if (type === 'width') {
    return {
      width: value,
      height: Math.round(value / aspectRatio),
    }
  }
  else {
    return {
      width: Math.round(value * aspectRatio),
      height: value,
    }
  }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 B'
  }

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * 应用类型定义
 */
import { POSITION_MODES, MESSAGE_TYPES } from '../src/constants'

// 基础类型
export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

// 位置模式类型
export type PositionMode = typeof POSITION_MODES[keyof typeof POSITION_MODES]

// 视觉状态接口
export interface VisionState {
  visible: boolean
  frozen: boolean      // 锁定：控制器不可修改
  freezed: boolean     // 冻结：内容冻结但控制器可修改
  toolbarVisible: boolean
  opacity: number
  position: Position
  positionMode: PositionMode
  size: Size
  originalSize: Size
}

// 消息类型
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES]

// 消息请求接口
export interface MessageRequest {
  action: MessageType
  imageData?: string
  command?: string
  [key: string]: any
}

// 消息响应接口
export interface MessageResponse {
  success: boolean
  error?: string
  isActive?: boolean
  toolbarVisible?: boolean
  [key: string]: any
}

// 按钮配置接口
export interface ButtonConfig {
  id: string
  action: () => void
  options?: {
    checkFrozen?: boolean
    frozenState?: () => boolean
  }
}

// 输入框配置接口
export interface InputConfig {
  id: string
  updateFn: (value: number) => void
  options?: {
    checkFrozen?: boolean
    frozenState?: () => boolean
    allowEmpty?: boolean
    minValue?: number
  }
}

// 拖拽状态接口
export interface DragState {
  isDragging: boolean
  startPosition: Position
  elementStartPosition: Position
}

// 控制器配置接口
export interface ControllerConfig {
  position: Position
  width: number
  height: number
  margin: number
}

// 存储数据接口
export interface StorageData extends VisionState {
  imageData: string
  timestamp: number
}

// 事件处理器选项
export interface EventHandlerOptions {
  checkFrozen?: boolean
  allowEmpty?: boolean
  minValue?: number
}

// 样式配置接口
export interface StyleConfig {
  position: string
  left?: string
  top?: string
  right?: string
  bottom?: string
  width: string
  height: string
  opacity: string
  zIndex: string
  display: string
  [key: string]: string | undefined
}

// 快捷键配置接口
export interface ShortcutConfig {
  key: string
  action: () => void
  description: string
  enabled: boolean
}

// 组件属性接口
export interface ComponentProps {
  visible?: boolean
  disabled?: boolean
  className?: string
  style?: Partial<CSSStyleDeclaration>
  [key: string]: any
}

// 工具函数类型
export type UpdateFunction = () => void
export type ValidationFunction<T> = (value: T) => boolean
export type TransformFunction<T, U> = (value: T) => U

// 生命周期钩子类型
export type LifecycleHook = () => void | Promise<void>

// 错误处理类型
export interface ErrorInfo {
  message: string
  code?: string | number
  details?: any
}

export type ErrorHandler = (error: ErrorInfo) => void

// 配置选项类型
export interface ConfigOptions {
  enableLogging?: boolean
  enableDebugMode?: boolean
  autoSave?: boolean
  debounceDelay?: number
}

// 插件接口
export interface Plugin {
  name: string
  version: string
  install: (app: any) => void
  uninstall?: (app: any) => void
}

// 服务接口
export interface Service {
  name: string
  initialize: () => Promise<void> | void
  destroy: () => Promise<void> | void
}

// 中间件类型
export type Middleware<T = any> = (context: T, next: () => void) => void

// 过滤器类型
export type Filter<T> = (item: T) => boolean

// 排序器类型
export type Sorter<T> = (a: T, b: T) => number

// 映射器类型
export type Mapper<T, U> = (item: T, index: number) => U

// 归约器类型
export type Reducer<T, U> = (accumulator: U, current: T, index: number) => U

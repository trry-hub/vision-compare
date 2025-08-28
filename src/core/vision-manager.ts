/**
 * 视觉比较管理器核心类
 * 负责主要的业务逻辑
 */
import { VisionState, Position } from '../../typings'
import { AppConfig } from '../config/app.config'
import { StorageService, MessageService } from '../services'
import { DOMUtils } from '../shared/utils'
import { MESSAGE_TYPES, CSS_CLASSES } from '../constants'

export class VisionManager {
  private static instance: VisionManager
  private isActive = false
  private imageElement: HTMLImageElement | null = null
  private controller: HTMLElement | null = null
  private state: VisionState
  private storageService: StorageService
  private messageService: MessageService

  private constructor() {
    this.state = {
      opacity: 50,
      position: { x: 0, y: 0 },
      positionMode: 'absolute',
      size: { width: 300, height: 200 },
      originalSize: { width: 0, height: 0 },
      visible: true,
      frozen: false,
      freezed: false,
      toolbarVisible: true,
    }
    this.storageService = StorageService.getInstance()
    this.messageService = MessageService.getInstance()
    this.initialize()
  }

  static getInstance(): VisionManager {
    if (!VisionManager.instance) {
      VisionManager.instance = new VisionManager()
    }
    return VisionManager.instance
  }

  /**
   * 初始化管理器
   */
  private initialize(): void {
    if ((window as any).visionCheckInitialized) {
      return
    }
    
    ;(window as any).visionCheckInitialized = true
    
    this.registerMessageHandlers()
    this.bindGlobalEvents()
    this.loadPersistedStates()
  }

  /**
   * 注册消息处理器
   */
  private registerMessageHandlers(): void {
    this.messageService.registerHandler(MESSAGE_TYPES.PING, async () => {
      return MessageService.createSuccessResponse()
    })

    this.messageService.registerHandler(MESSAGE_TYPES.UPLOAD_IMAGE, async (message) => {
      if (message.imageData) {
        this.activate(message.imageData)
        return MessageService.createSuccessResponse()
      }
      return MessageService.createErrorResponse('No image data provided')
    })

    this.messageService.registerHandler(MESSAGE_TYPES.EXIT, async () => {
      this.deactivate()
      return MessageService.createSuccessResponse()
    })

    this.messageService.registerHandler(MESSAGE_TYPES.CHECK_STATUS, async () => {
      return MessageService.createSuccessResponse({
        isActive: this.isActive,
        toolbarVisible: this.state.toolbarVisible
      })
    })

    this.messageService.registerHandler(MESSAGE_TYPES.TOGGLE_CONTROLLER_VISIBILITY, async () => {
      this.toggleControllerVisibility()
      return MessageService.createSuccessResponse()
    })
  }

  /**
   * 绑定全局事件
   */
  private bindGlobalEvents(): void {
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseup', this.handleMouseUp)
    document.addEventListener('keydown', this.handleKeydown)
  }

  /**
   * 加载持久化状态
   */
  private loadPersistedStates(): void {
    // 加载锁定状态
    const lockedState = this.storageService.loadLocked()
    if (lockedState && lockedState.frozen) {
      Object.assign(this.state, lockedState)
      this.activate(lockedState.imageData)
    }

    // 加载冻结状态
    const freezedState = this.storageService.loadFreezed()
    if (freezedState && freezedState.freezed) {
      Object.assign(this.state, freezedState)
      this.activate(freezedState.imageData)
    }
  }

  /**
   * 激活视觉比较
   */
  activate(imageData: string): void {
    if (this.isActive) {
      this.deactivate()
    }

    // 尝试恢复临时状态
    this.tryRestoreTempState(imageData)

    // 创建图片元素
    this.createImageElement(imageData)
    this.updateImageStyles()

    this.isActive = true
  }

  /**
   * 停用视觉比较
   */
  deactivate(): void {
    this.removeImageElement()
    this.removeController()
    this.clearAllStates()
    this.resetState()
    this.isActive = false
  }

  /**
   * 获取当前状态
   */
  getState(): VisionState {
    return { ...this.state }
  }

  /**
   * 更新状态
   */
  updateState(updates: Partial<VisionState>): void {
    Object.assign(this.state, updates)
    this.updateImageStyles()
    this.debouncedSaveState()
  }

  /**
   * 切换可见性
   */
  toggleVisibility(): void {
    this.state.visible = !this.state.visible
    this.updateImageStyles()
    this.debouncedSaveState()
  }

  /**
   * 切换锁定状态
   */
  toggleFreeze(): void {
    this.state.frozen = !this.state.frozen

    if (this.state.frozen) {
      this.saveState()
    } else {
      this.storageService.clearLocked()
    }

    this.updateImageStyles()
  }

  /**
   * 切换冻结状态
   */
  toggleFreezed(): void {
    this.state.freezed = !this.state.freezed

    if (this.state.freezed) {
      this.saveFreezedState()
    } else {
      this.storageService.clearFreezed()
    }

    this.updateImageStyles()
  }

  /**
   * 创建图片元素
   */
  private createImageElement(imageData: string): void {
    this.imageElement = DOMUtils.createElement('img', {
      className: CSS_CLASSES.VISION_IMAGE,
      attributes: { src: imageData }
    })

    this.imageElement.addEventListener('load', this.handleImageLoad.bind(this))
    document.body.appendChild(this.imageElement)
  }

  /**
   * 移除图片元素
   */
  private removeImageElement(): void {
    DOMUtils.removeElement(this.imageElement)
    this.imageElement = null
  }



  /**
   * 移除控制器
   */
  private removeController(): void {
    DOMUtils.removeElement(this.controller)
    this.controller = null
  }

  /**
   * 更新图片样式
   */
  private updateImageStyles(): void {
    if (!this.imageElement) return

    const styles = this.buildImageStyles(this.state)
    DOMUtils.setStyles(this.imageElement, styles)
  }

  /**
   * 构建图片样式
   */
  private buildImageStyles(state: VisionState): string {
    const { position, positionMode, size, opacity, visible } = state

    let cssText = `
      position: fixed !important;
      width: ${size.width}px !important;
      height: ${size.height}px !important;
      opacity: ${opacity / 100} !important;
      z-index: ${AppConfig.styles.zIndex.image} !important;
      cursor: default !important;
      pointer-events: none !important;
      user-select: none !important;
      box-sizing: border-box !important;
      display: ${visible ? 'block' : 'none'} !important;
    `

    // 根据定位模式设置位置
    cssText += this.getPositionStyles(positionMode, position)
    return cssText
  }

  /**
   * 获取位置样式
   */
  private getPositionStyles(mode: string, position: Position): string {
    switch (mode) {
      case 'absolute':
        return `left: ${position.x}px !important; top: ${position.y}px !important;`
      case 'top':
        return `top: 0px !important; left: ${position.x}px !important;`
      case 'bottom':
        return `bottom: 0px !important; left: ${position.x}px !important;`
      case 'left':
        return `left: 0px !important; top: ${position.y}px !important;`
      case 'right':
        return `right: 0px !important; top: ${position.y}px !important;`
      case 'top-left':
        return `top: 0px !important; left: 0px !important;`
      case 'top-right':
        return `top: 0px !important; right: 0px !important;`
      case 'bottom-left':
        return `bottom: 0px !important; left: 0px !important;`
      case 'bottom-right':
        return `bottom: 0px !important; right: 0px !important;`
      default:
        return `left: ${position.x}px !important; top: ${position.y}px !important;`
    }
  }

  /**
   * 处理图片加载
   */
  private handleImageLoad(): void {
    // TODO: 实现图片加载处理
  }

  /**
   * 尝试恢复临时状态
   */
  private tryRestoreTempState(imageData: string): void {
    const tempState = this.storageService.loadTemp()
    if (this.storageService.isStateMatchingImage(tempState, imageData)) {
      Object.assign(this.state, tempState!)
    }
  }

  /**
   * 清除所有状态
   */
  private clearAllStates(): void {
    this.storageService.clearAll()
  }

  /**
   * 重置状态
   */
  private resetState(): void {
    this.state = {
      opacity: 50,
      position: { x: 0, y: 0 },
      positionMode: 'absolute',
      size: { width: 300, height: 200 },
      originalSize: { width: 0, height: 0 },
      visible: true,
      frozen: false,
      freezed: false,
      toolbarVisible: true,
    }
  }

  /**
   * 保存状态
   */
  private saveState(): void {
    const imageData = this.imageElement?.src || ''
    this.storageService.saveLocked(this.state, imageData)
  }

  /**
   * 保存冻结状态
   */
  private saveFreezedState(): void {
    const imageData = this.imageElement?.src || ''
    this.storageService.saveFreezed(this.state, imageData)
  }

  /**
   * 防抖保存状态
   */
  private debouncedSaveState(): void {
    // TODO: 实现防抖保存
  }

  /**
   * 切换控制器可见性
   */
  private toggleControllerVisibility(): void {
    // TODO: 实现控制器可见性切换
  }

  /**
   * 处理鼠标移动
   */
  private handleMouseMove = (_e: MouseEvent): void => {
    // TODO: 实现鼠标移动处理
  }

  /**
   * 处理鼠标释放
   */
  private handleMouseUp = (): void => {
    // TODO: 实现鼠标释放处理
  }

  /**
   * 处理键盘按下
   */
  private handleKeydown = (_e: KeyboardEvent): void => {
    // TODO: 实现键盘事件处理
  }
}

// Vision Compare Content Script - Chrome Extension Compatible
import type { MessageRequest, MessageResponse } from '../main'
import './style.scss'

// 简化的状态接口
interface VisionState {
  visible: boolean
  frozen: boolean      // 锁定：控制器不可修改
  freezed: boolean     // 冻结：内容冻结但控制器可修改
  toolbarVisible: boolean
  opacity: number
  position: { x: number; y: number }
  positionMode: 'absolute' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  size: { width: number; height: number }
  originalSize: { width: number; height: number }
}

/**
 * Vision Compare Manager - Chrome 扩展兼容版本
 * 使用纯 TypeScript，避免 ES 模块导入问题
 */
class VisionCheckManager {
  private isActive = false
  private imageElement: HTMLImageElement | null = null
  private controller: HTMLElement | null = null

  private state: VisionState = {
    visible: true,
    frozen: false,
    freezed: false,
    toolbarVisible: true, // 默认显示控制器
    opacity: 50,
    position: { x: 0, y: 0 }, // 默认从左上角开始
    positionMode: 'absolute', // 默认绝对定位模式
    size: { width: 300, height: 200 },
    originalSize: { width: 0, height: 0 }
  }

  // 尺寸调整模式：true=保持宽高比，false=自由调整
  private maintainAspectRatio = true

  // 控制器拖拽相关
  private isControllerDragging = false
  private controllerPosition = { x: 0, y: 0 } // 控制器绝对位置，初始化时设置

  private dragStart = { x: 0, y: 0 }
  private elementStart = { x: 0, y: 0 }
  private saveDebounceTimer: number | null = null

  constructor() {
    this.init()
  }

  // ==================== 公共工具方法 ====================

  /**
   * 安全的DOM查询
   */
  private querySelector<T extends HTMLElement>(selector: string): T | null {
    return this.controller?.querySelector(selector) as T | null
  }



  /**
   * 通用输入框事件处理
   */
  private createInputHandler(
    updateFn: (value: number) => void,
    options: {
      checkFrozen?: boolean
      allowEmpty?: boolean
      minValue?: number
    } = {}
  ): (e: Event) => void {
    return (e: Event) => {
      if (options.checkFrozen && this.state.frozen) return

      const value = (e.target as HTMLInputElement).value
      if (options.allowEmpty && value === '') return

      const numValue = parseInt(value) || 0
      const finalValue = options.minValue ? Math.max(options.minValue, numValue) : numValue

      updateFn(finalValue)
      this.updateStyles()
      this.debouncedSaveState()
    }
  }

  /**
   * 通用按钮事件处理
   */
  private createButtonHandler(
    actionFn: () => void,
    options: {
      checkFrozen?: boolean
    } = {}
  ): () => void {
    return () => {
      if (options.checkFrozen && this.state.frozen) return
      actionFn()
    }
  }

  /**
   * 统一的状态更新和保存
   */
  private updateStateAndSave(updateFn: () => void, saveImmediate = false): void {
    updateFn()
    this.updateStyles()
    if (saveImmediate) {
      this.forceSaveState()
    } else {
      this.debouncedSaveState()
    }
  }

  /**
   * 绑定输入框事件
   */
  private bindInputEvents(): void {
    // 透明度滑块
    const opacitySlider = this.querySelector<HTMLInputElement>('#opacity-slider')
    const opacityValue = this.querySelector('#opacity-value')

    opacitySlider?.addEventListener('input', (e) => {
      this.state.opacity = parseInt((e.target as HTMLInputElement).value)
      if (opacityValue) opacityValue.textContent = `${this.state.opacity}%`
      this.updateStyles()
      this.debouncedSaveState()
    })

    // 位置模式选择器
    const positionMode = this.querySelector<HTMLSelectElement>('#position-mode')
    positionMode?.addEventListener('change', (e) => {
      if (this.state.frozen) return
      this.state.positionMode = (e.target as HTMLSelectElement).value as any
      this.updateStyles()
      this.updateControllerValues()
      this.debouncedSaveState()
    })

    // 位置输入框 - 使用公共处理器
    const positionInputs = [
      { id: '#pos-top', update: (v: number) => this.state.position.y = v },
      { id: '#pos-bottom', update: (v: number) => this.state.position.y = v },
      { id: '#pos-left', update: (v: number) => this.state.position.x = v },
      { id: '#pos-right', update: (v: number) => this.state.position.x = v }
    ]

    positionInputs.forEach(({ id, update }) => {
      const input = this.querySelector<HTMLInputElement>(id)
      input?.addEventListener('input', this.createInputHandler(update, {
        checkFrozen: true,
        allowEmpty: true
      }))
    })

    // 尺寸输入框
    const sizeInputs = [
      { id: '#size-w', dimension: 'width' as const },
      { id: '#size-h', dimension: 'height' as const }
    ]

    sizeInputs.forEach(({ id, dimension }) => {
      const input = this.querySelector<HTMLInputElement>(id)
      input?.addEventListener('input', this.createInputHandler((value) => {
        this.updateImageSize(dimension, value)
      }, {
        checkFrozen: true,
        allowEmpty: true,
        minValue: 1
      }))
    })
  }

  /**
   * 绑定按钮事件
   */
  private bindButtonEvents(): void {
    // 功能按钮
    const functionButtons = [
      { id: '#visibility-btn', action: () => this.toggleVisibility() },
      { id: '#freeze-btn', action: () => this.toggleFreeze() },
      { id: '#freezed-btn', action: () => this.toggleFreezed() },
      { id: '#reset-btn', action: () => this.resetToOriginal() }
    ]

    functionButtons.forEach(({ id, action }) => {
      const button = this.querySelector(id)
      button?.addEventListener('click', action)
    })

    // 位置快捷按钮
    const positionButtons = [
      { id: '#move-top', action: () => this.snapToEdge('top') },
      { id: '#move-bottom', action: () => this.snapToEdge('bottom') },
      { id: '#move-left', action: () => this.snapToEdge('left') },
      { id: '#move-right', action: () => this.snapToEdge('right') }
    ]

    positionButtons.forEach(({ id, action }) => {
      const button = this.querySelector(id)
      button?.addEventListener('click', this.createButtonHandler(action, { checkFrozen: true }))
    })

    // 尺寸快捷按钮
    const sizeButtons = [
      { id: '#fit-width', action: () => this.fitToViewport('width') },
      { id: '#fit-height', action: () => this.fitToViewport('height') },
      { id: '#original-size', action: () => this.resetToOriginal() }
    ]

    sizeButtons.forEach(({ id, action }) => {
      const button = this.querySelector(id)
      button?.addEventListener('click', this.createButtonHandler(action, { checkFrozen: true }))
    })

    // 宽高比切换按钮
    const aspectRatioBtn = this.querySelector('#aspect-ratio-toggle')
    aspectRatioBtn?.addEventListener('click', this.createButtonHandler(() => {
      this.maintainAspectRatio = !this.maintainAspectRatio
      this.updateControllerValues()
    }, { checkFrozen: true }))
  }

  private init(): void {
    if ((window as any).visionCheckInitialized) {
      return
    }
    
    ;(window as any).visionCheckInitialized = true
    
    // 监听消息
    chrome.runtime.onMessage.addListener(
      (message: MessageRequest, _sender, sendResponse: (response: MessageResponse) => void) => {
        this.handleMessage(message)
          .then(response => {
            sendResponse(response)
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message })
          })

        return true
      }
    )

    // 绑定事件
    this.bindEvents()

    // 恢复锁定和冻结状态（但不恢复临时状态，避免退出后又自动恢复）
    this.loadState()
    this.loadFreezedState()
  }

  private async handleMessage(message: MessageRequest): Promise<MessageResponse> {
    switch (message.action) {
      case 'ping':
        return { success: true }
        
      case 'uploadImage':
        if (message.imageData) {
          this.activate(message.imageData)
          return { success: true }
        }
        return { success: false, error: 'No image data provided' }
        
      case 'exit':
        this.deactivate()
        return { success: true }
        
      case 'checkStatus':
        return { 
          isActive: this.isActive,
          toolbarVisible: this.state.toolbarVisible
        }
        
      case 'toggleControllerVisibility':
        this.toggleControllerVisibility()
        return { success: true }
        
      default:
        return { success: false, error: 'Unknown action' }
    }
  }

  private activate(imageData: string): void {
    if (this.isActive) {
      this.deactivate()
    }

    // 尝试恢复临时状态（如果存在且图片匹配）
    this.tryRestoreTempState(imageData)

    // 创建图片
    this.imageElement = document.createElement('img')
    this.imageElement.src = imageData
    this.imageElement.className = 'vision-image'
    this.imageElement.addEventListener('load', this.handleImageLoad.bind(this))

    document.body.appendChild(this.imageElement)

    // 更新样式
    this.updateStyles()

    this.isActive = true
  }

  private deactivate(): void {
    if (this.imageElement) {
      this.imageElement.remove()
      this.imageElement = null
    }

    this.removeController()

    // 移除全局事件监听器
    document.removeEventListener('mousemove', this.handleMouseMove)
    document.removeEventListener('mouseup', this.handleMouseUp)
    document.removeEventListener('keydown', this.handleKeydown)

    // 清理所有存储数据
    this.clearState()        // 清理锁定状态
    this.clearFreezedState() // 清理冻结状态
    this.clearTempState()    // 清理临时状态

    // 重置状态到初始值
    this.state = {
      visible: true,
      frozen: false,
      freezed: false,
      toolbarVisible: true,
      opacity: 50,
      position: { x: 0, y: 0 },
      positionMode: 'absolute',
      size: { width: 300, height: 200 },
      originalSize: { width: 0, height: 0 }
    }

    this.isActive = false
  }

  private createController(): void {
    // 设置控制器初始位置（右下角，边距10px）
    const controllerWidth = 280 // 控制器宽度约280px
    const controllerHeight = 180 // 控制器高度约180px
    this.controllerPosition = {
      x: Math.max(10, window.innerWidth - controllerWidth - 10), // 右边距10px
      y: Math.max(10, window.innerHeight - controllerHeight - 10)  // 底边距10px
    }

    this.controller = document.createElement('div')
    this.controller.className = 'vision-controller'
    this.controller.innerHTML = this.getControllerHTML()
    this.controller.style.cssText = this.getControllerStyle()

    document.body.appendChild(this.controller)

    // 绑定控制器事件
    this.bindControllerEvents()
  }

  private getControllerStyle(): string {
    // 确保控制器不超出屏幕边界
    const maxX = window.innerWidth - 50 // 控制器宽度约50px
    const maxY = window.innerHeight - 50 // 控制器高度约50px

    const x = Math.max(0, Math.min(this.controllerPosition.x, maxX))
    const y = Math.max(0, Math.min(this.controllerPosition.y, maxY))

    return `
      position: fixed !important;
      left: ${x}px !important;
      top: ${y}px !important;
      z-index: 999999999 !important;
    `
  }

  private removeController(): void {
    if (this.controller) {
      this.controller.remove()
      this.controller = null
    }
  }

  // 获取指定方向的位置值
  private getPositionValue(direction: 'top' | 'bottom' | 'left' | 'right'): string {
    switch (this.state.positionMode) {
      case 'absolute':
        return direction === 'top' || direction === 'left' ?
               (direction === 'top' ? this.state.position.y : this.state.position.x).toString() : ''
      case 'top':
        return direction === 'top' ? '0' : direction === 'left' ? this.state.position.x.toString() : ''
      case 'bottom':
        return direction === 'bottom' ? '0' : direction === 'left' ? this.state.position.x.toString() : ''
      case 'left':
        return direction === 'left' ? '0' : direction === 'top' ? this.state.position.y.toString() : ''
      case 'right':
        return direction === 'right' ? '0' : direction === 'top' ? this.state.position.y.toString() : ''
      case 'top-left':
        return (direction === 'top' || direction === 'left') ? '0' : ''
      case 'top-right':
        return (direction === 'top' || direction === 'right') ? '0' : ''
      case 'bottom-left':
        return (direction === 'bottom' || direction === 'left') ? '0' : ''
      case 'bottom-right':
        return (direction === 'bottom' || direction === 'right') ? '0' : ''
      default:
        return ''
    }
  }

  // 判断指定方向的输入框是否启用
  private isPositionInputEnabled(direction: 'top' | 'bottom' | 'left' | 'right'): boolean {
    switch (this.state.positionMode) {
      case 'absolute':
        return direction === 'top' || direction === 'left'
      case 'top':
        return direction === 'top' || direction === 'left'
      case 'bottom':
        return direction === 'bottom' || direction === 'left'
      case 'left':
        return direction === 'left' || direction === 'top'
      case 'right':
        return direction === 'right' || direction === 'top'
      case 'top-left':
        return direction === 'top' || direction === 'left'
      case 'top-right':
        return direction === 'top' || direction === 'right'
      case 'bottom-left':
        return direction === 'bottom' || direction === 'left'
      case 'bottom-right':
        return direction === 'bottom' || direction === 'right'
      default:
        return false
    }
  }

  private getControllerHTML(): string {
    return `
      <div class="controller-content">
        <div class="controller-toggle" id="controller-toggle">
          <span class="toggle-icon">⚙️</span>
        </div>

        <div class="controller-panel" id="controller-panel">
          <div class="controller-row">
            <label class="controller-label">透明度:</label>
            <input type="range" min="0" max="100" value="${this.state.opacity}"
                   class="controller-slider" id="opacity-slider" />
            <span class="controller-value" id="opacity-value">${this.state.opacity}%</span>
          </div>

          <div class="controller-row">
            <label class="controller-label">位置模式:</label>
            <select class="controller-select" id="position-mode">
              <option value="absolute" ${this.state.positionMode === 'absolute' ? 'selected' : ''}>绝对定位</option>
              <option value="top" ${this.state.positionMode === 'top' ? 'selected' : ''}>贴顶部</option>
              <option value="bottom" ${this.state.positionMode === 'bottom' ? 'selected' : ''}>贴底部</option>
              <option value="left" ${this.state.positionMode === 'left' ? 'selected' : ''}>贴左边</option>
              <option value="right" ${this.state.positionMode === 'right' ? 'selected' : ''}>贴右边</option>
              <option value="top-left" ${this.state.positionMode === 'top-left' ? 'selected' : ''}>左上角</option>
              <option value="top-right" ${this.state.positionMode === 'top-right' ? 'selected' : ''}>右上角</option>
              <option value="bottom-left" ${this.state.positionMode === 'bottom-left' ? 'selected' : ''}>左下角</option>
              <option value="bottom-right" ${this.state.positionMode === 'bottom-right' ? 'selected' : ''}>右下角</option>
            </select>
          </div>

          <div class="controller-row">
            <label class="controller-label">位置值:</label>
            <div class="position-inputs">
              <div class="position-input-group">
                <label class="position-label">Top:</label>
                <input type="number" value="${this.getPositionValue('top')}"
                       class="controller-input position-input" id="pos-top" placeholder="顶部距离"
                       ${this.isPositionInputEnabled('top') ? '' : 'disabled'} />
              </div>
              <div class="position-input-group">
                <label class="position-label">Bottom:</label>
                <input type="number" value="${this.getPositionValue('bottom')}"
                       class="controller-input position-input" id="pos-bottom" placeholder="底部距离"
                       ${this.isPositionInputEnabled('bottom') ? '' : 'disabled'} />
              </div>
              <div class="position-input-group">
                <label class="position-label">Left:</label>
                <input type="number" value="${this.getPositionValue('left')}"
                       class="controller-input position-input" id="pos-left" placeholder="左边距离"
                       ${this.isPositionInputEnabled('left') ? '' : 'disabled'} />
              </div>
              <div class="position-input-group">
                <label class="position-label">Right:</label>
                <input type="number" value="${this.getPositionValue('right')}"
                       class="controller-input position-input" id="pos-right" placeholder="右边距离"
                       ${this.isPositionInputEnabled('right') ? '' : 'disabled'} />
              </div>
            </div>
            <div class="position-shortcuts">
              <button class="shortcut-btn" id="move-top" title="贴顶部">↑</button>
              <button class="shortcut-btn" id="move-left" title="贴左边">←</button>
              <button class="shortcut-btn" id="move-right" title="贴右边">→</button>
              <button class="shortcut-btn" id="move-bottom" title="贴底部">↓</button>
            </div>
          </div>

          <div class="controller-row">
            <label class="controller-label">尺寸:</label>
            <input type="number" value="${this.state.size.width}"
                   class="controller-input" id="size-w" placeholder="宽" />
            <input type="number" value="${this.state.size.height}"
                   class="controller-input" id="size-h" placeholder="高" />
            <button class="aspect-ratio-btn ${this.maintainAspectRatio ? 'active' : ''}"
                    id="aspect-ratio-toggle" title="切换宽高比模式">🔗</button>
            <div class="size-shortcuts">
              <button class="shortcut-btn" id="fit-width" title="适应宽度">W</button>
              <button class="shortcut-btn" id="fit-height" title="适应高度">H</button>
              <button class="shortcut-btn" id="original-size" title="原图尺寸">1:1</button>
            </div>
          </div>

          <div class="controller-actions">
            <button class="controller-btn" id="visibility-btn">
              ${this.state.visible ? '隐藏' : '显示'}
            </button>
            <button class="controller-btn ${this.state.frozen ? 'active' : ''}" id="freeze-btn">
              ${this.state.frozen ? '解锁' : '锁定'}
            </button>
            <button class="controller-btn ${this.state.freezed ? 'active' : ''}" id="freezed-btn">
              ${this.state.freezed ? '解冻' : '冻结'}
            </button>
            <button class="controller-btn" id="reset-btn">原图</button>
          </div>
        </div>
      </div>
    `
  }

  private bindControllerEvents(): void {
    if (!this.controller) return

    // 控制器拖拽
    const toggle = this.controller.querySelector('#controller-toggle')
    const panel = this.controller.querySelector('#controller-panel')

    // 控制器单击切换和拖拽
    toggle?.addEventListener('mousedown', (e) => this.handleControllerMouseDown(e as MouseEvent))
    toggle?.addEventListener('click', (e) => {
      // 如果没有拖拽，则切换面板
      if (!this.isControllerDragging) {
        const isVisible = panel?.classList.contains('visible')
        if (isVisible) {
          panel?.classList.remove('visible')
        } else {
          this.updatePanelPosition()
          panel?.classList.add('visible')
        }
      }
      e.stopPropagation()
    })

    // 使用公共方法绑定输入框事件
    this.bindInputEvents()
    this.bindButtonEvents()




  }

  private handleControllerMouseDown(e: MouseEvent): void {
    this.dragStart = { x: e.clientX, y: e.clientY }
    this.elementStart = { ...this.controllerPosition }

    // 设置拖拽检测
    const mouseMoveHandler = (moveEvent: MouseEvent) => {
      const deltaX = Math.abs(moveEvent.clientX - this.dragStart.x)
      const deltaY = Math.abs(moveEvent.clientY - this.dragStart.y)

      // 如果移动距离超过5px，则认为是拖拽
      if (deltaX > 5 || deltaY > 5) {
        this.isControllerDragging = true
        document.body.classList.add('vision-compare-dragging')
      }
    }

    const mouseUpHandler = () => {
      document.removeEventListener('mousemove', mouseMoveHandler)
      document.removeEventListener('mouseup', mouseUpHandler)
    }

    document.addEventListener('mousemove', mouseMoveHandler)
    document.addEventListener('mouseup', mouseUpHandler)

    e.preventDefault()
    e.stopPropagation()
  }

  private snapToEdge(edge: 'top' | 'bottom' | 'left' | 'right'): void {
    this.updateStateAndSave(() => {
      // 直接设置定位模式，让CSS处理具体的定位
      this.state.positionMode = edge
      // 位置值保持不变，只改变定位模式
    })
  }

  private updateStyles(): void {
    if (this.imageElement) {
      const { position, positionMode, size, opacity, visible } = this.state

      // 基础样式
      let cssText = `
        position: fixed !important;
        width: ${size.width}px !important;
        height: ${size.height}px !important;
        opacity: ${opacity / 100} !important;
        z-index: 999999998 !important;
        cursor: default !important;
        pointer-events: none !important;
        user-select: none !important;
        box-sizing: border-box !important;
        display: ${visible ? 'block' : 'none'} !important;
      `

      // 根据定位模式设置位置
      switch (positionMode) {
        case 'absolute':
          cssText += `
            left: ${position.x}px !important;
            top: ${position.y}px !important;
            right: auto !important;
            bottom: auto !important;
          `
          break
        case 'top':
          cssText += `
            top: 0px !important;
            left: ${position.x}px !important;
            right: auto !important;
            bottom: auto !important;
          `
          break
        case 'bottom':
          cssText += `
            bottom: 0px !important;
            left: ${position.x}px !important;
            top: auto !important;
            right: auto !important;
          `
          break
        case 'left':
          cssText += `
            left: 0px !important;
            top: ${position.y}px !important;
            right: auto !important;
            bottom: auto !important;
          `
          break
        case 'right':
          cssText += `
            right: 0px !important;
            top: ${position.y}px !important;
            left: auto !important;
            bottom: auto !important;
          `
          break
        case 'top-left':
          cssText += `
            top: 0px !important;
            left: 0px !important;
            right: auto !important;
            bottom: auto !important;
          `
          break
        case 'top-right':
          cssText += `
            top: 0px !important;
            right: 0px !important;
            left: auto !important;
            bottom: auto !important;
          `
          break
        case 'bottom-left':
          cssText += `
            bottom: 0px !important;
            left: 0px !important;
            top: auto !important;
            right: auto !important;
          `
          break
        case 'bottom-right':
          cssText += `
            bottom: 0px !important;
            right: 0px !important;
            top: auto !important;
            left: auto !important;
          `
          break
      }

      this.imageElement.style.cssText = cssText
    }

    // 更新控制器中的值
    this.updateControllerValues()
  }

  private updateControllerValues(): void {
    if (!this.controller) return

    const opacityValue = this.controller.querySelector('#opacity-value')
    const opacitySlider = this.controller.querySelector('#opacity-slider') as HTMLInputElement
    const posX = this.controller.querySelector('#pos-x') as HTMLInputElement
    const posY = this.controller.querySelector('#pos-y') as HTMLInputElement
    const sizeW = this.controller.querySelector('#size-w') as HTMLInputElement
    const sizeH = this.controller.querySelector('#size-h') as HTMLInputElement
    const visibilityBtn = this.controller.querySelector('#visibility-btn')
    const freezeBtn = this.controller.querySelector('#freeze-btn')
    const freezedBtn = this.controller.querySelector('#freezed-btn')
    const aspectRatioBtn = this.controller.querySelector('#aspect-ratio-toggle')

    if (opacityValue) opacityValue.textContent = `${this.state.opacity}%`
    if (opacitySlider) {
      opacitySlider.value = this.state.opacity.toString()
      opacitySlider.disabled = this.state.frozen
    }
    if (posX) {
      posX.value = this.state.position.x.toString()
      posX.disabled = this.state.frozen
    }
    if (posY) {
      posY.value = this.state.position.y.toString()
      posY.disabled = this.state.frozen
    }
    if (sizeW) {
      sizeW.value = this.state.size.width.toString()
      sizeW.disabled = this.state.frozen
    }
    if (sizeH) {
      sizeH.value = this.state.size.height.toString()
      sizeH.disabled = this.state.frozen
    }
    if (visibilityBtn) visibilityBtn.textContent = this.state.visible ? '隐藏' : '显示'
    if (freezeBtn) {
      freezeBtn.textContent = this.state.frozen ? '解锁' : '锁定'
      freezeBtn.className = `controller-btn ${this.state.frozen ? 'active' : ''}`
    }
    if (freezedBtn) {
      freezedBtn.textContent = this.state.freezed ? '解冻' : '冻结'
      freezedBtn.className = `controller-btn ${this.state.freezed ? 'active' : ''}`
    }
    if (aspectRatioBtn) {
      aspectRatioBtn.className = `aspect-ratio-btn ${this.maintainAspectRatio ? 'active' : ''} ${this.state.frozen ? 'disabled' : ''}`
      ;(aspectRatioBtn as HTMLElement).title = this.maintainAspectRatio ? '保持宽高比（点击解除）' : '自由调整（点击锁定比例）'
    }

    // 禁用/启用快捷按钮
    const shortcutButtons = this.controller.querySelectorAll('.shortcut-btn')
    shortcutButtons.forEach(btn => {
      if (btn.id !== 'visibility-btn' && btn.id !== 'freeze-btn' && btn.id !== 'reset-btn') {
        ;(btn as HTMLButtonElement).disabled = this.state.frozen
        btn.classList.toggle('disabled', this.state.frozen)
      }
    })
  }

  // 事件处理
  private handleImageLoad(): void {
    if (!this.imageElement) return

    this.state.originalSize = {
      width: this.imageElement.naturalWidth,
      height: this.imageElement.naturalHeight
    }

    // 使用图片真实尺寸
    this.state.size = { ...this.state.originalSize }
    this.state.position = {
      x: 0, // 左上角开始
      y: 0
    }

    // 创建控制器（在图片加载完成后）
    this.createController()

    this.updateStyles()

    // 图片加载完成后不自动保存，只有锁定时才保存
    this.conditionalSaveState()
  }

  // 图片拖拽已移除，支持事件穿透

  private bindEvents(): void {
    document.addEventListener('mousemove', this.handleMouseMove)
    document.addEventListener('mouseup', this.handleMouseUp)
    document.addEventListener('keydown', this.handleKeydown)
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.isControllerDragging) {
      const deltaX = e.clientX - this.dragStart.x
      const deltaY = e.clientY - this.dragStart.y

      // 控制器绝对位置，限制在可视区域内
      this.controllerPosition = {
        x: this.elementStart.x + deltaX,
        y: this.elementStart.y + deltaY
      }

      if (this.controller) {
        this.controller.style.cssText = this.getControllerStyle()
        // 拖拽时更新面板位置
        const panel = this.controller.querySelector('.controller-panel')
        if (panel?.classList.contains('visible')) {
          this.updatePanelPosition()
        }
      }
    }
  }

  private handleMouseUp = (): void => {
    // 延迟重置拖拽状态，避免影响点击事件
    setTimeout(() => {
      this.isControllerDragging = false
    }, 100)

    document.body.classList.remove('vision-compare-dragging')
  }

  private handleKeydown = (e: KeyboardEvent): void => {
    // 只有在扩展激活时才处理快捷键
    if (!this.isActive) {
      return
    }

    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    const key = e.key.toLowerCase()
    const step = e.shiftKey ? 10 : 1

    // 锁定时不允许移动图片
    const isMovementKey = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)
    if (isMovementKey && this.state.frozen) {
      e.preventDefault()
      return
    }

    switch (key) {
      case 'arrowup':
        e.preventDefault()
        this.state.position.y -= step
        break
      case 'arrowdown':
        e.preventDefault()
        this.state.position.y += step
        break
      case 'arrowleft':
        e.preventDefault()
        this.state.position.x -= step
        break
      case 'arrowright':
        e.preventDefault()
        this.state.position.x += step
        break
      case 'v':
        this.toggleVisibility()
        break
      case 'l':
        this.toggleFreeze()
        break
      case 'z':
        this.toggleFreezed()
        break
      case 't':
        this.toggleController()
        break
      case 'f':
        this.toggleControllerVisibility()
        break
      case 'escape':
        this.deactivate()
        break
      default:
        return
    }

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      this.updateStyles()
      this.debouncedSaveState()
    }
  }

  // ==================== 状态切换方法 ====================

  /**
   * 通用的状态切换方法
   */
  private toggleStateProperty<K extends keyof VisionState>(
    property: K,
    onToggle?: (newValue: VisionState[K]) => void
  ): void {
    this.state[property] = !this.state[property] as VisionState[K]
    this.updateStyles()

    if (onToggle) {
      onToggle(this.state[property])
    } else {
      this.debouncedSaveState()
    }
  }

  private toggleVisibility(): void {
    this.toggleStateProperty('visible')
  }

  private toggleFreeze(): void {
    this.toggleStateProperty('frozen', (frozen) => {
      if (frozen) {
        this.saveState() // 锁定时保存状态
      } else {
        this.clearState() // 解锁时清理状态
      }
    })
  }

  private toggleFreezed(): void {
    this.toggleStateProperty('freezed', (freezed) => {
      if (freezed) {
        this.saveFreezedState() // 冻结时保存当前状态
      } else {
        this.clearFreezedState() // 解冻时清理冻结存储
      }
    })
  }

  private toggleController(): void {
    if (!this.controller) return

    const panel = this.controller.querySelector('#controller-panel')
    const isVisible = panel?.classList.contains('visible')

    if (isVisible) {
      panel?.classList.remove('visible')
    } else {
      this.updatePanelPosition()
      panel?.classList.add('visible')
    }
  }

  private resetToOriginal(): void {
    if (this.state.originalSize.width && this.state.originalSize.height) {
      this.updateStateAndSave(() => {
        this.state.size = { ...this.state.originalSize }
      })
    }
  }

  private fitToViewport(dimension: 'width' | 'height'): void {
    if (!this.state.originalSize.width || !this.state.originalSize.height) return

    this.updateStateAndSave(() => {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const { width: origWidth, height: origHeight } = this.state.originalSize

      if (dimension === 'width') {
        // 适应宽度，按比例缩放高度
        const scale = viewportWidth / origWidth
        this.state.size = {
          width: viewportWidth,
          height: Math.round(origHeight * scale)
        }
      } else {
        // 适应高度，按比例缩放宽度
        const scale = viewportHeight / origHeight
        this.state.size = {
          width: Math.round(origWidth * scale),
          height: viewportHeight
        }
      }
    })
  }

  private toggleControllerVisibility(): void {
    if (this.controller) {
      this.updateStateAndSave(() => {
        const isHidden = this.controller!.style.display === 'none'
        this.controller!.style.display = isHidden ? 'block' : 'none'
        this.state.toolbarVisible = isHidden
      })
    }
  }

  private updatePanelPosition(): void {
    if (!this.controller) return

    const panel = this.controller.querySelector('.controller-panel')
    if (!panel) return

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const controllerX = this.controllerPosition.x
    const controllerY = this.controllerPosition.y

    // 移除所有位置类
    panel.classList.remove('position-left', 'position-top', 'position-right', 'position-bottom')

    // 根据控制器位置智能调整面板位置
    const panelWidth = 320 // 面板最大宽度
    const panelHeight = 250 // 面板大概高度
    const margin = 20 // 边距

    let positionClass = ''

    // 优先级：右侧 > 左侧 > 上方 > 下方

    // 检查右侧空间
    if (controllerX + 60 + panelWidth <= viewportWidth - margin) {
      // 右侧有足够空间
      positionClass = 'position-right'
    }
    // 检查左侧空间
    else if (controllerX - panelWidth >= margin) {
      // 左侧有足够空间
      positionClass = 'position-left'
    }
    // 检查上方空间
    else if (controllerY - panelHeight >= margin) {
      // 上方有足够空间
      positionClass = 'position-top'
    }
    // 检查下方空间
    else if (controllerY + 60 + panelHeight <= viewportHeight - margin) {
      // 下方有足够空间
      positionClass = 'position-bottom'
    }
    // 默认显示在上方（即使空间不足）
    else {
      positionClass = 'position-top'
    }

    if (positionClass) {
      panel.classList.add(positionClass)
    }
  }

  private updateImageSize(dimension: 'width' | 'height', value: number): void {
    this.updateStateAndSave(() => {
      if (this.maintainAspectRatio && this.state.originalSize.width && this.state.originalSize.height) {
        // 保持宽高比模式
        const aspectRatio = this.state.originalSize.width / this.state.originalSize.height

        if (dimension === 'width') {
          this.state.size.width = value
          this.state.size.height = Math.round(value / aspectRatio)
        } else {
          this.state.size.height = value
          this.state.size.width = Math.round(value * aspectRatio)
        }
      } else {
        // 自由调整模式
        this.state.size[dimension] = value
      }

      // 更新控制器值
      this.updateControllerValues()
    })
  }

  // ==================== 存储管理 ====================

  /**
   * 通用存储操作
   */
  private saveToStorage(
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
      // Storage failed
    }
  }

  /**
   * 通用清理操作
   */
  private clearFromStorage(keyName: string): void {
    try {
      const stateKey = sessionStorage.getItem(keyName)
      if (stateKey) {
        sessionStorage.removeItem(stateKey)
        sessionStorage.removeItem(keyName)
      }
    } catch (error) {
      // Clear failed
    }
  }

  /**
   * 获取当前状态数据
   */
  private getStateData(): any {
    return {
      ...this.state,
      imageData: this.imageElement?.src || '',
      timestamp: Date.now()
    }
  }

  // 条件保存：锁定状态保存到锁定存储，冻结状态保存到冻结存储
  private conditionalSaveState(): void {
    if (this.state.frozen) this.saveState()
    if (this.state.freezed) this.saveFreezedState()
  }

  // 强制保存：在冻结或锁定状态下，修改信息直接保存
  private forceSaveState(): void {
    if (this.state.frozen) this.saveState()
    if (this.state.freezed) this.saveFreezedState()
    this.saveTempState() // 总是保存到临时状态
  }

  // 防抖保存：避免频繁保存导致卡顿
  private debouncedSaveState(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer)
    }

    this.saveDebounceTimer = window.setTimeout(() => {
      this.forceSaveState()
      this.saveDebounceTimer = null
    }, 1000) // 1秒防抖
  }

  private saveState(): void {
    this.saveToStorage(
      'vision-compare-current-locked-key',
      'vision-compare-locked',
      this.getStateData()
    )
  }

  private clearState(): void {
    this.clearFromStorage('vision-compare-current-locked-key')
  }

  private saveFreezedState(): void {
    this.saveToStorage(
      'vision-compare-current-freezed-key',
      'vision-compare-freezed',
      this.getStateData()
    )
  }

  private clearFreezedState(): void {
    this.clearFromStorage('vision-compare-current-freezed-key')
  }

  private saveTempState(): void {
    this.saveToStorage(
      '', // 不使用键名追踪
      'vision-compare-temp',
      this.getStateData(),
      false // 使用固定键
    )
  }

  private clearTempState(): void {
    try {
      const stateKey = `vision-compare-temp-${window.location.href}`
      sessionStorage.removeItem(stateKey)
    } catch (error) {
      // Failed to clear temp state
    }
  }

  private tryRestoreTempState(currentImageData: string): void {
    try {
      const stateKey = `vision-compare-temp-${window.location.href}`
      const savedStateStr = sessionStorage.getItem(stateKey)
      if (!savedStateStr) return

      const savedState = JSON.parse(savedStateStr)

      // 只有当图片数据匹配时才恢复临时状态
      if (savedState && savedState.imageData === currentImageData) {
        const { imageData, timestamp, ...stateUpdates } = savedState
        Object.assign(this.state, stateUpdates)
      }
    } catch (error) {
      // Failed to restore temp state
    }
  }

  private loadState(): void {
    try {
      const currentKey = sessionStorage.getItem('vision-compare-current-locked-key')
      if (!currentKey) return

      const savedStateStr = sessionStorage.getItem(currentKey)
      if (!savedStateStr) return

      const savedState = JSON.parse(savedStateStr)

      // 只有在锁定状态下保存的数据才会被恢复
      if (savedState && savedState.imageData && savedState.frozen) {
        // sessionStorage 在标签页关闭时自动清理，不需要检查过期时间
        const { imageData, timestamp, ...stateUpdates } = savedState
        Object.assign(this.state, stateUpdates)
        this.activate(imageData)
      }
    } catch (error) {
      // Failed to load state
    }
  }

  private loadFreezedState(): void {
    try {
      const currentKey = sessionStorage.getItem('vision-compare-current-freezed-key')
      if (!currentKey) return

      const savedStateStr = sessionStorage.getItem(currentKey)
      if (!savedStateStr) return

      const savedState = JSON.parse(savedStateStr)

      // 只有在冻结状态下保存的数据才会被恢复
      if (savedState && savedState.imageData && savedState.freezed) {
        // sessionStorage 在标签页关闭时自动清理，不需要检查过期时间
        const { imageData, timestamp, ...stateUpdates } = savedState
        Object.assign(this.state, stateUpdates)
        this.activate(imageData)
      }
    } catch (error) {
      // Failed to load freezed state
    }
  }
}

// 创建管理器实例
new VisionCheckManager()

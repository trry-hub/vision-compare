// Vision Check Content Script - Chrome Extension Compatible
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
  size: { width: number; height: number }
  originalSize: { width: number; height: number }
}

/**
 * Vision Check Manager - Chrome 扩展兼容版本
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

  constructor() {
    this.init()
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

    // 恢复状态
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

    // 清理当前页面的存储数据
    this.clearState()

    this.isActive = false
  }

  private createController(): void {
    // 设置控制器初始位置（右下角，确保不超出屏幕）
    this.controllerPosition = {
      x: Math.max(20, window.innerWidth - 300), // 控制器宽度约280px，留20px边距
      y: Math.max(20, window.innerHeight - 200)  // 控制器高度约180px，留20px边距
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
            <label class="controller-label">位置:</label>
            <input type="number" value="${this.state.position.x}"
                   class="controller-input" id="pos-x" placeholder="X" />
            <input type="number" value="${this.state.position.y}"
                   class="controller-input" id="pos-y" placeholder="Y" />
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

    // 透明度滑块
    const opacitySlider = this.controller.querySelector('#opacity-slider') as HTMLInputElement
    const opacityValue = this.controller.querySelector('#opacity-value')

    opacitySlider?.addEventListener('input', (e) => {
      this.state.opacity = parseInt((e.target as HTMLInputElement).value)
      if (opacityValue) opacityValue.textContent = `${this.state.opacity}%`
      this.updateStyles()
      this.conditionalSaveState()
    })

    // 位置输入
    const posX = this.controller.querySelector('#pos-x') as HTMLInputElement
    const posY = this.controller.querySelector('#pos-y') as HTMLInputElement

    posX?.addEventListener('input', (e) => {
      if (this.state.frozen) return // 锁定时不允许修改
      const value = (e.target as HTMLInputElement).value
      if (value === '') return // 允许空值，用户可能在输入过程中
      this.state.position.x = parseInt(value) || 0
      this.updateStyles()
      this.conditionalSaveState()
    })

    posY?.addEventListener('input', (e) => {
      if (this.state.frozen) return // 锁定时不允许修改
      const value = (e.target as HTMLInputElement).value
      if (value === '') return // 允许空值，用户可能在输入过程中
      this.state.position.y = parseInt(value) || 0
      this.updateStyles()
      this.conditionalSaveState()
    })

    // 尺寸输入
    const sizeW = this.controller.querySelector('#size-w') as HTMLInputElement
    const sizeH = this.controller.querySelector('#size-h') as HTMLInputElement

    sizeW?.addEventListener('input', (e) => {
      if (this.state.frozen) return // 锁定时不允许修改
      const value = (e.target as HTMLInputElement).value
      if (value === '' || value === '0') return // 允许空值和0，用户可能在输入过程中
      const newWidth = Math.max(1, parseInt(value) || 1)
      this.updateImageSize('width', newWidth)
    })

    sizeH?.addEventListener('input', (e) => {
      if (this.state.frozen) return // 锁定时不允许修改
      const value = (e.target as HTMLInputElement).value
      if (value === '' || value === '0') return // 允许空值和0，用户可能在输入过程中
      const newHeight = Math.max(1, parseInt(value) || 1)
      this.updateImageSize('height', newHeight)
    })

    // 宽高比切换按钮
    this.controller.querySelector('#aspect-ratio-toggle')?.addEventListener('click', () => {
      if (this.state.frozen) return // 锁定时不允许修改
      this.maintainAspectRatio = !this.maintainAspectRatio
      this.updateControllerValues()
    })

    // 按钮事件
    this.controller.querySelector('#visibility-btn')?.addEventListener('click', () => this.toggleVisibility())
    this.controller.querySelector('#freeze-btn')?.addEventListener('click', () => this.toggleFreeze())
    this.controller.querySelector('#freezed-btn')?.addEventListener('click', () => this.toggleFreezed())
    this.controller.querySelector('#reset-btn')?.addEventListener('click', () => this.resetToOriginal())

    // 位置快捷按钮 - 贴边功能
    this.controller.querySelector('#move-top')?.addEventListener('click', () => {
      if (this.state.frozen) return // 锁定时不允许修改
      this.snapToEdge('top')
    })
    this.controller.querySelector('#move-bottom')?.addEventListener('click', () => {
      if (this.state.frozen) return // 锁定时不允许修改
      this.snapToEdge('bottom')
    })
    this.controller.querySelector('#move-left')?.addEventListener('click', () => {
      if (this.state.frozen) return // 锁定时不允许修改
      this.snapToEdge('left')
    })
    this.controller.querySelector('#move-right')?.addEventListener('click', () => {
      if (this.state.frozen) return // 锁定时不允许修改
      this.snapToEdge('right')
    })

    // 尺寸快捷按钮
    this.controller.querySelector('#fit-width')?.addEventListener('click', () => {
      if (this.state.frozen) return // 锁定时不允许修改
      this.fitToViewport('width')
    })
    this.controller.querySelector('#fit-height')?.addEventListener('click', () => {
      if (this.state.frozen) return // 锁定时不允许修改
      this.fitToViewport('height')
    })
    this.controller.querySelector('#original-size')?.addEventListener('click', () => {
      if (this.state.frozen) return // 锁定时不允许修改
      this.resetToOriginal()
    })
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
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    switch (edge) {
      case 'top':
        this.state.position.y = 0
        break
      case 'bottom':
        this.state.position.y = Math.max(0, viewportHeight - this.state.size.height)
        break
      case 'left':
        this.state.position.x = 0
        break
      case 'right':
        this.state.position.x = Math.max(0, viewportWidth - this.state.size.width)
        break
    }

    this.updateStyles()
    this.conditionalSaveState()
  }

  private updateStyles(): void {
    if (this.imageElement) {
      const { position, size, opacity, visible } = this.state

      this.imageElement.style.cssText = `
        position: fixed !important;
        left: ${position.x}px !important;
        top: ${position.y}px !important;
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
    window.addEventListener('beforeunload', this.saveState.bind(this))
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
      this.conditionalSaveState()
    }
  }

  // 公共方法
  private toggleVisibility(): void {
    this.state.visible = !this.state.visible
    this.updateStyles()
    this.conditionalSaveState()
  }

  private toggleFreeze(): void {
    this.state.frozen = !this.state.frozen
    this.updateStyles()

    // 锁定状态改变时，需要保存或清理状态
    if (this.state.frozen) {
      this.saveState() // 锁定时保存状态
    } else {
      this.clearState() // 解锁时清理状态
    }
  }

  private toggleFreezed(): void {
    this.state.freezed = !this.state.freezed
    this.updateStyles()

    // 冻结状态改变时，需要保存或清理状态
    if (this.state.freezed) {
      this.saveFreezedState() // 冻结时保存状态
    } else {
      this.clearFreezedState() // 解冻时清理状态
    }
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
      this.state.size = { ...this.state.originalSize }
      this.updateStyles()
      this.conditionalSaveState()
    }
  }

  private fitToViewport(dimension: 'width' | 'height'): void {
    if (!this.state.originalSize.width || !this.state.originalSize.height) return

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

    this.updateStyles()
    this.conditionalSaveState()
  }

  private toggleControllerVisibility(): void {
    if (this.controller) {
      const isHidden = this.controller.style.display === 'none'
      this.controller.style.display = isHidden ? 'block' : 'none'
      // 更新状态：如果之前是隐藏的，现在显示了，所以是true；如果之前是显示的，现在隐藏了，所以是false
      this.state.toolbarVisible = isHidden
      this.conditionalSaveState()
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

    this.updateStyles()
    this.updateControllerValues()
    this.conditionalSaveState()
  }

  // 条件保存：锁定状态保存到锁定存储，冻结状态保存到冻结存储
  private conditionalSaveState(): void {
    if (this.state.frozen) {
      this.saveState()
    }
    if (this.state.freezed) {
      this.saveFreezedState()
    }
  }

  private async saveState(): Promise<void> {
    try {
      if (!chrome.runtime?.id) return

      const stateKey = `vision-compare-${window.location.hostname}`
      const stateData = {
        ...this.state,
        imageData: this.imageElement?.src || '',
        timestamp: Date.now()
      }

      await chrome.storage.local.set({ [stateKey]: stateData })
    } catch (error) {
      // Failed to save state
    }
  }

  private async clearState(): Promise<void> {
    try {
      if (!chrome.runtime?.id) return

      const stateKey = `vision-compare-${window.location.hostname}`
      await chrome.storage.local.remove([stateKey])
    } catch (error) {
      // Failed to clear state
    }
  }

  private async saveFreezedState(): Promise<void> {
    try {
      if (!chrome.runtime?.id) return

      const stateKey = `vision-compare-freezed-${window.location.hostname}`
      const imageData = this.imageElement?.src || ''
      const stateData = {
        ...this.state,
        imageData,
        timestamp: Date.now()
      }
      await chrome.storage.local.set({ [stateKey]: stateData })
    } catch (error) {
      // Failed to save freezed state
    }
  }

  private async clearFreezedState(): Promise<void> {
    try {
      if (!chrome.runtime?.id) return

      const stateKey = `vision-compare-freezed-${window.location.hostname}`
      await chrome.storage.local.remove([stateKey])
    } catch (error) {
      // Failed to clear freezed state
    }
  }

  private async loadState(): Promise<void> {
    try {
      const stateKey = `vision-compare-${window.location.hostname}`
      const result = await chrome.storage.local.get([stateKey])
      const savedState = result[stateKey]

      // 只有在锁定状态下保存的数据才会被恢复
      if (savedState && savedState.imageData && savedState.frozen) {
        const isExpired = Date.now() - savedState.timestamp > 24 * 60 * 60 * 1000
        if (!isExpired) {
          const { imageData, timestamp, ...stateUpdates } = savedState
          Object.assign(this.state, stateUpdates)
          this.activate(imageData)
        }
      }
    } catch (error) {
      // Failed to load state
    }
  }

  private async loadFreezedState(): Promise<void> {
    try {
      const stateKey = `vision-compare-freezed-${window.location.hostname}`
      const result = await chrome.storage.local.get([stateKey])
      const savedState = result[stateKey]

      // 只有在冻结状态下保存的数据才会被恢复
      if (savedState && savedState.imageData && savedState.freezed) {
        const isExpired = Date.now() - savedState.timestamp > 24 * 60 * 60 * 1000
        if (!isExpired) {
          const { imageData, timestamp, ...stateUpdates } = savedState
          Object.assign(this.state, stateUpdates)
          this.activate(imageData)
        }
      }
    } catch (error) {
      // Failed to load freezed state
    }
  }
}

// 创建管理器实例
new VisionCheckManager()

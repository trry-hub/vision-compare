<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useEventListener } from '@vueuse/core'
import { StorageManager } from '../../utils/storage'
import { BLEND_MODE_OPTIONS } from '../../utils/constants'

// 移除本地StorageManager定义，使用导入的版本

// 状态管理 - 使用响应式状态替代 useStorage
// 初始化状态
const initializeState = () => {
  const savedState = StorageManager.getState()
  return {
    isActive: savedState.isActive || false,
    imageData: savedState.imageData || '',
    imageLoaded: false,
    controllerVisible: savedState.controllerVisible !== undefined ? savedState.controllerVisible : true,
    controllerExpanded: savedState.controllerExpanded || false,
    imageVisible: savedState.imageVisible !== undefined ? savedState.imageVisible : true,
    imageLocked: savedState.imageLocked || false,
    imageFrozen: savedState.imageFrozen || false,
    opacity: savedState.opacity || 50,
    position: savedState.position || { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    originalSize: { width: 0, height: 0 },
    rotation: savedState.rotation || 0,
    aspectRatioLocked: savedState.aspectRatioLocked !== undefined ? savedState.aspectRatioLocked : true,
    isDragging: false,
    isResizing: false,
    dragOffset: { x: 0, y: 0 },
    // 位置控制模式
    positionMode: savedState.positionMode || 'top-left',
    positionInputs: savedState.positionInputs || { top: 0, left: 0, right: 0, bottom: 0 },
    // 混合模式
    blendMode: savedState.blendMode || 'normal'
  }
}

const state = reactive(initializeState())

// 状态变化时自动保存（排除临时状态）
const saveState = () => {
  const stateToSave = {
    isActive: state.isActive,
    imageData: state.imageData,
    controllerVisible: state.controllerVisible,
    controllerExpanded: state.controllerExpanded,
    imageVisible: state.imageVisible,
    imageLocked: state.imageLocked,
    imageFrozen: state.imageFrozen,
    opacity: state.opacity,
    position: state.position,
    rotation: state.rotation,
    aspectRatioLocked: state.aspectRatioLocked,
    positionMode: state.positionMode,
    positionInputs: state.positionInputs,
    blendMode: state.blendMode
  }
  StorageManager.updateState(stateToSave)
}

// DOM 引用
const overlayRef = ref<HTMLElement>()
const imageRef = ref<HTMLImageElement>()

// 处理图片加载
const handleImageLoad = () => {
  if (!imageRef.value) return

  const img = imageRef.value
  state.originalSize.width = img.naturalWidth
  state.originalSize.height = img.naturalHeight

  // 使用原始尺寸
  state.size.width = img.naturalWidth
  state.size.height = img.naturalHeight

  // 从左上角开始显示
  state.position.x = 0
  state.position.y = 0

  state.imageLoaded = true

  // 图片加载完成后，重新设置控制器位置到屏幕底部中间
  nextTick(() => {
    state.controllerVisible = true
    console.log('图片加载完成，控制器已显示并定位到底部中间')
  })
}

// 监听图片数据变化，手动处理图片加载
const checkImageLoad = () => {
  if (imageRef.value && state.imageData && !state.imageLoaded) {
    const img = imageRef.value
    if (img.complete && img.naturalWidth > 0) {
      handleImageLoad()
    } else {
      // 如果图片还没加载完成，设置onload事件
      img.onload = handleImageLoad
    }
  }
}

// 移除了图片拖拽功能，图片现在不可拖拽

// 控制器拖拽现在由 VueUse 的 useDraggable 处理

// 透明度调节
const adjustOpacity = (delta: number) => {
  state.opacity = Math.max(0, Math.min(100, state.opacity + delta))
}

// 图片移动
const moveImage = (dx: number, dy: number) => {
  if (state.imageLocked) return
  state.position.x += dx
  state.position.y += dy
}

// 图片缩放功能已集成到具体的按钮处理函数中

// 适应宽度
const fitWidth = () => {
  const ratio = window.innerWidth / state.originalSize.width
  state.size.width = window.innerWidth
  state.size.height = state.originalSize.height * ratio
  state.position.x = 0
  state.position.y = (window.innerHeight - state.size.height) / 2
}

// 适应高度
const fitHeight = () => {
  const ratio = window.innerHeight / state.originalSize.height
  state.size.height = window.innerHeight
  state.size.width = state.originalSize.width * ratio
  state.position.x = (window.innerWidth - state.size.width) / 2
  state.position.y = 0
}

// 原始尺寸
const resetSize = () => {
  state.size.width = state.originalSize.width
  state.size.height = state.originalSize.height
  state.position.x = 0
  state.position.y = 0
}

// 位置模式切换功能已集成到模板的 @change 事件中

// 根据模式更新位置
const updatePositionByMode = () => {
  const { top, left, right, bottom } = state.positionInputs

  switch (state.positionMode) {
    case 'top-left':
      state.position.x = left
      state.position.y = top
      break
    case 'top-right':
      state.position.x = window.innerWidth - state.size.width - right
      state.position.y = top
      break
    case 'bottom-left':
      state.position.x = left
      state.position.y = window.innerHeight - state.size.height - bottom
      break
    case 'bottom-right':
      state.position.x = window.innerWidth - state.size.width - right
      state.position.y = window.innerHeight - state.size.height - bottom
      break
    case 'center':
      state.position.x = (window.innerWidth - state.size.width) / 2 + left
      state.position.y = (window.innerHeight - state.size.height) / 2 + top
      break
    case 'free':
      // 自由模式不自动更新位置
      break
  }
}

// 更新位置输入值
const updatePositionInput = (type: 'top' | 'left' | 'right' | 'bottom', value: number) => {
  state.positionInputs[type] = value
  if (state.positionMode !== 'free') {
    updatePositionByMode()
  }
  // 保存状态
  saveState()
  // 如果已冻结，更新存储
  if (state.imageFrozen) {
    updateFrozenState()
  }
}

// 处理尺寸输入
const handleSizeInput = (type: 'width' | 'height', value: number) => {
  if (value < 1) {
    // 恢复到最小值
    if (type === 'width') {
      state.size.width = 1
    } else {
      state.size.height = 1
    }
    return
  }

  // 确保值已经设置到state中
  if (type === 'width') {
    state.size.width = value
  } else {
    state.size.height = value
  }

  // 如果宽高比锁定，计算另一个维度
  if (state.aspectRatioLocked && state.originalSize.width > 0 && state.originalSize.height > 0) {
    const aspectRatio = state.originalSize.width / state.originalSize.height

    if (type === 'width') {
      state.size.height = Math.round(value / aspectRatio)
    } else {
      state.size.width = Math.round(value * aspectRatio)
    }
  }

  // 保存状态
  saveState()
  // 如果已冻结，更新存储
  if (state.imageFrozen) {
    updateFrozenState()
  }
}

// 移除自定义键盘控制，让输入框使用原生行为

// 使用导入的混合模式选项
const blendModeOptions = BLEND_MODE_OPTIONS

// 计算图片样式
const imageStyle = computed(() => ({
  left: state.position.x + 'px',
  top: state.position.y + 'px',
  width: state.size.width + 'px',
  height: state.size.height + 'px',
  opacity: state.opacity / 100,
  transform: `rotate(${state.rotation}deg)`,
  cursor: state.imageLocked ? 'default' : 'move',
  mixBlendMode: state.blendMode as any
}))

// 计算是否禁用控制器
const isControllerDisabled = computed(() => state.imageLocked)

// 更新冻结状态到存储
const updateFrozenState = () => {
  if (!state.imageFrozen) return

  const frozenState = {
    imageData: state.imageData,
    position: { ...state.position },
    size: { ...state.size },
    originalSize: { ...state.originalSize },
    opacity: state.opacity,
    rotation: state.rotation,
    blendMode: state.blendMode,
    positionMode: state.positionMode,
    positionInputs: { ...state.positionInputs },
    timestamp: Date.now(),
    url: window.location.href,
    isActive: state.isActive,
    controllerVisible: state.controllerVisible,
    controllerExpanded: state.controllerExpanded,
    imageVisible: state.imageVisible,
    imageLocked: state.imageLocked,
    imageFrozen: state.imageFrozen,
    aspectRatioLocked: state.aspectRatioLocked
  }

  StorageManager.setFrozenState(frozenState)
}

// 冻结功能 - 保存当前状态到独立存储
const toggleFreeze = () => {
  if (state.imageFrozen) {
    // 取消冻结
    state.imageFrozen = false
    StorageManager.setFrozenState(null)
    console.log('冻结状态已取消')
  } else {
    // 冻结当前状态
    state.imageFrozen = true
    updateFrozenState()
    console.log('状态已冻结并保存')
  }

  // 保存当前状态
  saveState()
}

// 锁定功能 - 锁定时自动冻结
const toggleLock = () => {
  if (state.imageLocked) {
    // 解锁
    state.imageLocked = false
  } else {
    // 锁定时自动冻结
    state.imageLocked = true
    if (!state.imageFrozen) {
      toggleFreeze()
    }
  }
}

// 贴边功能已移除，使用位置模式替代

// 键盘事件处理
const handleKeyDown = (e: KeyboardEvent) => {
  if (!state.isActive) return

  switch (e.key.toLowerCase()) {
    case 'f':
      state.controllerVisible = !state.controllerVisible
      break
    case 'l':
      state.imageLocked = !state.imageLocked
      break
    case 'z':
      state.imageFrozen = !state.imageFrozen
      break
    case 'v':
      state.imageVisible = !state.imageVisible
      break
    case 'arrowup':
      if (e.shiftKey) {
        moveImage(0, -10)
      } else {
        adjustOpacity(5)
      }
      e.preventDefault()
      break
    case 'arrowdown':
      if (e.shiftKey) {
        moveImage(0, 10)
      } else {
        adjustOpacity(-5)
      }
      e.preventDefault()
      break
    case 'arrowleft':
      moveImage(e.shiftKey ? -10 : -1, 0)
      e.preventDefault()
      break
    case 'arrowright':
      moveImage(e.shiftKey ? 10 : 1, 0)
      e.preventDefault()
      break
    case 'escape':
      exitComparison()
      break
  }
}

// 退出对比模式
const exitComparison = () => {
  // 清理所有相关缓存
  StorageManager.clearAll()

  // 重置状态
  state.isActive = false
  state.imageData = ''
  state.imageLoaded = false
  state.controllerVisible = false
  state.imageFrozen = false
  state.imageLocked = false

  console.log('所有插件缓存已清理，状态已重置')
}

// Chrome扩展消息处理
const handleMessage = (request: any, _sender: any, sendResponse: (response: any) => void) => {
  try {
    console.log('收到消息:', request.action)

    switch (request.action) {
      case 'ping':
        console.log('响应 ping 请求')
        sendResponse({ success: true })
        break
      case 'checkStatus':
        const status = {
          isActive: state.isActive,
          toolbarVisible: state.controllerVisible
        }
        console.log('返回状态:', status)
        sendResponse(status)
        break
      case 'uploadImage':
        try {
          console.log('开始处理图片上传...')

          if (!request.imageData) {
            throw new Error('图片数据为空')
          }

          // 验证图片数据格式
          if (!request.imageData.startsWith('data:image/')) {
            throw new Error('无效的图片数据格式')
          }

          state.imageData = request.imageData
          state.isActive = true
          state.imageLoaded = false
          state.controllerVisible = true // 确保控制器显示
          state.controllerExpanded = false // 默认收起状态

          console.log('图片数据已设置，等待加载...')

          nextTick(() => {
            checkImageLoad()
          })

          sendResponse({ success: true })
        } catch (error) {
          console.error('处理图片上传时出错:', error)
          sendResponse({ success: false, error: (error as Error).message })
        }
        break
      case 'toggleControllerVisibility':
        state.controllerVisible = !state.controllerVisible
        console.log('切换控制器可见性:', state.controllerVisible)
        sendResponse({ success: true })
        break
      case 'exit':
        console.log('退出对比模式')
        exitComparison()
        sendResponse({ success: true })
        break
      case 'command':
        // 处理快捷键命令
        console.log('处理快捷键命令:', request.command)
        switch (request.command) {
          case 'vc_toggle_panel':
            state.controllerVisible = !state.controllerVisible
            break
          case 'vc_toggle_lock':
            state.imageLocked = !state.imageLocked
            break
          case 'vc_toggle_difference':
            state.imageFrozen = !state.imageFrozen
            break
          case 'vc_exit':
            exitComparison()
            break
        }
        sendResponse({ success: true })
        break
      default:
        console.warn('未知的消息类型:', request.action)
        sendResponse({ success: false, error: '未知的消息类型' })
    }
  } catch (error) {
    console.error('处理消息时出错:', error)
    sendResponse({ success: false, error: (error as Error).message })
  }
}

// 使用 VueUse 的 useEventListener 处理键盘事件
useEventListener('keydown', handleKeyDown)

// 恢复冻结状态
const restoreFrozenState = () => {
  try {
    const frozenState = StorageManager.getFrozenState()
    if (frozenState && frozenState.url === window.location.href && frozenState.imageData) {
      console.log('恢复冻结状态...')

      // 恢复图片数据和状态
      state.imageData = frozenState.imageData
      state.isActive = true
      state.imageFrozen = true
      state.position = { ...frozenState.position }
      state.size = { ...frozenState.size }
      state.originalSize = { ...frozenState.originalSize }
      state.opacity = frozenState.opacity
      state.rotation = frozenState.rotation || 0
      state.blendMode = frozenState.blendMode || 'normal'
      state.positionMode = frozenState.positionMode || 'free'
      state.positionInputs = { ...frozenState.positionInputs }
      state.controllerVisible = true
      state.imageLoaded = true

      console.log('冻结状态已恢复')
    }
  } catch (error) {
    console.error('恢复冻结状态失败:', error)
  }
}

// 生命周期
onMounted(() => {
  try {
    console.log('Vision Compare content script 初始化中...')

    // 恢复冻结状态
    restoreFrozenState()

    // 添加消息监听器
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage)
      console.log('消息监听器已添加')
    } else {
      console.error('Chrome runtime API 不可用')
    }

    console.log('Vision Compare content script 初始化完成')
  } catch (error) {
    console.error('初始化 content script 时出错:', error)
  }
})

onUnmounted(() => {
  try {
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(handleMessage)
      console.log('消息监听器已移除')
    }
  } catch (error) {
    console.error('清理 content script 时出错:', error)
  }
})
</script>

<template>
  <!-- 主覆盖层 -->
  <div v-if="state.isActive" class="vc-overlay" ref="overlayRef">
    <!-- 参考图片 -->
    <img
      v-if="state.imageData && state.imageVisible"
      ref="imageRef"
      :src="state.imageData"
      class="vc-reference-image"
      :class="{
        'vc-locked': state.imageLocked,
        'vc-frozen': state.imageFrozen,
        'vc-dragging': state.isDragging
      }"
      :style="imageStyle"
    />

    <!-- 控制面板 - 长条形布局 -->
    <div v-if="state.controllerVisible" class="vc-controller-panel">
      <!-- 透明度控制 -->
      <div class="vc-control-group">
        <label class="vc-control-label">透明度</label>
        <div class="vc-slider-container">
          <input
            type="range"
            min="0"
            max="100"
            v-model="state.opacity"
            class="vc-slider"
            :disabled="isControllerDisabled"
          />
          <span class="vc-slider-value">{{ state.opacity }}%</span>
        </div>
      </div>
      <!-- 尺寸控制 -->
      <div class="vc-control-group">
        <label class="vc-control-label">尺寸</label>
        <div class="vc-size-controls">
          <div class="vc-size-inputs">
            <div class="vc-input-group">
              <label class="vc-input-label">W</label>
              <input
                type="number"
                v-model.number="state.size.width"
                @keydown.stop="(e) => handleSizeInput('width', parseInt((e.target as HTMLInputElement).value) || 1)"
                :disabled="isControllerDisabled"
                class="vc-input"
                min="1"
              />
            </div>
            <div class="vc-input-group">
              <label class="vc-input-label">H</label>
              <input
                type="number"
                v-model.number="state.size.height"
                @keydown.stop="(e) => handleSizeInput('height', parseInt((e.target as HTMLInputElement).value) || 1)"
                :disabled="isControllerDisabled"
                class="vc-input"
                min="1"
              />
            </div>
          </div>
          <button @click="fitWidth" class="vc-btn vc-btn-sm" title="适应宽度" :disabled="isControllerDisabled">适宽</button>
          <button @click="fitHeight" class="vc-btn vc-btn-sm" title="适应高度" :disabled="isControllerDisabled">适高</button>
          <button @click="resetSize" class="vc-btn vc-btn-sm" title="原始尺寸" :disabled="isControllerDisabled">1:1</button>
          <button
            @click="state.aspectRatioLocked = !state.aspectRatioLocked"
            class="vc-btn vc-btn-sm"
            :class="{ 'vc-active': state.aspectRatioLocked }"
            :disabled="isControllerDisabled"
            title="宽高比锁定"
          >
            🔗
          </button>
        </div>
      </div>

      <!-- 位置控制 -->
      <div class="vc-control-group">
        <label class="vc-control-label">位置</label>

        <!-- 位置模式选择 -->
        <div class="vc-position-mode">
          <select v-model="state.positionMode" @change="updatePositionByMode" class="vc-select" :disabled="isControllerDisabled">
            <option value="free">自由</option>
            <option value="top-left">左上</option>
            <option value="top-right">右上</option>
            <option value="bottom-left">左下</option>
            <option value="bottom-right">右下</option>
            <option value="center">居中</option>
          </select>

          <!-- 位置输入框 -->
          <div class="vc-position-inputs">
            <div class="vc-input-row">
              <div class="vc-input-group">
                <label class="vc-input-label">T</label>
                <input
                  type="number"
                  v-model.number="state.positionInputs.top"
                  @keydown.stop="updatePositionInput('top', state.positionInputs.top)"
                  :disabled="isControllerDisabled || state.positionMode === 'bottom-left' || state.positionMode === 'bottom-right'"
                  class="vc-input"
                  :class="{ 'vc-input-disabled': isControllerDisabled || state.positionMode === 'bottom-left' || state.positionMode === 'bottom-right' }"
                />
              </div>
              <div class="vc-input-group">
                <label class="vc-input-label">L</label>
                <input
                  type="number"
                  v-model.number="state.positionInputs.left"
                  @keydown.stop="updatePositionInput('left', state.positionInputs.left)"
                  :disabled="isControllerDisabled || state.positionMode === 'top-right' || state.positionMode === 'bottom-right'"
                  class="vc-input"
                  :class="{ 'vc-input-disabled': isControllerDisabled || state.positionMode === 'top-right' || state.positionMode === 'bottom-right' }"
                />
              </div>
              <div class="vc-input-group">
                <label class="vc-input-label">B</label>
                <input
                  type="number"
                  v-model.number="state.positionInputs.bottom"
                  @keydown.stop="updatePositionInput('bottom', state.positionInputs.bottom)"
                  :disabled="isControllerDisabled || state.positionMode === 'top-left' || state.positionMode === 'top-right'"
                  class="vc-input"
                  :class="{ 'vc-input-disabled': isControllerDisabled || state.positionMode === 'top-left' || state.positionMode === 'top-right' }"
                />
              </div>
              <div class="vc-input-group">
                <label class="vc-input-label">R</label>
                <input
                  type="number"
                  v-model.number="state.positionInputs.right"
                  @keydown.stop="updatePositionInput('right', state.positionInputs.right)"
                  :disabled="isControllerDisabled || state.positionMode === 'top-left' || state.positionMode === 'bottom-left'"
                  class="vc-input"
                  :class="{ 'vc-input-disabled': isControllerDisabled || state.positionMode === 'top-left' || state.positionMode === 'bottom-left' }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 混合模式控制 -->
      <div class="vc-control-group">
        <label class="vc-control-label">混合</label>
        <div class="vc-blend-controls">
          <select v-model="state.blendMode" class="vc-blend-select" :disabled="isControllerDisabled">
            <option
              v-for="option in blendModeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>

      <!-- 状态控制 -->
      <div class="vc-control-group">
        <label class="vc-control-label">状态</label>
        <div class="vc-toggle-controls">
          <button
            @click="state.imageVisible = !state.imageVisible"
            class="vc-btn vc-btn-sm"
            :class="{ 'vc-active': state.imageVisible }"
            title="显示/隐藏图片"
          >
            👁️
          </button>
          <button
            @click="toggleLock"
            class="vc-btn vc-btn-sm"
            :class="{ 'vc-active': state.imageLocked }"
            title="锁定/解锁图片（锁定时自动冻结）"
          >
            🔒
          </button>
          <button
            @click="toggleFreeze"
            class="vc-btn vc-btn-sm"
            :class="{ 'vc-active': state.imageFrozen }"
            title="冻结/解冻图片（保存当前状态）"
          >
            ❄️
          </button>
          <button @click="exitComparison" class="vc-btn vc-btn-sm vc-btn-danger" title="退出对比">
            ❌
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
// SCSS 变量
$vc-z-index: 999999;
$vc-primary-color: #4f7cff;
$vc-danger-color: #ff3b30;
$vc-bg-dark: rgba(0, 0, 0, 0.75);
$vc-border-light: rgba(255, 255, 255, 0.2);
$vc-text-primary: white;
$vc-text-secondary: rgba(255, 255, 255, 0.8);
$vc-text-muted: rgba(255, 255, 255, 0.7);
$vc-input-bg: rgba(255, 255, 255, 0.1);
$vc-input-border: rgba(255, 255, 255, 0.3);
$vc-disabled-bg: rgba(255, 255, 255, 0.05);
$vc-disabled-text: rgba(255, 255, 255, 0.3);

// Mixins
@mixin flex-center {
  display: flex;
  align-items: center;
}

@mixin button-base {
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  white-space: nowrap;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

@mixin input-base {
  border: 1px solid $vc-input-border;
  border-radius: 3px;
  background: $vc-input-bg;
  color: $vc-text-primary;

  &:focus {
    outline: none;
    border-color: $vc-primary-color;
    box-shadow: 0 0 0 1px rgba(79, 124, 255, 0.3);
  }

  &:disabled,
  &.vc-input-disabled {
    background: $vc-disabled-bg;
    color: $vc-disabled-text;
    cursor: not-allowed;
  }
}

/* 覆盖层基础样式 */
.vc-overlay {
  position: fixed;
  font-size: 14px;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: $vc-z-index;
}

/* 参考图片样式 */
.vc-reference-image {
  position: absolute;
  max-width: unset;
  pointer-events: none;
  user-select: none;
  transition: opacity 0.2s ease;
  border: none;
  margin: 0;
  padding: 0;
  box-sizing: content-box;

  &.vc-dragging {
    transition: none;
  }
}

/* 控制面板样式 - 响应式设计 */
.vc-controller-panel {
  position: absolute;
  bottom: 0;
  left: 50%;
  pointer-events: auto;
  z-index: $vc-z-index + 1;
  user-select: none;
  transform: translateX(-50%);
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  padding: 8px 12px;
  background: $vc-bg-dark;
  backdrop-filter: blur(20px);
  border: 1px solid $vc-border-light;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  gap: 5px 10px;
  color: $vc-text-primary;
  overflow-x: auto;
  @include flex-center;

  // 桌面端默认样式 - 水平布局
  max-width: 95vw;

  // 平板端适配 (768px - 1024px)
  @media (max-width: 1024px) and (min-width: 769px) {
    max-width: 90vw;
    padding: 6px 10px;
    gap: 4px 8px;
    flex-wrap: wrap;
    justify-content: center;
  }

  // 移动端适配 (≤768px)
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    max-width: 95vw;
    max-height: 60vh;
    padding: 8px;
    gap: 6px;
    overflow-y: auto;
    overflow-x: hidden;
    border-radius: 10px;

    // 小屏幕时调整位置，避免遮挡内容
    bottom: 10px;
  }

  // 超小屏幕适配 (≤480px)
  @media (max-width: 480px) {
    max-width: 98vw;
    padding: 6px;
    gap: 4px;
    font-size: 12px;
  }
}

/* 控制组样式 - 响应式布局 */
.vc-control-group {
  @include flex-center;
  gap: 5px;
  flex-shrink: 0;

  &:last-child {
    margin-right: 0;
  }

  // 平板端适配
  @media (max-width: 1024px) and (min-width: 769px) {
    gap: 4px;
  }

  // 移动端适配 - 垂直布局时调整
  @media (max-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 4px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    &:last-child {
      border-bottom: none;
    }
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    gap: 3px;
    padding: 3px 0;
  }
}

.vc-control-label {
  font-weight: 600;
  color: $vc-text-secondary;
  white-space: nowrap;
  margin: 0;

  &::after {
    content: ':';
  }

  // 移动端适配 - 标签样式调整
  @media (max-width: 768px) {
    min-width: 40px;
    font-size: 13px;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    min-width: 35px;
    font-size: 12px;
  }
}

/* 滑块样式 - 响应式适配 */
.vc-slider-container {
  display: flex;
  align-items: center;
  gap: 8px;

  // 移动端适配
  @media (max-width: 768px) {
    flex: 1;
    gap: 6px;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    gap: 4px;
  }
}

.vc-slider {
  width: 100px;
  height: 3px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;
  appearance: none;

  // 平板端适配
  @media (max-width: 1024px) and (min-width: 769px) {
    width: 80px;
  }

  // 移动端适配
  @media (max-width: 768px) {
    width: 60px;
    flex: 1;
    min-width: 50px;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    width: 50px;
    min-width: 40px;
  }
}

.vc-slider::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  background: #4f7cff;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid white;

  // 移动端适配 - 增大触摸区域
  @media (max-width: 768px) {
    width: 16px;
    height: 16px;
  }
}

.vc-slider-value {
  color: rgba(255, 255, 255, 0.9);
  min-width: 20px;
  text-align: right;
  font-size: 12px;

  // 移动端适配
  @media (max-width: 768px) {
    min-width: 25px;
    font-size: 11px;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    min-width: 20px;
    font-size: 10px;
  }
}

/* 按钮样式 - 响应式适配 */
.vc-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  white-space: nowrap;

  // 平板端适配
  @media (max-width: 1024px) and (min-width: 769px) {
    padding: 3px 6px;
    font-size: 13px;
  }

  // 移动端适配 - 增大触摸区域
  @media (max-width: 768px) {
    padding: 6px 10px;
    min-height: 32px;
    font-size: 12px;
    border-radius: 6px;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    padding: 5px 8px;
    min-height: 28px;
    font-size: 11px;
  }
}

.vc-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);

  // 移动端禁用hover效果
  @media (max-width: 768px) {
    transform: none;
  }
}

.vc-btn.vc-active {
  background: #4f7cff;
  color: white;
}

.vc-btn.vc-btn-sm {
  padding: 3px 6px;
  min-width: 24px;

  // 移动端适配
  @media (max-width: 768px) {
    padding: 4px 8px;
    min-width: 28px;
    min-height: 28px;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    padding: 3px 6px;
    min-width: 24px;
    min-height: 24px;
  }
}

.vc-btn.vc-btn-danger {
  background: #ff3b30;
  color: white;
}

.vc-btn.vc-btn-danger:hover {
  background: #d70015;
}

/* 位置控制样式 - 响应式适配 */
.vc-position-mode {
  display: flex;
  align-items: center;
  gap: 6px;

  // 移动端适配
  @media (max-width: 768px) {
    flex: 1;
    gap: 4px;
    flex-wrap: wrap;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    gap: 3px;
  }
}

.vc-select {
  padding: 0 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  min-width: 80px;

  // 移动端适配
  @media (max-width: 768px) {
    min-width: 60px;
    padding: 2px 4px;
    font-size: 12px;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    min-width: 50px;
    font-size: 11px;
  }
}

.vc-position-inputs {
  display: flex;
  gap: 6px;
  align-items: center;

  // 移动端适配
  @media (max-width: 768px) {
    gap: 4px;
    flex-wrap: wrap;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    gap: 2px;
  }
}

.vc-input-row {
  display: flex;
  gap: 4px;
  align-items: center;

  // 移动端适配
  @media (max-width: 768px) {
    gap: 3px;
    flex-wrap: wrap;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    gap: 2px;
  }
}

.vc-input-group {
  display: flex;
  align-items: center;
  gap: 2px;

  // 移动端适配
  @media (max-width: 768px) {
    gap: 1px;
  }
}

.vc-input-label {
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
  min-width: 20px;
  text-align: right;
  &:after {
    content: ':'
  }

  // 移动端适配
  @media (max-width: 768px) {
    min-width: 15px;
    font-size: 11px;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    min-width: 12px;
    font-size: 10px;
  }
}

.vc-input {
  width: 40px;
  padding: 0px 4px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 12px;

  // 移动端适配 - 增大触摸区域
  @media (max-width: 768px) {
    width: 35px;
    padding: 2px 4px;
    min-height: 24px;
    font-size: 11px;
    border-radius: 4px;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    width: 30px;
    padding: 1px 3px;
    min-height: 20px;
    font-size: 10px;
  }
}

.vc-input:focus {
  outline: none;
  border-color: #4f7cff;
  box-shadow: 0 0 0 1px rgba(79, 124, 255, 0.3);
}

.vc-input-disabled {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

/* 混合模式控制样式 - 响应式适配 */
.vc-blend-controls {
  display: flex;
  align-items: center;

  // 移动端适配
  @media (max-width: 768px) {
    flex: 1;
  }
}

.vc-blend-select {
  padding: 0 6px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  min-width: 100px;
  cursor: pointer;

  // 平板端适配
  @media (max-width: 1024px) and (min-width: 769px) {
    min-width: 80px;
    font-size: 13px;
  }

  // 移动端适配
  @media (max-width: 768px) {
    min-width: 70px;
    padding: 2px 4px;
    font-size: 12px;
    flex: 1;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    min-width: 60px;
    font-size: 11px;
  }
}

.vc-blend-select:focus {
  outline: none;
  border-color: #4f7cff;
  box-shadow: 0 0 0 1px rgba(79, 124, 255, 0.3);
}

.vc-blend-select option {
  background: rgba(0, 0, 0, 0.9);
  color: white;
}

/* 控制按钮组样式 - 响应式适配 */
.vc-position-controls,
.vc-size-controls,
.vc-toggle-controls {
  display: flex;
  gap: 3px;
  align-items: center;

  // 移动端适配
  @media (max-width: 768px) {
    gap: 4px;
    flex-wrap: wrap;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    gap: 2px;
  }
}

.vc-position-controls {
  display: flex;
  gap: 2px;

  // 移动端适配
  @media (max-width: 768px) {
    gap: 3px;
  }
}

.vc-size-controls {
  // 移动端适配
  @media (max-width: 768px) {
    flex: 1;
    justify-content: flex-end;
  }
}

.vc-size-inputs {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;

  // 移动端适配
  @media (max-width: 768px) {
    gap: 3px;
    margin-right: 6px;
    flex-wrap: wrap;
  }

  // 超小屏幕适配
  @media (max-width: 480px) {
    gap: 2px;
    margin-right: 4px;
  }
}

.vc-toggle-controls {
  // 移动端适配
  @media (max-width: 768px) {
    flex: 1;
    justify-content: flex-end;
  }
}
</style>
<script setup lang="ts">
import { QxsIcon } from '@qxs-bns/components/es/src/icon/index'
import { useEventListener } from '@vueuse/core'
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { BLEND_MODE_OPTIONS } from '../../utils/constants'
import { StorageManager } from '../../utils/storage'

// Chrome API 类型声明
declare const chrome: {
  runtime: {
    onMessage: {
      addListener: (callback: (message: any, sender: any, sendResponse: (response: any) => void) => void) => void
      removeListener: (callback: (message: any, sender: any, sendResponse: (response: any) => void) => void) => void
    }
  }
}

// 移除本地StorageManager定义，使用导入的版本

// 状态管理 - 使用响应式状态替代 useStorage
// 初始化状态
function initializeState() {
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
    blendMode: savedState.blendMode || 'normal',
  }
}

const state = reactive(initializeState())

// 状态变化时自动保存（排除临时状态）
function saveState() {
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
    blendMode: state.blendMode,
  }
  StorageManager.updateState(stateToSave)
}

// DOM 引用
const overlayRef = ref<HTMLElement>()
const imageRef = ref<HTMLImageElement>()

// 处理图片加载
function handleImageLoad() {
  if (!imageRef.value) {
    return
  }

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
  })
}

// 监听图片数据变化，手动处理图片加载
function checkImageLoad() {
  if (imageRef.value && state.imageData && !state.imageLoaded) {
    const img = imageRef.value
    if (img.complete && img.naturalWidth > 0) {
      handleImageLoad()
    }
    else {
      // 如果图片还没加载完成，设置onload事件
      img.onload = handleImageLoad
    }
  }
}

// 移除了图片拖拽功能，图片现在不可拖拽

// 控制器拖拽现在由 VueUse 的 useDraggable 处理

// 透明度调节
function adjustOpacity(delta: number) {
  state.opacity = Math.max(0, Math.min(100, state.opacity + delta))
}

// 图片移动
function moveImage(dx: number, dy: number) {
  if (state.imageLocked) {
    return
  }
  state.position.x += dx
  state.position.y += dy
}

// 图片缩放功能已集成到具体的按钮处理函数中

// 适应宽度
function fitWidth() {
  const ratio = window.innerWidth / state.originalSize.width
  state.size.width = window.innerWidth
  state.size.height = state.originalSize.height * ratio
  state.position.x = 0
  state.position.y = (window.innerHeight - state.size.height) / 2
}

// 适应高度
function fitHeight() {
  const ratio = window.innerHeight / state.originalSize.height
  state.size.height = window.innerHeight
  state.size.width = state.originalSize.width * ratio
  state.position.x = (window.innerWidth - state.size.width) / 2
  state.position.y = 0
}

// 原始尺寸
function resetSize() {
  state.size.width = state.originalSize.width
  state.size.height = state.originalSize.height
  state.position.x = 0
  state.position.y = 0
}

// 位置模式切换功能已集成到模板的 @change 事件中

// 根据模式更新位置
function updatePositionByMode() {
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
function updatePositionInput(type: 'top' | 'left' | 'right' | 'bottom', value: number) {
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
function handleSizeInput(type: 'width' | 'height', value: number) {
  // 防止无效值
  if (Number.isNaN(value) || value < 1) {
    value = 1
  }

  // 如果宽高比锁定，计算另一个维度
  if (state.aspectRatioLocked && state.originalSize.width > 0 && state.originalSize.height > 0) {
    const aspectRatio = state.originalSize.width / state.originalSize.height

    if (type === 'width') {
      state.size.width = value
      state.size.height = Math.round(value / aspectRatio)
    }
    else {
      state.size.height = value
      state.size.width = Math.round(value * aspectRatio)
    }
  }
  else {
    // 如果没有锁定宽高比，直接设置值
    if (type === 'width') {
      state.size.width = value
    }
    else {
      state.size.height = value
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

// 处理混合模式变化
function handleBlendModeChange() {
  // 保存状态
  saveState()

  if (state.imageFrozen) {
    updateFrozenState()
  }
}

// 计算图片样式
const imageStyle = computed(() => ({
  left: `${state.position.x}px`,
  top: `${state.position.y}px`,
  width: `${state.size.width}px`,
  height: `${state.size.height}px`,
  opacity: state.opacity / 100,
  transform: `rotate(${state.rotation}deg)`,
  cursor: state.imageLocked ? 'default' : 'move',
  mixBlendMode: state.blendMode as any,
}))

// 计算是否禁用控制器
const isControllerDisabled = computed(() => state.imageLocked)

// 更新冻结状态到存储
function updateFrozenState() {
  if (!state.imageFrozen) {
    return
  }

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
    aspectRatioLocked: state.aspectRatioLocked,
  }

  StorageManager.setFrozenState(frozenState)
}

// 冻结功能 - 保存当前状态到独立存储
function toggleFreeze() {
  if (state.imageFrozen) {
    // 取消冻结
    state.imageFrozen = false
    StorageManager.setFrozenState(null)
  }
  else {
    // 冻结当前状态
    state.imageFrozen = true
    updateFrozenState()
  }

  // 保存当前状态
  saveState()
}

// 锁定功能 - 锁定时自动冻结
function toggleLock() {
  if (state.imageLocked) {
    // 解锁
    state.imageLocked = false
  }
  else {
    // 锁定时自动冻结
    state.imageLocked = true
    if (!state.imageFrozen) {
      toggleFreeze()
    }
  }
}

// 贴边功能已移除，使用位置模式替代

// 键盘事件处理
function handleKeyDown(e: KeyboardEvent) {
  if (!state.isActive) {
    return
  }

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
      }
      else {
        adjustOpacity(5)
      }
      e.preventDefault()
      break
    case 'arrowdown':
      if (e.shiftKey) {
        moveImage(0, 10)
      }
      else {
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
function exitComparison() {
  // 清理所有相关缓存
  StorageManager.clearAll()

  // 重置状态
  state.isActive = false
  state.imageData = ''
  state.imageLoaded = false
  state.controllerVisible = false
  state.imageFrozen = false
  state.imageLocked = false
}

// Chrome扩展消息处理
function handleMessage(request: any, _sender: any, sendResponse: (response: any) => void) {
  try {
    switch (request.action) {
      case 'ping':
        sendResponse({ success: true })
        break
      case 'checkStatus': {
        const status = {
          isActive: state.isActive,
          toolbarVisible: state.controllerVisible,
        }
        sendResponse(status)
        break
      }
      case 'uploadImage':
        try {
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

          nextTick(() => {
            checkImageLoad()
          })

          sendResponse({ success: true })
        }
        catch (error) {
          console.error('处理图片上传时出错:', error)
          sendResponse({ success: false, error: (error as Error).message })
        }
        break
      case 'toggleControllerVisibility':
        state.controllerVisible = !state.controllerVisible
        sendResponse({ success: true })
        break
      case 'exit':
        exitComparison()
        sendResponse({ success: true })
        break
      case 'command':
        // 处理快捷键命令
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
        sendResponse({ success: false, error: '未知的消息类型' })
    }
  }
  catch (error) {
    console.error('处理消息时出错:', error)
    sendResponse({ success: false, error: (error as Error).message })
  }
}

// 使用 VueUse 的 useEventListener 处理键盘事件
useEventListener('keydown', handleKeyDown)

// 恢复冻结状态
function restoreFrozenState() {
  try {
    const frozenState = StorageManager.getFrozenState()
    if (frozenState && frozenState.url === window.location.href && frozenState.imageData) {
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
    }
  }
  catch (error) {
    console.error('恢复冻结状态失败:', error)
  }
}

// 生命周期
onMounted(() => {
  try {
    // 恢复冻结状态
    restoreFrozenState()

    // 添加消息监听器
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage)
    }
    else {
      console.error('Chrome runtime API 不可用')
    }
  }
  catch (error) {
    console.error('初始化 content script 时出错:', error)
  }
})

onUnmounted(() => {
  try {
    if (chrome?.runtime?.onMessage) {
      chrome.runtime.onMessage.removeListener(handleMessage)
    }
  }
  catch (error) {
    console.error('清理 content script 时出错:', error)
  }
})
</script>

<template>
  <!-- 参考图片 - 直接插入body，确保混合模式生效 -->
  <img
    v-if="state.isActive && state.imageData && state.imageVisible"
    ref="imageRef"
    :src="state.imageData"
    class="vc-reference-image"
    :class="{
      'vc-locked': state.imageLocked,
      'vc-frozen': state.imageFrozen,
      'vc-dragging': state.isDragging,
    }"
    :style="imageStyle"
  >

  <!-- 控制面板覆盖层 -->
  <div
    v-if="state.isActive"
    ref="overlayRef"
    class="vc-overlay"
  >
    <!-- 控制面板 - 长条形布局 -->
    <div v-if="state.controllerVisible" class="vc-controller-panel">
      <!-- 透明度控制 -->
      <div class="vc-control-group">
        <label class="vc-control-label">透明度</label>
        <div class="vc-slider-container">
          <input
            v-model="state.opacity"
            type="range"
            min="0"
            max="100"
            class="vc-slider"
            :disabled="isControllerDisabled"
          >
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
                :value="state.size.width"
                :disabled="isControllerDisabled"
                class="vc-input"
                min="1"
                @input="(e) => handleSizeInput('width', parseInt((e.target as HTMLInputElement).value) || 1)"
                @blur="(e) => handleSizeInput('width', parseInt((e.target as HTMLInputElement).value) || 1)"
              >
            </div>
            <div class="vc-input-group">
              <label class="vc-input-label">H</label>
              <input
                type="number"
                :value="state.size.height"
                :disabled="isControllerDisabled"
                class="vc-input"
                min="1"
                @input="(e) => handleSizeInput('height', parseInt((e.target as HTMLInputElement).value) || 1)"
                @blur="(e) => handleSizeInput('height', parseInt((e.target as HTMLInputElement).value) || 1)"
              >
            </div>
          </div>
          <div class="vc-btn-group">
            <button
              class="vc-btn vc-btn-sm"
              title="适应宽度"
              :disabled="isControllerDisabled"
              @click="fitWidth"
            >
              <QxsIcon icon="mdi:arrow-expand-horizontal" />
            </button>
            <button
              class="vc-btn vc-btn-sm"
              title="适应高度"
              :disabled="isControllerDisabled"
              @click="fitHeight"
            >
              <QxsIcon icon="mdi:arrow-expand-vertical" />
            </button>
            <button
              class="vc-btn vc-btn-sm"
              title="原始尺寸"
              :disabled="isControllerDisabled"
              @click="resetSize"
            >
              <QxsIcon icon="mdi:backup-restore" />
            </button>
            <button
              class="vc-btn vc-btn-sm"
              :class="{ 'vc-active': state.aspectRatioLocked }"
              :disabled="isControllerDisabled"
              title="宽高比锁定"
              @click="state.aspectRatioLocked = !state.aspectRatioLocked"
            >
              <QxsIcon icon="mdi:link-variant" :class="{ 'vc-icon-active': state.aspectRatioLocked }" />
            </button>
          </div>
        </div>
      </div>

      <!-- 位置控制 -->
      <div class="vc-control-group">
        <label class="vc-control-label">位置</label>

        <!-- 位置模式选择 -->
        <div class="vc-position-mode">
          <select
            v-model="state.positionMode"
            class="vc-select"
            :disabled="isControllerDisabled"
            @change="updatePositionByMode"
          >
            <option value="free">
              自由
            </option>
            <option value="top-left">
              左上
            </option>
            <option value="top-right">
              右上
            </option>
            <option value="bottom-left">
              左下
            </option>
            <option value="bottom-right">
              右下
            </option>
            <option value="center">
              居中
            </option>
          </select>

          <!-- 位置输入框 -->
          <div class="vc-position-inputs">
            <div class="vc-input-row">
              <div class="vc-input-group">
                <label class="vc-input-label">T</label>
                <input
                  v-model.number="state.positionInputs.top"
                  type="number"
                  :disabled="isControllerDisabled || state.positionMode === 'bottom-left' || state.positionMode === 'bottom-right'"
                  class="vc-input"
                  :class="{ 'vc-input-disabled': isControllerDisabled || state.positionMode === 'bottom-left' || state.positionMode === 'bottom-right' }"
                  @keydown.stop="updatePositionInput('top', state.positionInputs.top)"
                >
              </div>
              <div class="vc-input-group">
                <label class="vc-input-label">L</label>
                <input
                  v-model.number="state.positionInputs.left"
                  type="number"
                  :disabled="isControllerDisabled || state.positionMode === 'top-right' || state.positionMode === 'bottom-right'"
                  class="vc-input"
                  :class="{ 'vc-input-disabled': isControllerDisabled || state.positionMode === 'top-right' || state.positionMode === 'bottom-right' }"
                  @keydown.stop="updatePositionInput('left', state.positionInputs.left)"
                >
              </div>
              <div class="vc-input-group">
                <label class="vc-input-label">B</label>
                <input
                  v-model.number="state.positionInputs.bottom"
                  type="number"
                  :disabled="isControllerDisabled || state.positionMode === 'top-left' || state.positionMode === 'top-right'"
                  class="vc-input"
                  :class="{ 'vc-input-disabled': isControllerDisabled || state.positionMode === 'top-left' || state.positionMode === 'top-right' }"
                  @keydown.stop="updatePositionInput('bottom', state.positionInputs.bottom)"
                >
              </div>
              <div class="vc-input-group">
                <label class="vc-input-label">R</label>
                <input
                  v-model.number="state.positionInputs.right"
                  type="number"
                  :disabled="isControllerDisabled || state.positionMode === 'top-left' || state.positionMode === 'bottom-left'"
                  class="vc-input"
                  :class="{ 'vc-input-disabled': isControllerDisabled || state.positionMode === 'top-left' || state.positionMode === 'bottom-left' }"
                  @keydown.stop="updatePositionInput('right', state.positionInputs.right)"
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 混合模式控制 -->
      <div class="vc-control-group">
        <label class="vc-control-label">混合</label>
        <div class="vc-blend-controls">
          <select
            v-model="state.blendMode"
            class="vc-select"
            :disabled="isControllerDisabled"
            @change="handleBlendModeChange"
          >
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
        <div class="vc-btn-group">
          <button
            class="vc-btn vc-btn-sm"
            :class="{ 'vc-active': state.imageVisible }"
            title="显示/隐藏图片"
            @click="state.imageVisible = !state.imageVisible"
          >
            <QxsIcon :icon="state.imageVisible ? 'mdi:eye' : 'mdi:eye-off'" :class="{ 'vc-icon-active': state.imageVisible }" />
          </button>
          <button
            class="vc-btn vc-btn-sm"
            :class="{ 'vc-active': state.imageLocked }"
            title="锁定/解锁图片（锁定时自动冻结）"
            @click="toggleLock"
          >
            <QxsIcon :icon="state.imageLocked ? 'mdi:lock' : 'mdi:lock-open'" :class="{ 'vc-icon-active': state.imageLocked }" />
          </button>
          <button
            class="vc-btn vc-btn-sm"
            :class="{ 'vc-active': state.imageFrozen }"
            title="冻结/解冻图片（保存当前状态）"
            @click="toggleFreeze"
          >
            <QxsIcon icon="mdi:snowflake" :class="{ 'vc-icon-active': state.imageFrozen }" />
          </button>
          <button
            class="vc-btn vc-btn-sm vc-btn-danger"
            title="退出对比"
            @click="exitComparison"
          >
            <QxsIcon icon="mdi:close" class="vc-icon-danger" />
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
$vc-bg-dark: rgb(0 0 0 / 75%);
$vc-border-light: rgb(255 255 255 / 20%);
$vc-text-primary: white;
$vc-text-secondary: rgb(255 255 255 / 80%);
$vc-text-muted: rgb(255 255 255 / 70%);
$vc-input-bg: rgb(255 255 255 / 10%);
$vc-input-border: rgb(255 255 255 / 30%);
$vc-disabled-bg: rgb(255 255 255 / 5%);
$vc-disabled-text: rgb(255 255 255 / 30%);

// Mixins
@mixin flex-center {
  display: flex;
  align-items: center;
}

@mixin button-base {
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  border: none;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

@mixin input-base {
  color: $vc-text-primary;
  background: $vc-input-bg;
  border: 1px solid $vc-input-border;
  border-radius: 3px;

  &:focus {
    outline: none;
    border-color: $vc-primary-color;
    box-shadow: 0 0 0 1px rgb(79 124 255 / 30%);
  }

  &:disabled,
  &.vc-input-disabled {
    color: $vc-disabled-text;
    cursor: not-allowed;
    background: $vc-disabled-bg;
  }
}

/* 覆盖层基础样式 - 仅用于控制面板 */
.vc-overlay {
  position: fixed;
  top: 0;
  left: 0;
  z-index: $vc-z-index;
  width: 100vw;
  height: 100vh;
  font-size: 12px;
  pointer-events: none;

  // 控制面板层不需要与页面内容混合，可以有独立的层叠上下文
  isolation: isolate;
}

/* 参考图片样式 - 直接在body层级 */
.vc-reference-image {
  position: fixed;

  // 设置合适的z-index，低于控制面板但高于页面内容
  z-index: $vc-z-index - 1;
  box-sizing: content-box;
  max-width: unset;
  padding: 0;
  margin: 0;
  pointer-events: none;
  user-select: none;
  border: none;
  transition: opacity 0.2s ease;

  // 确保混合模式能正常工作 - 不设置isolation，让它与页面内容混合
  // isolation: auto; // 移除这个，让混合模式生效
  will-change: auto;

  &.vc-dragging {
    transition: none;
  }
}

/* 控制面板样式 - 流光科技风设计 */
.vc-controller-panel {
  position: absolute;
  bottom: 0;
  left: 50%;
  z-index: $vc-z-index + 1;
  gap: 5px 10px;

  // 桌面端默认样式 - 水平布局
  max-width: 95vw;
  padding: 8px 12px;
  overflow: hidden;
  color: $vc-text-primary;
  pointer-events: auto;
  user-select: none;

  // 流光背景效果
  background:
    linear-gradient(
      135deg,
      rgb(15 23 42 / 95%) 0%,
      rgb(30 41 59 / 95%) 25%,
      rgb(51 65 85 / 95%) 50%,
      rgb(30 41 59 / 95%) 75%,
      rgb(15 23 42 / 95%) 100%
    );
  background-clip: padding-box;
  background-size: 400% 400%;

  // 流光边框
  border: 1px solid transparent;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  box-shadow:
    0 4px 20px rgb(0 0 0 / 40%),
    0 0 40px rgb(79 124 255 / 10%),
    inset 0 1px 0 rgb(255 255 255 / 10%);
  backdrop-filter: blur(20px);
  transform: translateX(-50%);
  animation: streaming-glow 18s ease-in-out infinite;
  // overflow-x: auto;
  @include flex-center;
  // 外层流光边框效果
  &::before {
    position: absolute;
    inset: 0;
    z-index: -1;
    content: "";
    background:
      linear-gradient(
        45deg,
        #4f7cff 0%,
        #7c3aed 25%,
        #06b6d4 50%,
        #10b981 75%,
        #4f7cff 100%
      );
    background-size: 400% 400%;
    animation: streaming-border 12s linear infinite;
  }
  // 内部光效
  &::after {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    pointer-events: none;
    content: "";
    background:
      linear-gradient(
        90deg,
        transparent 0%,
        rgb(255 255 255 / 10%) 50%,
        transparent 100%
      );
    animation: scan-line 9s ease-in-out infinite;
  }

  // 平板端适配 (768px - 1024px)
  @media (width <= 1024px) and (width >= 769px) {
    flex-wrap: wrap;
    gap: 4px 8px;
    justify-content: center;
    max-width: 90vw;
    padding: 6px 10px;
  }

  // 移动端适配 (≤768px)
  @media (width <= 768px) {

    // 小屏幕时调整位置，避免遮挡内容
    bottom: 10px;
    flex-direction: column;
    gap: 6px;
    align-items: stretch;
    max-width: 95vw;
    max-height: 60vh;
    padding: 8px;
    overflow: hidden auto;
    border-radius: 10px;
  }

  // 超小屏幕适配 (≤480px)
  @media (width <= 480px) {
    gap: 4px;
    max-width: 98vw;
    padding: 6px;
    font-size: 12px;
  }
}

/* 控制组样式 - 响应式布局 */
.vc-control-group {
  @include flex-center;

  flex-shrink: 0;
  gap: 5px;

  &:last-child {
    margin-right: 0;
  }

  // 平板端适配
  @media (width <= 1024px) and (width >= 769px) {
    gap: 4px;
  }

  // 移动端适配 - 垂直布局时调整
  @media (width <= 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 4px 0;
    border-bottom: 1px solid rgb(255 255 255 / 10%);

    &:last-child {
      border-bottom: none;
    }
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    gap: 3px;
    padding: 3px 0;
  }
}

.vc-control-label {
  margin: 0;
  font-weight: 600;
  color: $vc-text-secondary;
  white-space: nowrap;

  &::after {
    content: ":";
  }

  // 移动端适配 - 标签样式调整
  @media (width <= 768px) {
    min-width: 40px;
    font-size: 12px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    min-width: 35px;
    font-size: 12px;
  }
}

/* 滑块样式 - 响应式适配 */
.vc-slider-container {
  display: flex;
  gap: 8px;
  align-items: center;

  // 移动端适配
  @media (width <= 768px) {
    flex: 1;
    gap: 6px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    gap: 4px;
  }
}

.vc-slider {
  width: 100px;
  height: 3px;
  appearance: none;
  outline: none;
  background: rgb(255 255 255 / 30%);
  border-radius: 2px;

  // 平板端适配
  @media (width <= 1024px) and (width >= 769px) {
    width: 80px;
  }

  // 移动端适配
  @media (width <= 768px) {
    flex: 1;
    width: 60px;
    min-width: 50px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    width: 50px;
    min-width: 40px;
  }
}

.vc-slider::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  appearance: none;
  cursor: pointer;
  background: #4f7cff;
  border: 2px solid white;
  border-radius: 50%;

  // 移动端适配 - 增大触摸区域
  @media (width <= 768px) {
    width: 16px;
    height: 16px;
  }
}

.vc-slider-value {
  min-width: 20px;
  font-size: 12px;
  color: rgb(255 255 255 / 90%);
  text-align: right;

  // 移动端适配
  @media (width <= 768px) {
    min-width: 25px;
    font-size: 12px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    min-width: 20px;
    font-size: 12px;
  }
}

/* 按钮样式 - 响应式适配 */
.vc-btn {
  padding: 2px;
  color: white;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  background: rgb(255 255 255 / 15%);
  border: none;
  border-radius: 4px;
  transition: all 0.2s ease;

  // 平板端适配
  @media (width <= 1024px) and (width >= 769px) {
    padding: 3px 6px;
    font-size: 12px;
  }

  // 移动端适配 - 增大触摸区域
  @media (width <= 768px) {
    min-height: 32px;
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 6px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    min-height: 28px;
    padding: 5px 8px;
    font-size: 12px;
  }
}

.vc-btn:hover {
  background: rgb(255 255 255 / 25%);
  transform: translateY(-1px);

  // 移动端禁用hover效果
  @media (width <= 768px) {
    transform: none;
  }
}

.vc-btn.vc-active {
  color: white;
  background: #4f7cff;
}

.vc-btn.vc-btn-sm {
  min-width: 22px;
  min-height: 22px;
  font-size: 14px;
}

.vc-btn.vc-btn-danger {
  color: white;
  background: #ff3b30;
}

.vc-btn.vc-btn-danger:hover {
  background: #d70015;
}

/* 位置控制样式 - 响应式适配 */
.vc-position-mode {
  display: flex;
  gap: 6px;
  align-items: center;

  // 移动端适配
  @media (width <= 768px) {
    flex: 1;
    flex-wrap: wrap;
    gap: 4px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    gap: 3px;
  }
}

.vc-select {
  width: 60px;
  padding: 2px 4px;
  font-size: 12px;
  line-height: 20px;
  color: white;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 30%);
  border-radius: 3px;
}

.vc-position-inputs {
  display: flex;
  gap: 6px;
  align-items: center;

  // 移动端适配
  @media (width <= 768px) {
    flex-wrap: wrap;
    gap: 4px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    gap: 2px;
  }
}

.vc-input-row {
  display: flex;
  gap: 4px;
  align-items: center;

  // 移动端适配
  @media (width <= 768px) {
    flex-wrap: wrap;
    gap: 3px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    gap: 2px;
  }
}

.vc-input-group {
  display: flex;
  gap: 2px;
  align-items: center;

  // 移动端适配
  @media (width <= 768px) {
    gap: 1px;
  }
}

.vc-input-label {
  min-width: 20px;
  font-weight: 500;
  color: rgb(255 255 255 / 70%);
  text-align: right;

  &::after {
    content: ":";
  }

  // 移动端适配
  @media (width <= 768px) {
    min-width: 15px;
    font-size: 12px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    min-width: 12px;
    font-size: 12px;
  }
}

.vc-input {
  max-width: 55px;
  padding: 0 4px;
  font-size: 12px;
  line-height: 20px;
  color: white;
  text-align: left;
  background: rgb(255 255 255 / 10%);
  border: 1px solid rgb(255 255 255 / 30%);
  border-radius: 2px;

  // 移动端适配 - 增大触摸区域
  @media (width <= 768px) {
    width: 35px;
    min-height: 24px;
    padding: 2px 4px;
    font-size: 12px;
    border-radius: 4px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    width: 30px;
    min-height: 20px;
    padding: 1px 3px;
    font-size: 12px;
  }
}

.vc-input:focus {
  outline: none;
  border-color: #4f7cff;
  box-shadow: 0 0 0 1px rgb(79 124 255 / 30%);
}

.vc-input-disabled {
  color: rgb(255 255 255 / 30%);
  cursor: not-allowed;
  background: rgb(255 255 255 / 5%);
}

/* 混合模式控制样式 - 响应式适配 */
.vc-blend-controls {
  display: flex;
  align-items: center;

  // 移动端适配
  @media (width <= 768px) {
    flex: 1;
  }
}

/* 控制按钮组样式 - 响应式适配 */
.vc-position-controls {
  display: flex;
  gap: 2px;
  align-items: center;

  // 移动端适配
  @media (width <= 768px) {
    flex-wrap: wrap;
    gap: 3px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    gap: 2px;
  }
}

.vc-size-controls {
  display: flex;
  gap: 3px;
  align-items: center;
  // 移动端适配
  @media (width <= 768px) {
    flex: 1;
    justify-content: flex-end;
  }
}

.vc-size-inputs {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-right: 8px;

  // 移动端适配
  @media (width <= 768px) {
    flex-wrap: wrap;
    gap: 3px;
    margin-right: 6px;
  }

  // 超小屏幕适配
  @media (width <= 480px) {
    gap: 2px;
    margin-right: 4px;
  }
}

/* 图标状态样式 */
.vc-icon-active {
  color: #4f7cff !important;
}

.vc-icon-danger {
  color: #ff3b30 !important;
}

.vc-btn-group {
  display: flex;

  .vc-btn {
    border-radius: 0;

    &:nth-child(1) {
      border-top-left-radius: 4px;
      border-bottom-left-radius: 4px;
    }

    &:nth-last-child(1) {
      border-top-right-radius: 4px;
      border-bottom-right-radius: 4px;
    }
  }
}

/* 流光动画效果 */
@keyframes streaming-glow {
  0%,
  100% {
    background-position: 0% 50%;
  }

  25% {
    background-position: 100% 50%;
  }

  50% {
    background-position: 200% 50%;
  }

  75% {
    background-position: 300% 50%;
  }
}

@keyframes streaming-border {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 200% 50%;
  }
}

@keyframes scan-line {
  0% {
    left: -100%;
    opacity: 0;
  }

  50% {
    opacity: 1;
  }

  100% {
    left: 100%;
    opacity: 0;
  }
}
</style>

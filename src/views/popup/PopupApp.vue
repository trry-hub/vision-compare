<script setup lang="ts">
import { onMounted, ref } from 'vue'

// Chrome API 类型声明
declare const chrome: {
  tabs: {
    query: (queryInfo: { active?: boolean, currentWindow?: boolean }) => Promise<Array<{ id?: number, url?: string }>>
    sendMessage: (tabId: number, message: any) => Promise<any>
  }
}

// 响应式状态
const isActive = ref(false)
const toolbarVisible = ref(false)
const isDragOver = ref(false)
const isUploading = ref(false)
const fileInputRef = ref<HTMLInputElement>()

// 处理文件上传点击
function handleUploadClick(): void {
  fileInputRef.value?.click()
}

// 处理文件选择
function handleFileChange(event: Event): void {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && file.type.startsWith('image/')) {
    uploadImage(file)
  }
  // 重置文件输入框，确保可以重复选择同一文件
  target.value = ''
}

// 处理拖拽
function handleDragOver(): void {
  isDragOver.value = true
}

function handleDragLeave(): void {
  isDragOver.value = false
}

function handleDrop(event: DragEvent): void {
  isDragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    uploadImage(file)
  }
}

// 上传图片
async function uploadImage(file: File): Promise<void> {
  isUploading.value = true

  try {
    // 检查文件大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      throw new Error('图片文件过大，请选择小于10MB的图片')
    }

    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('不支持的图片格式，请选择 JPG、PNG、GIF、WebP 或 SVG 格式')
    }

    const reader = new FileReader()

    const imageData = await new Promise<string>((resolve, reject) => {
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

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab?.id) {
      throw new Error('未找到活动标签页')
    }

    // 检查页面是否支持
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) {
      throw new Error('当前页面不支持扩展功能，请在普通网页中使用')
    }

    // 检查是否为本地文件
    if (tab.url?.startsWith('file://')) {
      throw new Error('本地文件页面不支持扩展功能，请在网页中使用')
    }

    // 等待 content script 加载（它会通过 manifest.json 自动注入）
    let contentScriptReady = false
    let retries = 0
    const maxRetries = 15 // 增加重试次数

    while (retries < maxRetries && !contentScriptReady) {
      try {
        const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' })
        if (pingResponse?.success) {
          contentScriptReady = true
          break
        }
      }
      catch (e) {
        console.log('Content script 未就绪，等待中...', e)
        // Content script 还未加载，等待一下
        retries++
        await new Promise(resolve => setTimeout(resolve, 500)) // 增加等待时间
      }
    }

    if (!contentScriptReady) {
      throw new Error('内容脚本加载失败，请刷新页面后重试。如果问题持续存在，请检查页面是否阻止了扩展脚本运行。')
    }

    // 发送图片数据，增加超时处理
    const response = await Promise.race([
      chrome.tabs.sendMessage(tab.id, {
        action: 'uploadImage',
        imageData,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('上传超时，请重试')), 10000),
      ),
    ]) as any

    if (response?.success) {
      isActive.value = true
      window.close()
    }
    else {
      throw new Error(response?.error || '图片上传失败，请重试')
    }
  }
  catch (error) {
    const errorMessage = (error as Error).message
    console.error('上传失败：', errorMessage, error)
    // eslint-disable-next-line no-alert
    alert(`上传失败：${errorMessage}`)
  }
  finally {
    isUploading.value = false
  }
}

// 其他控制函数
async function handleToggleController(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleControllerVisibility' })
      toolbarVisible.value = !toolbarVisible.value
    }
  }
  catch (error) {
    console.error('切换控制器失败:', error)
  }
}

async function handleExit(): Promise<void> {
  try {
    // 清理popup存储
    sessionStorage.removeItem('vision-compare-state')
    sessionStorage.removeItem('vision-compare-frozen')

    // 发送退出消息给content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'exit' })
      isActive.value = false
    }
  }
  catch (error) {
    console.error('退出失败:', error)
  }
}

// 检查状态
async function checkStatus(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkStatus' })
      if (response) {
        isActive.value = response.isActive || false
        toolbarVisible.value = response.toolbarVisible || false
      }
    }
  }
  catch (error) {
    console.log(`🚀 ~ checkStatus ~ error:`, error)
    // Content script not loaded, that's fine
  }
}

onMounted(() => {
  checkStatus()
})
</script>

<template>
  <div class="popup-container">
    <!-- 头部 -->
    <div class="popup-header">
      <div class="header-icon">
        🎯
      </div>
      <div class="header-content">
        <h1 class="header-title">
          Vision Compare
        </h1>
        <p class="header-subtitle">
          你的眼睛不是尺
        </p>
      </div>
    </div>

    <!-- 上传状态 -->
    <div v-if="!isActive" class="upload-section">
      <div
        class="upload-area"
        :class="{ dragover: isDragOver, uploading: isUploading }"
        @click="handleUploadClick"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
      >
        <div class="upload-content">
          <div class="upload-icon">
            <div v-if="isUploading" class="loading-spinner">
              ⏳
            </div>
            <div v-else>
              📁
            </div>
          </div>
          <div class="upload-text">
            <div class="upload-title">
              {{ isUploading ? '上传中...' : '拖拽或点击上传' }}
            </div>
            <div class="upload-subtitle">
              支持 PNG、JPG、GIF、SVG 格式
            </div>
          </div>
        </div>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        style="display: none;"
        @change="handleFileChange"
      >

      <div class="upload-tips">
        <div class="tip-item">
          <span class="tip-icon">💡</span>
          <span class="tip-text">上传设计稿后，会自动覆盖在当前页面上</span>
        </div>
        <div class="tip-item">
          <span class="tip-icon">⌨️</span>
          <span class="tip-text">支持快捷键操作，提升对比效率</span>
        </div>
        <div class="tip-item">
          <span class="tip-icon">🔧</span>
          <span class="tip-text">可调节透明度、位置、尺寸等参数</span>
        </div>
      </div>
    </div>

    <!-- 激活状态 -->
    <div v-else class="active-section">
      <div class="status-card">
        <div class="status-indicator">
          <div class="status-dot" />
          <div class="status-text">
            <div class="status-title">
              Vision Compare 已激活
            </div>
            <div class="status-subtitle">
              正在当前页面进行视觉对比
            </div>
          </div>
        </div>
      </div>

      <div class="control-grid">
        <button class="control-btn primary" @click="handleToggleController">
          <span class="btn-icon">👁️</span>
          <span>{{ toolbarVisible ? '隐藏' : '显示' }}</span>
        </button>

        <button class="control-btn secondary" @click="handleUploadClick">
          <span class="btn-icon">🔄</span>
          <span>更换</span>
        </button>

        <button class="control-btn danger" @click="handleExit">
          <span class="btn-icon">❌</span>
          <span>退出</span>
        </button>
      </div>

      <div class="shortcuts-info">
        <div class="shortcuts-title">
          快捷键
        </div>
        <div class="shortcuts-grid">
          <div class="shortcut-item">
            <kbd>F</kbd>
            <span>显示/隐藏控制器</span>
          </div>
          <div class="shortcut-item">
            <kbd>L</kbd>
            <span>锁定/解锁图片</span>
          </div>
          <div class="shortcut-item">
            <kbd>Z</kbd>
            <span>冻结/解冻状态</span>
          </div>
          <div class="shortcut-item">
            <kbd>V</kbd>
            <span>显示/隐藏图片</span>
          </div>
          <div class="shortcut-item">
            <kbd>ESC</kbd>
            <span>退出对比模式</span>
          </div>
        </div>

        <!-- 功能说明 -->
        <div class="feature-descriptions">
          <div class="feature-item">
            <div class="feature-title">
              🔒 锁定功能
            </div>
            <div class="feature-desc">
              锁定后图片无法移动和调整，同时自动冻结当前状态
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-title">
              ❄️ 冻结功能
            </div>
            <div class="feature-desc">
              保存当前图片的位置、尺寸等状态，刷新页面后自动恢复
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* 基础样式 */
.popup-container {
  width: 320px;
  max-height: 600px;
  overflow: hidden;
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
}

.popup-header {
  display: flex;
  align-items: center;
  padding: 16px 20px 12px;
  color: white;
  background: linear-gradient(135deg, #4f7cff 0%, #5a7ef0 100%);
}

.header-icon {
  margin-right: 12px;
  font-size: 24px;
}

.header-content {
  flex: 1;
}

.header-title {
  margin: 0 0 2px;
  font-size: 16px;
  font-weight: 600;
}

.header-subtitle {
  margin: 0;
  font-size: 12px;
  opacity: 0.9;
}

/* 上传区域样式 */
.upload-section {
  padding: 10px;
}

.upload-area {
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  background: #f8f9fa;
  border: 2px dashed #e1e5e9;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.upload-area:hover {
  background: #f0f4ff;
  border-color: #4f7cff;
  transform: translateY(-2px);
}

.upload-area.dragover {
  background: #f0f4ff;
  border-color: #4f7cff;
  transform: scale(1.02);
}

.upload-area.uploading {
  pointer-events: none;
  opacity: 0.7;
}

.upload-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.upload-icon {
  font-size: 36px;
  opacity: 0.8;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.upload-text .upload-title {
  margin-bottom: 4px;
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
}

.upload-text .upload-subtitle {
  font-size: 13px;
  color: #6c757d;
}

.upload-tips {
  padding: 12px;
  margin-top: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.tip-item {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.tip-item:last-child {
  margin-bottom: 0;
}

.tip-icon {
  width: 16px;
  margin-right: 8px;
  font-size: 14px;
  text-align: center;
}

.tip-text {
  font-size: 12px;
  color: #6c757d;
}

/* 激活状态样式 */
.active-section {
  padding: 10px;
}

.status-card {
  padding: 16px;
  margin-bottom: 20px;
  background: #f0fff4;
  border: 1px solid rgb(52 199 89 / 20%);
  border-radius: 6px;
}

.status-indicator {
  display: flex;
  align-items: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  margin-right: 12px;
  background: #34c759;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
}

.status-text .status-title {
  margin-bottom: 2px;
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
}

.status-text .status-subtitle {
  font-size: 12px;
  color: #6c757d;
}

.control-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.control-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.btn-icon {
  width: 20px;
  margin-right: 12px;
  font-size: 16px;
  text-align: center;
}

.control-btn.primary {
  color: white;
  background: #4f7cff;
}

.control-btn.primary:hover {
  background: #3d6aff;
  transform: translateY(-1px);
}

.control-btn.secondary {
  color: #6c757d;
  background: #f8f9fa;
  border: 1px solid rgb(108 117 125 / 20%);
}

.control-btn.secondary:hover {
  color: white;
  background: #6c757d;
  transform: translateY(-1px);
}

.control-btn.danger {
  color: #ff3b30;
  background: #fff5f5;
  border: 1px solid rgb(255 59 48 / 20%);
}

.control-btn.danger:hover {
  color: white;
  background: #ff3b30;
  transform: translateY(-1px);
}

.shortcuts-info {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.shortcuts-title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  font-size: 11px;
}

kbd {
  min-width: 20px;
  padding: 2px 4px;
  margin-right: 6px;
  font-size: 10px;
  font-weight: 600;
  color: #1d1d1f;
  text-align: center;
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 10%);
}

.shortcut-item span {
  flex: 1;
  line-height: 1.3;
  color: #6c757d;
}

/* 功能说明样式 */
.feature-descriptions {
  padding-top: 12px;
  margin-top: 16px;
  border-top: 1px solid #e1e5e9;
}

.feature-item {
  margin-bottom: 12px;
}

.feature-item:last-child {
  margin-bottom: 0;
}

.feature-title {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #1d1d1f;
}

.feature-desc {
  padding-left: 16px;
  font-size: 11px;
  line-height: 1.4;
  color: #6c757d;
}
</style>

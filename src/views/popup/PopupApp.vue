<template>
  <div class="popup-container">
    <!-- 头部 -->
    <div class="popup-header">
      <div class="header-icon">🎯</div>
      <div class="header-content">
        <h1 class="header-title">Vision Compare</h1>
        <p class="header-subtitle">你的眼睛不是尺</p>
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
            <div v-if="isUploading" class="loading-spinner">⏳</div>
            <div v-else>📁</div>
          </div>
          <div class="upload-text">
            <div class="upload-title">{{ isUploading ? '上传中...' : '拖拽或点击上传' }}</div>
            <div class="upload-subtitle">支持 PNG、JPG、GIF、SVG 格式</div>
          </div>
        </div>
      </div>

      <input 
        ref="fileInputRef" 
        type="file" 
        accept="image/*"
        @change="handleFileChange" 
        style="display: none;"
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
          <div class="status-dot"></div>
          <div class="status-text">
            <div class="status-title">Vision Compare 已激活</div>
            <div class="status-subtitle">正在当前页面进行视觉对比</div>
          </div>
        </div>
      </div>

      <div class="control-grid">
        <button @click="handleToggleController" class="control-btn primary">
          <span class="btn-icon">👁️</span>
          <span>{{ toolbarVisible ? '隐藏' : '显示' }}</span>
        </button>

        <button @click="handleUploadClick" class="control-btn secondary">
          <span class="btn-icon">🔄</span>
          <span>更换</span>
        </button>

        <button @click="handleExit" class="control-btn danger">
          <span class="btn-icon">❌</span>
          <span>退出</span>
        </button>
      </div>

      <div class="shortcuts-info">
        <div class="shortcuts-title">快捷键</div>
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
            <kbd>V</kbd>
            <span>显示/隐藏图片</span>
          </div>
          <div class="shortcut-item">
            <kbd>ESC</kbd>
            <span>退出对比模式</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 响应式状态
const isActive = ref(false)
const toolbarVisible = ref(false)
const isDragOver = ref(false)
const isUploading = ref(false)
const fileInputRef = ref<HTMLInputElement>()

// 处理文件上传点击
const handleUploadClick = (): void => {
  fileInputRef.value?.click()
}

// 处理文件选择
const handleFileChange = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file && file.type.startsWith('image/')) {
    uploadImage(file)
  }
}

// 处理拖拽
const handleDragOver = (): void => {
  isDragOver.value = true
}

const handleDragLeave = (): void => {
  isDragOver.value = false
}

const handleDrop = (event: DragEvent): void => {
  isDragOver.value = false
  const file = event.dataTransfer?.files[0]
  if (file && file.type.startsWith('image/')) {
    uploadImage(file)
  }
}

// 上传图片
const uploadImage = async (file: File): Promise<void> => {
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

    console.log('开始读取文件:', file.name, '大小:', (file.size / 1024).toFixed(2) + 'KB')

    const reader = new FileReader()

    const imageData = await new Promise<string>((resolve, reject) => {
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (!result) {
          reject(new Error('文件读取结果为空'))
          return
        }
        console.log('文件读取成功，数据长度:', result.length)
        resolve(result)
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsDataURL(file)
    })

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab?.id) {
      throw new Error('未找到活动标签页')
    }

    console.log('当前标签页:', tab.url)

    // 检查页面是否支持
    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) {
      throw new Error('当前页面不支持扩展功能，请在普通网页中使用')
    }

    // 检查是否为本地文件
    if (tab.url?.startsWith('file://')) {
      throw new Error('本地文件页面不支持扩展功能，请在网页中使用')
    }

    console.log('开始检查 content script 状态...')

    // 等待 content script 加载（它会通过 manifest.json 自动注入）
    let contentScriptReady = false
    let retries = 0
    const maxRetries = 15 // 增加重试次数

    while (retries < maxRetries && !contentScriptReady) {
      try {
        console.log(`尝试连接 content script (${retries + 1}/${maxRetries})...`)
        const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' })
        if (pingResponse?.success) {
          contentScriptReady = true
          console.log('Content script 连接成功')
          break
        }
      } catch (e) {
        console.log('Content script 未就绪，等待中...', e)
        // Content script 还未加载，等待一下
        retries++
        await new Promise(resolve => setTimeout(resolve, 500)) // 增加等待时间
      }
    }

    if (!contentScriptReady) {
      throw new Error('内容脚本加载失败，请刷新页面后重试。如果问题持续存在，请检查页面是否阻止了扩展脚本运行。')
    }

    console.log('开始发送图片数据...')

    // 发送图片数据，增加超时处理
    const response = await Promise.race([
      chrome.tabs.sendMessage(tab.id, {
        action: 'uploadImage',
        imageData
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('上传超时，请重试')), 10000)
      )
    ]) as any

    if (response?.success) {
      isActive.value = true
      console.log('图片上传成功！')
      window.close()
    } else {
      throw new Error(response?.error || '图片上传失败，请重试')
    }

  } catch (error) {
    const errorMessage = (error as Error).message
    console.error('上传失败：', errorMessage, error)
    alert(`上传失败：${errorMessage}`)
  } finally {
    isUploading.value = false
  }
}

// 其他控制函数
const handleToggleController = async (): Promise<void> => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleControllerVisibility' })
      toolbarVisible.value = !toolbarVisible.value
    }
  } catch (error) {
    console.error('切换控制器失败:', error)
  }
}

const handleExit = async (): Promise<void> => {
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

    console.log('Popup: 所有缓存已清理，退出完成')
  } catch (error) {
    console.error('退出失败:', error)
  }
}

// 检查状态
const checkStatus = async (): Promise<void> => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkStatus' })
      if (response) {
        isActive.value = response.isActive || false
        toolbarVisible.value = response.toolbarVisible || false
      }
    }
  } catch (error) {
    // Content script not loaded, that's fine
  }
}

onMounted(() => {
  checkStatus()
})
</script>

<style scoped>
/* 基础样式 */
.popup-container {
  width: 320px;
  max-height: 600px;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  overflow-y: auto;
}

.popup-header {
  display: flex;
  align-items: center;
  padding: 16px 20px 12px;
  background: linear-gradient(135deg, #4f7cff 0%, #5a7ef0 100%);
  color: white;
}

.header-icon {
  font-size: 24px;
  margin-right: 12px;
}

.header-content {
  flex: 1;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 2px;
}

.header-subtitle {
  font-size: 12px;
  opacity: 0.9;
  margin: 0;
}

/* 上传区域样式 */
.upload-section {
  padding: 10px;
}

.upload-area {
  border: 2px dashed #e1e5e9;
  border-radius: 8px;
  padding: 24px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.upload-area:hover {
  border-color: #4f7cff;
  background: #f0f4ff;
  transform: translateY(-2px);
}

.upload-area.dragover {
  border-color: #4f7cff;
  background: #f0f4ff;
  transform: scale(1.02);
}

.upload-area.uploading {
  pointer-events: none;
  opacity: 0.7;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
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
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 4px;
}

.upload-text .upload-subtitle {
  font-size: 13px;
  color: #6c757d;
}

.upload-tips {
  margin-top: 16px;
  padding: 12px;
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
  font-size: 14px;
  margin-right: 8px;
  width: 16px;
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
  background: #f0fff4;
  border: 1px solid rgba(52, 199, 89, 0.2);
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.status-indicator {
  display: flex;
  align-items: center;
}

.status-dot {
  width: 8px;
  height: 8px;
  background: #34c759;
  border-radius: 50%;
  margin-right: 12px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

.status-text .status-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 2px;
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
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon {
  font-size: 16px;
  margin-right: 12px;
  width: 20px;
  text-align: center;
}

.control-btn.primary {
  background: #4f7cff;
  color: white;
}

.control-btn.primary:hover {
  background: #3d6aff;
  transform: translateY(-1px);
}

.control-btn.secondary {
  background: #f8f9fa;
  color: #6c757d;
  border: 1px solid rgba(108, 117, 125, 0.2);
}

.control-btn.secondary:hover {
  background: #6c757d;
  color: white;
  transform: translateY(-1px);
}

.control-btn.danger {
  background: #fff5f5;
  color: #ff3b30;
  border: 1px solid rgba(255, 59, 48, 0.2);
}

.control-btn.danger:hover {
  background: #ff3b30;
  color: white;
  transform: translateY(-1px);
}

.shortcuts-info {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 16px;
}

.shortcuts-title {
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 12px;
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
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 10px;
  font-weight: 600;
  color: #1d1d1f;
  margin-right: 6px;
  min-width: 20px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.shortcut-item span {
  color: #6c757d;
  flex: 1;
  line-height: 1.3;
}
</style>

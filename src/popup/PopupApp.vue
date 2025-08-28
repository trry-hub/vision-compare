<template>
  <div class="popup-container">
    <!-- 头部 -->
    <div class="popup-header">
      <div class="header-icon">🎯</div>
      <div class="header-content">
        <h1 class="header-title">Vision Compare</h1>
        <p class="header-subtitle">精准设计稿对比工具</p>
      </div>
    </div>

    <!-- 上传状态 -->
    <div v-if="!isActive" class="upload-section">
      <div class="upload-area"
           :class="{ dragover: isDragOver, uploading: isUploading }"
           @click="handleUploadClick"
           @dragover.prevent="handleDragOver"
           @dragleave.prevent="handleDragLeave"
           @drop.prevent="handleDrop">

        <div class="upload-content">
          <div class="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div class="upload-text">
            <div class="upload-title">{{ isUploading ? '上传中...' : '拖拽或点击上传' }}</div>
            <div class="upload-subtitle">支持 PNG、JPG、GIF 格式</div>
          </div>
        </div>

        <input ref="fileInputRef" type="file" accept="image/*"
               @change="handleFileChange" style="display: none;">
      </div>

      <div class="upload-tips">
        <div class="tip-item">
          <span class="tip-icon">⚡</span>
          <span class="tip-text">快速对比设计稿与实际页面</span>
        </div>
        <div class="tip-item">
          <span class="tip-icon">🎛️</span>
          <span class="tip-text">支持透明度、位置、尺寸调整</span>
        </div>
        <div class="tip-item">
          <span class="tip-icon">🔒</span>
          <span class="tip-text">锁定状态自动保存设置</span>
        </div>
      </div>
    </div>

    <!-- 激活状态 -->
    <div v-else class="active-section">
      <div class="status-card">
        <div class="status-indicator">
          <div class="status-dot"></div>
          <div class="status-text">
            <div class="status-title">对比工具已激活</div>
            <div class="status-subtitle">在页面中查看控制器</div>
          </div>
        </div>
      </div>

      <div class="control-grid">
        <button @click="handleToggleController" class="control-btn primary" :title="(toolbarVisible ? '隐藏' : '显示') + '整个控制器'">
          <span class="btn-icon">{{ toolbarVisible ? '🙈' : '🙊' }}</span>
          <span>{{ toolbarVisible ? '隐藏' : '显示' }}</span>
        </button>

        <button @click="handleUploadClick" class="control-btn secondary" title="更换图片">
          <span class="btn-icon">🔄</span>
          <span>更换</span>
        </button>

        <button @click="handleExit" class="control-btn danger" title="退出对比模式">
          <span class="btn-icon">❌</span>
          <span>退出</span>
        </button>
      </div>

      <div class="shortcuts-info">
        <div class="shortcuts-title">快捷键功能</div>
        <div class="shortcuts-grid">
          <div class="shortcut-item">
            <kbd>F</kbd>
            <span>显示/隐藏整个控制器</span>
          </div>
          <div class="shortcut-item">
            <kbd>L</kbd>
            <span>锁定/解锁图片位置</span>
          </div>
          <div class="shortcut-item">
            <kbd>Z</kbd>
            <span>冻结/解冻图片内容</span>
          </div>
          <div class="shortcut-item">
            <kbd>V</kbd>
            <span>显示/隐藏图片</span>
          </div>
          <div class="shortcut-item">
            <kbd>↑↓←→</kbd>
            <span>移动图片 (1px/次)</span>
          </div>
          <div class="shortcut-item">
            <kbd>Shift+方向键</kbd>
            <span>快速移动 (10px/次)</span>
          </div>
          <div class="shortcut-item">
            <kbd>ESC</kbd>
            <span>退出对比模式</span>
          </div>
        </div>

        <div class="shortcuts-section">
          <div class="shortcuts-subtitle">控制器操作</div>
          <div class="shortcuts-description">
            • 拖拽齿轮图标可移动控制器位置<br>
            • 单击齿轮图标展开/收起控制面板<br>
            • 控制面板会智能调整显示位置
          </div>
        </div>

        <div class="shortcuts-section">
          <div class="shortcuts-subtitle">快捷按钮</div>
          <div class="shortcuts-description">
            • ↑↓←→ 按钮：图片贴边到对应方向<br>
            • W/H/1:1 按钮：适应宽度/高度/原图尺寸<br>
            • 🔗 按钮：切换宽高比锁定/自由调整
          </div>
        </div>
      </div>

      <input ref="fileInputRef" type="file" accept="image/*"
             @change="handleFileChange" style="display: none;">
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

// 检查扩展状态
const checkStatus = async (): Promise<void> => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      return
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'checkStatus' })
    if (response?.isActive) {
      isActive.value = true
      toolbarVisible.value = response.toolbarVisible || false
    }
  } catch (error) {
    // Content script not ready or page not supported
  }
}

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

  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab?.id) {
        throw new Error('未找到活动标签页')
      }

      // 检查页面是否支持（不是 chrome:// 等特殊页面）
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://') || tab.url?.startsWith('edge://') || tab.url?.startsWith('about:')) {
        throw new Error('当前页面不支持扩展功能，请在普通网页中使用')
      }

      let contentScriptReady = false

      // 尝试检查 content script 是否已加载
      try {
        const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' })
        if (pingResponse?.success) {
          contentScriptReady = true
        }
      } catch (pingError) {
        // Content script not responding, will inject
      }

      // 如果 content script 未加载，注入它
      if (!contentScriptReady) {
        try {
          // 注入 CSS
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content.css']
          })

          // 注入 JavaScript
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          })

          // 等待 content script 初始化
          await new Promise(resolve => setTimeout(resolve, 500))

          // 再次检查是否成功加载
          let retries = 0
          const maxRetries = 5

          while (retries < maxRetries) {
            try {
              const pingResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' })
              if (pingResponse?.success) {
                contentScriptReady = true
                break
              }
            } catch (e) {
              retries++
              await new Promise(resolve => setTimeout(resolve, 200))
            }
          }

          if (!contentScriptReady) {
            throw new Error('内容脚本加载失败，请刷新页面后重试')
          }

        } catch (injectionError) {
          throw new Error('无法在当前页面注入扩展脚本，请刷新页面后重试')
        }
      }

      // 发送图片数据
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'uploadImage',
        imageData: e.target?.result as string
      })

      if (response?.success) {
        isActive.value = true
        window.close()
      } else {
        throw new Error('图片上传失败，请重试')
      }

    } catch (error) {
      alert(`上传失败：${(error as Error).message}`)
    } finally {
      isUploading.value = false
    }
  }

  reader.readAsDataURL(file)
}

// 切换整个控制器显示/隐藏
const handleToggleController = async (): Promise<void> => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return

    await chrome.tabs.sendMessage(tab.id, { action: 'toggleControllerVisibility' })

    // 重新检查状态以同步
    await checkStatus()
  } catch (error) {
    // Failed to toggle controller
  }
}

// 退出对比
const handleExit = async (): Promise<void> => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return
    
    await chrome.tabs.sendMessage(tab.id, { action: 'exit' })
    isActive.value = false
    window.close()
  } catch (error) {
    // Failed to exit
  }
}

// 组件挂载时检查状态
onMounted(() => {
  checkStatus()
})
</script>

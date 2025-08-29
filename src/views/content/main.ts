import { createApp } from 'vue'
import Content from './index.vue'

console.log('Vision Compare content script 开始加载...')

try {
  // 确保 DOM 已加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisionCompare)
  } else {
    initVisionCompare()
  }
} catch (error) {
  console.error('Vision Compare content script 加载失败:', error)
}

function initVisionCompare() {
  try {
    console.log('初始化 Vision Compare...')

    // 检查是否已经初始化过
    if (document.getElementById('vision-compare-content')) {
      console.log('Vision Compare 已经初始化过，跳过')
      return
    }

    // 创建容器元素
    const div = document.createElement('div')
    div.id = 'vision-compare-content'
    div.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 999999; pointer-events: none;'

    // 确保 body 存在
    if (!document.body) {
      console.error('document.body 不存在，等待 DOM 加载完成')
      setTimeout(initVisionCompare, 100)
      return
    }

    // 先将容器添加到DOM
    document.body.appendChild(div)
    console.log('容器元素已添加到 DOM')

    // 创建 Vue 实例并挂载
    const app = createApp(Content)

    // 添加错误处理
    app.config.errorHandler = (err, _instance, info) => {
      console.error('Vue 应用错误:', err, info)
    }

    app.mount(div)
    console.log('Vision Compare Vue 应用已挂载')

  } catch (error) {
    console.error('初始化 Vision Compare 时出错:', error)
  }
}

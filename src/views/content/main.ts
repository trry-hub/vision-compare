import { createApp } from 'vue'
import Content from './index.vue'

try {
  // 确保 DOM 已加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisionCompare)
  }
  else {
    initVisionCompare()
  }
}
catch (error) {
  console.error('Vision Compare content script 加载失败:', error)
}

function initVisionCompare() {
  try {
    // 检查是否已经初始化过
    if (document.getElementById('vision-compare-content')) {
      return
    }

    // 创建容器元素
    const div = document.createElement('div')
    div.id = 'vision-compare-content'

    // 确保 body 存在
    if (!document.body) {
      setTimeout(initVisionCompare, 100)
      return
    }

    // 先将容器添加到DOM
    document.body.appendChild(div)

    // 创建 Vue 实例并挂载
    const app = createApp(Content)

    // 添加错误处理
    app.config.errorHandler = (err, _instance, info) => {
      console.error('Vue 应用错误:', err, info)
    }

    app.mount(div)
  }
  catch (error) {
    console.error('初始化 Vision Compare 时出错:', error)
  }
}

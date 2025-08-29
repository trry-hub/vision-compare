# Vision Compare 扩展调试指南

## 🔧 解决上传图片报错问题

### 问题分析
你遇到的错误 `GET chrome-extension://xxx/assets/content-BC1WkaTR.js net::ERR_FILE_NOT_FOUND` 是因为：

1. **文件名不匹配**：浏览器缓存了旧的文件名，但实际构建的文件名已经改变
2. **扩展缓存**：Chrome 扩展的缓存没有正确更新

### 🚀 解决步骤

#### 1. 完全重新加载扩展
```bash
# 1. 在 Chrome 中打开扩展管理页面
chrome://extensions/

# 2. 找到 Vision Compare 扩展
# 3. 点击"移除"按钮完全删除扩展
# 4. 重新点击"加载已解压的扩展程序"
# 5. 选择项目的 dist 文件夹
```

#### 2. 清除浏览器缓存
```bash
# 1. 按 Ctrl+Shift+Delete (Windows) 或 Cmd+Shift+Delete (Mac)
# 2. 选择"缓存的图片和文件"
# 3. 点击"清除数据"
```

#### 3. 重新构建扩展
```bash
# 在项目目录中运行
pnpm run build
```

### 🔍 验证修复

#### 1. 检查文件是否存在
打开 `dist/assets/` 目录，确认以下文件存在：
- `content-Cxs6GuHs.js` (实际文件名)
- `main.ts-loader-BrZXkbfU.js`
- `_plugin-vue_export-helper-Cizwj1dK.js`

#### 2. 检查 manifest.json
确认 `dist/manifest.json` 中的文件名与实际文件匹配：
```json
{
  "content_scripts": [
    {
      "js": ["assets/main.ts-loader-BrZXkbfU.js"]
    }
  ],
  "web_accessible_resources": [
    {
      "resources": [
        "assets/_plugin-vue_export-helper-Cizwj1dK.js",
        "assets/content-Cxs6GuHs.js"
      ]
    }
  ]
}
```

### 🧪 测试步骤

1. **重新加载扩展后**，打开任意网页
2. **按 F12** 打开开发者工具
3. **点击扩展图标**，尝试上传图片
4. **查看 Console** 标签页，应该看到：
   ```
   Vision Compare content script 开始加载...
   初始化 Vision Compare...
   容器元素已添加到 DOM
   Vision Compare Vue 应用已挂载
   Vision Compare content script 初始化完成
   ```

### 🐛 如果仍有问题

如果问题持续存在，请检查：

1. **扩展权限**：确保扩展有 `activeTab`, `storage`, `scripting`, `tabs` 权限
2. **页面类型**：不要在 `chrome://` 或 `file://` 页面中测试
3. **控制台错误**：查看是否有其他 JavaScript 错误
4. **网络面板**：检查是否有其他资源加载失败

### 📝 调试日志

现在的版本包含详细的调试日志，如果上传失败，会显示具体原因：
- 文件大小超限（>10MB）
- 不支持的文件格式
- Content script 连接失败
- 图片数据读取失败

### 🔄 强制刷新方法

如果上述方法都不行，尝试：
1. 关闭所有 Chrome 窗口
2. 重新打开 Chrome
3. 删除并重新安装扩展
4. 在隐私模式下测试

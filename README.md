# Vision Compare（你的眼睛不是尺）

<div align="center">

🎯 **专业的设计稿对比浏览器扩展**

让像素级精度验证变得简单高效

[![GitHub stars](https://img.shields.io/github/stars/your-username/vision-compare?style=flat-square)](https://github.com/your-username/vision-compare/stargazers)
[![GitHub license](https://img.shields.io/github/license/your-username/vision-compare?style=flat-square)](https://github.com/your-username/vision-compare/blob/main/LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue?style=flat-square)](https://chrome.google.com/webstore)

[📦 安装扩展](#-安装使用) • [⌨️ 快捷键](#️-快捷键指南) • [🛠️ 开发指南](#️-开发指南) • [📖 使用文档](#-使用说明)

</div>

---

## ✨ 功能特性

- 🎯 **像素级精准对比** - 支持设计稿与页面的像素级精准对比，快速发现差异
- 🎛️ **灵活调整工具** - 可调整透明度、位置、尺寸，支持多种对齐方式
- ⌨️ **快捷键操作** - 支持丰富的键盘快捷键，提高工作效率
- 💾 **状态持久化** - 自动保存调整状态，刷新页面后状态不丢失
- 🔄 **实时预览** - 实时查看对比效果，支持拖拽和缩放
- 🎨 **现代化界面** - 基于 Vue 3 + TypeScript 构建，界面美观易用

## 🚀 安装使用

### 方式一：开发者模式安装

1. 下载或克隆项目到本地
2. 运行构建命令：
   ```bash
   npm install
   npm run build
   ```
3. 在 Chrome 浏览器中打开 `chrome://extensions/`
4. 启用右上角的"开发者模式"
5. 点击"加载已解压的扩展程序"，选择项目中的 `dist` 文件夹
6. 扩展安装完成，图标会出现在浏览器工具栏中

### 使用步骤

1. 打开任意网页
2. 点击浏览器工具栏中的 Vision Compare 图标
3. 在弹出窗口中上传设计稿图片（支持拖拽上传）
4. 图片将覆盖在页面上，可以进行对比调整
5. 使用工具栏或快捷键调整图片位置、大小、透明度等

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `T` | 显示/隐藏工具栏 |
| `L` | 锁定/解锁图片（锁定后无法拖拽） |
| `V` | 显示/隐藏图片 |
| `↑/↓` | 增加/减少透明度 |
| `W/A/S/D` | 上/左/下/右移动图片 |
| `Shift + 方向键` | 快速移动（10px步长） |
| `ESC` | 退出对比模式 |

## 🛠️ 开发

### 环境要求

- Node.js 22+
- pnpm

### 开发命令

```bash
# 安装依赖
npm install

# 开发模式（用于开发 Vue 组件）
npm run dev

# 构建扩展
npm run build
```

## 🔧 技术栈

- **前端框架**: Vue 3.5.12
- **开发语言**: TypeScript 5.6.3
- **构建工具**: Vite 6.0.1
- **扩展平台**: Chrome Extension Manifest V3
- **样式**: 原生 CSS
- **状态管理**: Vue 3 Composition API

## 📝 更新日志

### v1.0.0 (2025-08-27)

- ✨ 全面重构为 Vue 3 + TypeScript
- 🎨 使用 `<script setup lang="ts">` 语法
- 📁 规范化项目目录结构
- 🔧 修复消息通信问题
- 🎯 使用提供的 logo.svg 作为扩展图标
- 🚀 改进构建流程和错误处理
- 📦 优化打包体积和性能

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

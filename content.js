// Design Inspector Content Script
class DesignInspector {
  constructor() {
    this.image = null;
    this.toolbar = null;
    this.isDragging = false;
    this.isResizing = false;
    this.isToolbarDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.imageStart = { x: 0, y: 0 };
    this.toolbarStart = { x: 0, y: 0 };
    this.resizeHandle = null;
    this.keyBuffer = '';
    this.keyTimer = null;
    this.toolbarHideTimer = null;
    this.isActive = false; // 插件是否激活

    // 状态
    this.state = {
      visible: true,
      frozen: false,
      toolbarVisible: false, // 默认隐藏，选择图片后显示
      opacity: 50,
      blendMode: 'normal',
      position: { x: 0, y: 0 },
      size: { width: 0, height: 0 },
      originalSize: { width: 0, height: 0 },
      toolbarPosition: { x: 50, y: 10 }, // 工具栏位置（百分比）
      // 手柄相关状态
      handlesVisible: true // 手柄是否显示
    };

    this.init();
  }
  
  init() {
    this.bindEvents();
    this.loadState();
  }

  // 激活插件（选择图片后调用）
  activate(imageData, isRestore = false) {
    if (this.isActive) {
      this.deactivate(); // 如果已激活，先清理
    }

    this.isActive = true;
    this.createImage(imageData);
    this.createToolbar();

    // 如果不是恢复状态，则设置默认值
    if (!isRestore) {
      this.state.toolbarVisible = false; // 默认隐藏工具栏
    }

    this.updateToolbarState();

    // 恢复状态时不立即保存，避免覆盖
    if (!isRestore) {
      this.saveState();
    }
  }

  // 退出插件
  deactivate() {
    if (this.image) {
      this.image.remove();
      this.image = null;
    }

    if (this.toolbar) {
      this.toolbar.remove();
      this.toolbar = null;
    }

    // 清理定时器
    if (this.toolbarHideTimer) {
      clearTimeout(this.toolbarHideTimer);
      this.toolbarHideTimer = null;
    }

    if (this.keyTimer) {
      clearTimeout(this.keyTimer);
      this.keyTimer = null;
    }

    // 移除拖拽状态类
    document.body.classList.remove('vision-compare-dragging');

    this.isActive = false;
    this.state.toolbarVisible = false;
    this.clearState();
  }
  
  createImage(imageData) {
    // 移除现有图片
    if (this.image) {
      this.image.remove();
    }

    // 创建新图片，插入到DOM最下层
    this.image = document.createElement('img');
    this.image.id = 'design-inspector-image';
    this.image.src = imageData;
    this.image.draggable = false;

    // 图片加载完成后设置尺寸和位置
    this.image.onload = () => {
      this.state.originalSize.width = this.image.naturalWidth;
      this.state.originalSize.height = this.image.naturalHeight;

      // 如果没有保存的尺寸和位置，使用默认值
      if (this.state.size.width === 0 || this.state.size.height === 0) {
        this.state.size.width = this.state.originalSize.width;
        this.state.size.height = this.state.originalSize.height;
        this.state.position.x = (window.innerWidth - this.state.size.width) / 2;
        this.state.position.y = (window.innerHeight - this.state.size.height) / 2;
      }

      this.updateImageAll();
      if (this.toolbar) {
        this.updateToolbar();
      }

      // 图片加载完成后保存状态
      this.saveState();
    };

    // 插入到body的第一个位置（最下层）
    if (document.body.firstChild) {
      document.body.insertBefore(this.image, document.body.firstChild);
    } else {
      document.body.appendChild(this.image);
    }

    this.createResizeHandles();
    this.updateImageState();
  }
  
  createResizeHandles() {
    if (!this.image) return;

    // 移除现有手柄
    const existingHandles = this.image.querySelectorAll('.resize-handle, .resize-handle-logo');
    existingHandles.forEach(handle => handle.remove());

    // 根据状态决定显示哪些手柄
    if (!this.state.handlesVisible) return;

    // 创建Logo手柄（默认显示）
    const logoHandle = document.createElement('div');
    logoHandle.className = 'resize-handle-logo se';
    logoHandle.dataset.position = 'se';

    // 创建正常手柄（鼠标悬停时显示）
    const normalHandle = document.createElement('div');
    normalHandle.className = 'resize-handle se';
    normalHandle.dataset.position = 'se';
    normalHandle.style.display = 'none';

    // Logo手柄鼠标事件 - 只切换手柄显示，不控制工具栏
    logoHandle.addEventListener('mouseenter', () => {
      logoHandle.style.display = 'none';
      normalHandle.style.display = 'flex';
    });

    // 正常手柄鼠标事件 - 只切换手柄显示，不控制工具栏
    normalHandle.addEventListener('mouseleave', () => {
      normalHandle.style.display = 'none';
      logoHandle.style.display = 'flex';
    });

    this.image.appendChild(logoHandle);
    this.image.appendChild(normalHandle);
  }

  
  createToolbar() {
    if (this.toolbar) {
      this.toolbar.remove();
    }

    this.toolbar = document.createElement('div');
    this.toolbar.id = 'design-inspector-toolbar';

    // 设置工具栏位置
    this.toolbar.style.left = this.state.toolbarPosition.x + '%';
    this.toolbar.style.top = this.state.toolbarPosition.y + 'px';

    this.toolbar.innerHTML = `
      <!-- 主要控制行 -->
      <div class="toolbar-row main-controls">
        <div class="toolbar-group">
          <span class="toolbar-label">透明度</span>
          <input type="range" class="toolbar-slider" id="opacity-slider" min="0" max="100" value="${this.state.opacity}">
          <input type="number" class="toolbar-input small" id="opacity-input" min="0" max="100" value="${this.state.opacity}">
          <span>%</span>
        </div>

        <div class="toolbar-group">
          <button class="toolbar-button" id="lock-btn">${this.state.frozen ? '解锁' : '锁定'}</button>
        </div>
      </div>

      <!-- 详细控制行 -->
      <div class="toolbar-row detail-controls">
        <!-- 位置控制 -->
        <div class="toolbar-group">
          <span class="toolbar-label">位置</span>
          <div class="control-row">
            <div class="input-with-label">
              <span class="input-label">X</span>
              <input type="number" class="toolbar-input" id="pos-x-input" value="${Math.round(this.state.position.x)}">
            </div>
            <div class="input-with-label">
              <span class="input-label">Y</span>
              <input type="number" class="toolbar-input" id="pos-y-input" value="${Math.round(this.state.position.y)}">
            </div>
          </div>
        </div>

        <!-- 尺寸控制 -->
        <div class="toolbar-group">
          <span class="toolbar-label">尺寸</span>
          <div class="control-row">
            <input type="text" class="toolbar-input" id="width-input" value="${Math.round(this.state.size.width)}" placeholder="宽度">
            <input type="text" class="toolbar-input" id="height-input" value="${Math.round(this.state.size.height)}" placeholder="高度">
          </div>
          <div class="control-row" style="margin-top: 4px;">
            <button class="size-btn" id="size-original" title="原图尺寸">原图</button>
          </div>
        </div>

        <!-- 位置对齐 -->
        <div class="toolbar-group">
          <span class="toolbar-label">对齐</span>
          <div class="align-buttons">
            <button class="align-btn" id="align-top-left" title="左上角">↖</button>
            <button class="align-btn" id="align-top-center" title="顶部居中">↑</button>
            <button class="align-btn" id="align-top-right" title="右上角">↗</button>
            <button class="align-btn" id="align-center-left" title="左侧居中">←</button>
            <button class="align-btn" id="align-center" title="居中">⊙</button>
            <button class="align-btn" id="align-center-right" title="右侧居中">→</button>
            <button class="align-btn" id="align-bottom-left" title="左下角">↙</button>
            <button class="align-btn" id="align-bottom-center" title="底部居中">↓</button>
            <button class="align-btn" id="align-bottom-right" title="右下角">↘</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.toolbar);
    this.bindToolbarEvents();
    this.bindToolbarDrag();
  }
  
  bindEvents() {
    // 监听来自popup的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'uploadImage') {
        this.activate(message.imageData);
      } else if (message.action === 'loadUrl') {
        this.loadImageFromUrl(message.url);
      } else if (message.action === 'exit') {
        this.deactivate();
      } else if (message.action === 'command') {
        this.handleCommand(message.command);
      } else if (message.action === 'checkStatus') {
        sendResponse({ isActive: this.isActive });
      }
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    // 鼠标事件
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // 防止拖拽时选中文本
    document.addEventListener('selectstart', (e) => {
      if (this.isResizing || this.isDragging || this.isToolbarDragging) {
        e.preventDefault();
      }
    });

    // 防止页面刷新时丢失状态
    window.addEventListener('beforeunload', () => {
      if (this.isActive) {
        this.saveState();
      }
    });
  }
  
  bindToolbarEvents() {
    // 图片透明度控制
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityInput = document.getElementById('opacity-input');

    opacitySlider.addEventListener('input', (e) => {
      this.state.opacity = parseInt(e.target.value);
      opacityInput.value = this.state.opacity;
      this.updateImageOpacity();
      this.saveState();
    });

    opacityInput.addEventListener('change', (e) => {
      const opacity = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
      this.state.opacity = opacity;
      opacitySlider.value = opacity;
      opacityInput.value = opacity;
      this.updateImageOpacity();
      this.saveState();
    });

    // 位置控制
    this.bindPositionControls();

    // 尺寸控制
    this.bindSizeControls();

    // 快速尺寸控制
    this.bindQuickSizeControls();

    // 对齐控制
    this.bindAlignControls();

    // 按钮事件
    const lockBtn = document.getElementById('lock-btn');
    if (lockBtn) {
      lockBtn.addEventListener('click', () => {
        this.toggleFreeze();
        lockBtn.textContent = this.state.frozen ? '解锁' : '锁定';
      });
    }

  }

  bindPositionControls() {
    const posXInput = document.getElementById('pos-x-input');
    const posYInput = document.getElementById('pos-y-input');

    // 位置输入框 - 实时更新
    if (posXInput) {
      posXInput.addEventListener('input', (e) => {
        if (this.state.frozen) return;
        const x = parseInt(e.target.value) || 0;
        this.state.position.x = x;
        this.updateImagePosition();
      });

      posXInput.addEventListener('change', (e) => {
        this.saveState();
      });
    }

    if (posYInput) {
      posYInput.addEventListener('input', (e) => {
        if (this.state.frozen) return;
        const y = parseInt(e.target.value) || 0;
        this.state.position.y = y;
        this.updateImagePosition();
      });

      posYInput.addEventListener('change', (e) => {
        this.saveState();
      });
    }


  }

  bindSizeControls() {
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');

    if (widthInput) {
      widthInput.addEventListener('change', (e) => {
        const width = parseInt(e.target.value);
        if (width > 0 && !this.state.frozen) {
          this.state.size.width = width;
          this.updateImageSize();
          this.saveState();
        }
      });
    }

    if (heightInput) {
      heightInput.addEventListener('change', (e) => {
        const height = parseInt(e.target.value);
        if (height > 0 && !this.state.frozen) {
          this.state.size.height = height;
          this.updateImageSize();
          this.saveState();
        }
      });
    }
  }

  bindSizeControls() {
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');

    // 尺寸输入框 - 实时更新
    if (widthInput) {
      widthInput.addEventListener('input', (e) => {
        if (this.state.frozen) return;
        const value = e.target.value.trim();

        // 处理特殊值
        if (value === '铺满' || value === 'fill') {
          this.state.size.width = window.innerWidth;
        } else if (value === '原图' || value === 'original') {
          this.state.size.width = this.state.originalSize.width;
        } else {
          const width = Math.max(20, parseInt(value) || 100);
          this.state.size.width = width;
        }

        this.updateImageSize();
        this.updateToolbar();
      });

      widthInput.addEventListener('change', (e) => {
        this.saveState();
      });
    }

    if (heightInput) {
      heightInput.addEventListener('input', (e) => {
        if (this.state.frozen) return;
        const value = e.target.value.trim();

        // 处理特殊值
        if (value === '铺满' || value === 'fill') {
          this.state.size.height = window.innerHeight;
        } else if (value === '原图' || value === 'original') {
          this.state.size.height = this.state.originalSize.height;
        } else {
          const height = Math.max(20, parseInt(value) || 100);
          this.state.size.height = height;
        }

        this.updateImageSize();
        this.updateToolbar();
      });

      heightInput.addEventListener('change', (e) => {
        this.saveState();
      });
    }
  }

  bindQuickSizeControls() {
    // 原图尺寸
    const sizeOriginal = document.getElementById('size-original');
    if (sizeOriginal) {
      sizeOriginal.addEventListener('click', () => {
        this.state.size.width = this.state.originalSize.width;
        this.state.size.height = this.state.originalSize.height;
        this.updateImageSize();
        this.updateToolbar();
        this.saveState();
      });
    }
  }

  bindAlignControls() {
    // 9宫格对齐
    const alignments = {
      'align-top-left': { x: 0, y: 0 },
      'align-top-center': { x: (window.innerWidth - this.state.size.width) / 2, y: 0 },
      'align-top-right': { x: window.innerWidth - this.state.size.width, y: 0 },
      'align-center-left': { x: 0, y: (window.innerHeight - this.state.size.height) / 2 },
      'align-center': {
        x: (window.innerWidth - this.state.size.width) / 2,
        y: (window.innerHeight - this.state.size.height) / 2
      },
      'align-center-right': {
        x: window.innerWidth - this.state.size.width,
        y: (window.innerHeight - this.state.size.height) / 2
      },
      'align-bottom-left': { x: 0, y: window.innerHeight - this.state.size.height },
      'align-bottom-center': {
        x: (window.innerWidth - this.state.size.width) / 2,
        y: window.innerHeight - this.state.size.height
      },
      'align-bottom-right': {
        x: window.innerWidth - this.state.size.width,
        y: window.innerHeight - this.state.size.height
      }
    };

    Object.keys(alignments).forEach(id => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', () => {
          // 重新计算位置（因为窗口大小可能变化）
          const pos = this.calculateAlignPosition(id);
          this.state.position.x = pos.x;
          this.state.position.y = pos.y;
          this.updateImagePosition();
          this.updateToolbar();
          this.saveState();
        });
      }
    });
  }

  calculateAlignPosition(alignType) {
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const imgWidth = this.state.size.width;
    const imgHeight = this.state.size.height;

    // 计算基础位置
    let x, y;

    switch (alignType) {
      case 'align-top-left':
        x = 0;
        y = 0;
        break;
      case 'align-top-center':
        x = Math.max(0, (viewWidth - imgWidth) / 2);
        y = 0;
        break;
      case 'align-top-right':
        x = Math.max(0, viewWidth - imgWidth);
        y = 0;
        break;
      case 'align-center-left':
        x = 0;
        y = Math.max(0, (viewHeight - imgHeight) / 2);
        break;
      case 'align-center':
        x = Math.max(0, (viewWidth - imgWidth) / 2);
        y = Math.max(0, (viewHeight - imgHeight) / 2);
        break;
      case 'align-center-right':
        x = Math.max(0, viewWidth - imgWidth);
        y = Math.max(0, (viewHeight - imgHeight) / 2);
        break;
      case 'align-bottom-left':
        x = 0;
        y = Math.max(0, viewHeight - imgHeight);
        break;
      case 'align-bottom-center':
        x = Math.max(0, (viewWidth - imgWidth) / 2);
        y = Math.max(0, viewHeight - imgHeight);
        break;
      case 'align-bottom-right':
        x = Math.max(0, viewWidth - imgWidth);
        y = Math.max(0, viewHeight - imgHeight);
        break;
      default:
        x = 0;
        y = 0;
    }

    // 如果图片比屏幕大，确保至少有一部分可见
    if (imgWidth > viewWidth) {
      // 对于右对齐，让右边缘贴边
      if (alignType.includes('right')) {
        x = viewWidth - imgWidth;
      }
      // 对于居中，让图片居中显示
      else if (alignType.includes('center')) {
        x = (viewWidth - imgWidth) / 2;
      }
      // 对于左对齐，让左边缘贴边
      else {
        x = 0;
      }
    }

    if (imgHeight > viewHeight) {
      // 对于底部对齐，让底边贴边
      if (alignType.includes('bottom')) {
        y = viewHeight - imgHeight;
      }
      // 对于居中，让图片居中显示
      else if (alignType.includes('center') && !alignType.includes('left') && !alignType.includes('right')) {
        y = (viewHeight - imgHeight) / 2;
      }
      // 对于顶部对齐，让顶边贴边
      else {
        y = 0;
      }
    }

    return { x, y };
  }





  bindToolbarDrag() {
    if (!this.toolbar) return;

    this.toolbar.addEventListener('mousedown', (e) => {
      // 只有点击工具栏本身或拖拽指示器时才开始拖拽
      if (e.target === this.toolbar || e.target.classList.contains('toolbar-drag-handle')) {
        this.isToolbarDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };

        // 获取当前工具栏位置
        const rect = this.toolbar.getBoundingClientRect();
        this.toolbarStart = { x: rect.left, y: rect.top };

        // 切换到绝对定位
        this.toolbar.style.left = rect.left + 'px';
        this.toolbar.style.top = rect.top + 'px';
        this.toolbar.style.transform = 'none';

        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  // 键盘事件处理
  handleKeydown(e) {
    // 只在插件激活时处理快捷键
    if (!this.isActive) return;

    // 如果在输入框中，不处理快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    const key = e.key.toLowerCase();

    // 透明度快捷键：↑/↓，Shift 加速
    if (key === 'arrowup' || key === 'arrowdown') {
      e.preventDefault();
      const delta = (e.shiftKey ? 10 : 1) * (key === 'arrowup' ? 1 : -1);
      this.state.opacity = Math.max(0, Math.min(100, this.state.opacity + delta));
      this.updateImageOpacity();
      this.updateToolbar();
      this.saveState();
      return;
    }

    // 单键快捷键
    switch (key) {
      case 'h':
        e.preventDefault();
        this.toggleVisibility();
        break;
      case 'f':
        e.preventDefault();
        this.toggleToolbar();
        break;
      case 'd':
        e.preventDefault();
        this.toggleFreeze();
        break;
      case 'm':
        e.preventDefault();
        this.toggleImageDraggable();
        break;
      case 'r':
        e.preventDefault();
        this.toggleHandles();
        break;
      case 'escape':
        e.preventDefault();
        this.deactivate();
        break;
    }

    // 数字键处理透明度
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      this.handleOpacityKey(key);
    }

    // 方向键移动
    if (['arrowleft', 'arrowright'].includes(key)) {
      e.preventDefault();
      this.handleArrowKey(key, e.shiftKey);
    }

    // Alt组合键
    if (e.altKey && /^[0-4]$/.test(key)) {
      e.preventDefault();
      this.handleAltKey(key);
    }
  }

  toggleHandles() {
    this.state.handlesVisible = !this.state.handlesVisible;
    this.createResizeHandles();
    this.saveState();
  }

  handleOpacityKey(key) {
    this.keyBuffer += key;

    // 清除之前的定时器
    if (this.keyTimer) {
      clearTimeout(this.keyTimer);
    }

    // 设置新的定时器
    this.keyTimer = setTimeout(() => {
      let opacity = parseInt(this.keyBuffer);

      // 如果只有一位数字，补0
      if (this.keyBuffer.length === 1) {
        opacity = opacity * 10;
      }

      // 限制范围
      opacity = Math.max(0, Math.min(100, opacity));

      this.state.opacity = opacity;
      this.updateImageOpacity();
      this.updateToolbar();
      this.saveState();

      this.keyBuffer = '';
    }, 1000);
  }

  handleArrowKey(key, shiftKey) {
    if (!this.image) return;

    const step = shiftKey ? 10 : 1;

    switch (key) {
      case 'arrowup':
        this.state.position.y -= step;
        break;
      case 'arrowdown':
        this.state.position.y += step;
        break;
      case 'arrowleft':
        this.state.position.x -= step;
        break;
      case 'arrowright':
        this.state.position.x += step;
        break;
    }

    this.updateImagePosition();
    this.updateToolbar();
    this.saveState();
  }

  handleAltKey(key) {
    switch (key) {
      case '0':
        this.resetImage();
        break;
      case '1':
        this.setOriginalSize();
        break;
      case '2':
        this.setDoubleSize();
        break;
      case '3':
        this.setHalfSize();
        break;
      case '4':
        this.fitToWidth();
        break;
    }
  }

  // 鼠标事件处理
  handleMouseDown(e) {
    if (!this.image || this.state.frozen) return;

    const target = e.target;

    // 调整手柄
    if (target.classList.contains('resize-handle')) {
      this.isResizing = true;
      this.resizeHandle = target.dataset.position;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.imageStart = {
        x: this.state.position.x,
        y: this.state.position.y,
        width: this.state.size.width,
        height: this.state.size.height
      };
      // 临时启用图片事件以便拖拽
      this.image.classList.add('draggable');
      // 防止文本选中
      document.body.classList.add('vision-compare-dragging');
      e.preventDefault();
      return;
    }

    // 图片拖拽 - 通过快捷键或特殊操作启用
    if (target === this.image && this.image.classList.contains('draggable')) {
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.imageStart = { x: this.state.position.x, y: this.state.position.y };
      // 防止文本选中
      document.body.classList.add('vision-compare-dragging');
      e.preventDefault();
    }
  }

  handleMouseMove(e) {
    if (this.isToolbarDragging) {
      this.handleToolbarDrag(e);
      return;
    }

    if (!this.image) return;

    if (this.isResizing) {
      this.handleResize(e);
    } else if (this.isDragging) {
      this.handleDrag(e);
    }
  }

  handleMouseUp(e) {
    if (this.isDragging || this.isResizing) {
      this.saveState();
    }

    // 拖拽结束后禁用图片事件
    if (this.image) {
      this.image.classList.remove('draggable');
    }

    // 移除防止文本选中的类
    document.body.classList.remove('vision-compare-dragging');

    this.isDragging = false;
    this.isResizing = false;
    this.isToolbarDragging = false;
    this.resizeHandle = null;
  }

  handleToolbarDrag(e) {
    const deltaX = e.clientX - this.dragStart.x;
    const deltaY = e.clientY - this.dragStart.y;

    let newX = this.toolbarStart.x + deltaX;
    let newY = this.toolbarStart.y + deltaY;

    // 限制在视窗内
    const toolbarRect = this.toolbar.getBoundingClientRect();
    newX = Math.max(0, Math.min(window.innerWidth - toolbarRect.width, newX));
    newY = Math.max(0, Math.min(window.innerHeight - toolbarRect.height, newY));

    this.toolbar.style.left = newX + 'px';
    this.toolbar.style.top = newY + 'px';
  }

  handleDrag(e) {
    const deltaX = e.clientX - this.dragStart.x;
    const deltaY = e.clientY - this.dragStart.y;

    let newX = this.imageStart.x + deltaX;
    let newY = this.imageStart.y + deltaY;

    this.state.position.x = newX;
    this.state.position.y = newY;

    this.updateImagePosition();
  }

  handleResize(e) {
    const deltaX = e.clientX - this.dragStart.x;
    const deltaY = e.clientY - this.dragStart.y;

    const handle = this.resizeHandle;
    let newWidth = this.imageStart.width;
    let newHeight = this.imageStart.height;
    let newX = this.imageStart.x;
    let newY = this.imageStart.y;

    // 防止文本选中
    e.preventDefault();

    switch (handle) {
      case 'se': // 右下角
        newWidth = this.imageStart.width + deltaX;
        newHeight = this.imageStart.height + deltaY;
        break;
      case 'sw': // 左下角
        newWidth = this.imageStart.width - deltaX;
        newHeight = this.imageStart.height + deltaY;
        newX = this.imageStart.x + deltaX;
        break;
      case 'ne': // 右上角
        newWidth = this.imageStart.width + deltaX;
        newHeight = this.imageStart.height - deltaY;
        newY = this.imageStart.y + deltaY;
        break;
      case 'nw': // 左上角
        newWidth = this.imageStart.width - deltaX;
        newHeight = this.imageStart.height - deltaY;
        newX = this.imageStart.x + deltaX;
        newY = this.imageStart.y + deltaY;
        break;
    }

    // 限制最小尺寸
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);

    this.state.size.width = newWidth;
    this.state.size.height = newHeight;
    this.state.position.x = newX;
    this.state.position.y = newY;

    this.updateImageSize();
    this.updateImagePosition();
    this.updateToolbar();
  }

  // 键盘事件处理
  handleKeydown(e) {
    // 如果在输入框中，不处理快捷键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    const key = e.key.toLowerCase();

    // 单键快捷键
    switch (key) {
      case 'h':
        e.preventDefault();
        this.toggleVisibility();
        break;
      case 'f':
        e.preventDefault();
        this.toggleToolbar();
        break;
      case 'd':
        e.preventDefault();
        this.toggleFreeze();
        break;
    }

    // 数字键处理透明度
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      this.handleOpacityKey(key);
    }

    // 方向键移动
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      e.preventDefault();
      this.handleArrowKey(key, e.shiftKey);
    }

    // Alt组合键
    if (e.altKey && /^[0-4]$/.test(key)) {
      e.preventDefault();
      this.handleAltKey(key);
    }
  }

  handleOpacityKey(key) {
    this.keyBuffer += key;

    // 清除之前的定时器
    if (this.keyTimer) {
      clearTimeout(this.keyTimer);
    }

    // 设置新的定时器
    this.keyTimer = setTimeout(() => {
      let opacity = parseInt(this.keyBuffer);

      // 如果只有一位数字，补0
      if (this.keyBuffer.length === 1) {
        opacity = opacity * 10;
      }

      // 限制范围
      opacity = Math.max(0, Math.min(100, opacity));

      this.state.opacity = opacity;
      this.updateImageOpacity();
      this.updateToolbar();
      this.saveState();

      this.keyBuffer = '';
    }, 1000);
  }

  handleArrowKey(key, shiftKey) {
    if (!this.image) return;

    const step = shiftKey ? 10 : 1;

    switch (key) {
      case 'arrowup':
        this.state.position.y -= step;
        break;
      case 'arrowdown':
        this.state.position.y += step;
        break;
      case 'arrowleft':
        this.state.position.x -= step;
        break;
      case 'arrowright':
        this.state.position.x += step;
        break;
    }

    this.updateImagePosition();
    this.saveState();
  }

  handleAltKey(key) {
    switch (key) {
      case '0':
        this.resetImage();
        break;
      case '1':
        this.setOriginalSize();
        break;
      case '2':
        this.setDoubleSize();
        break;
      case '3':
        this.setHalfSize();
        break;
      case '4':
        this.fitToWidth();
        break;
    }
  }



  handleResize(e) {
    const deltaX = e.clientX - this.dragStart.x;
    const deltaY = e.clientY - this.dragStart.y;

    const handle = this.resizeHandle;
    let newWidth = this.imageStart.width;
    let newHeight = this.imageStart.height;
    let newX = this.imageStart.x;
    let newY = this.imageStart.y;

    switch (handle) {
      case 'se': // 右下角
        newWidth = this.imageStart.width + deltaX;
        newHeight = this.imageStart.height + deltaY;
        break;
      case 'sw': // 左下角
        newWidth = this.imageStart.width - deltaX;
        newHeight = this.imageStart.height + deltaY;
        newX = this.imageStart.x + deltaX;
        break;
      case 'ne': // 右上角
        newWidth = this.imageStart.width + deltaX;
        newHeight = this.imageStart.height - deltaY;
        newY = this.imageStart.y + deltaY;
        break;
      case 'nw': // 左上角
        newWidth = this.imageStart.width - deltaX;
        newHeight = this.imageStart.height - deltaY;
        newX = this.imageStart.x + deltaX;
        newY = this.imageStart.y + deltaY;
        break;
    }

    // 限制最小尺寸
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);

    this.state.size.width = newWidth;
    this.state.size.height = newHeight;
    this.state.position.x = newX;
    this.state.position.y = newY;

    this.updateImageSize();
    this.updateImagePosition();
    this.updateToolbar();
  }

  // 状态切换方法
  toggleVisibility() {
    this.state.visible = !this.state.visible;
    this.updateImageState();
    this.updateStatusIndicator();
    this.saveState();
  }

  toggleToolbar() {
    this.state.toolbarVisible = !this.state.toolbarVisible;
    this.updateToolbarState();
    this.saveState();
  }

  toggleFreeze() {
    this.state.frozen = !this.state.frozen;
    this.updateImageState();
    this.updateStatusIndicator();
    this.saveState();
  }

  // 尺寸控制方法
  resetImage() {
    this.state.position = { x: 100, y: 100 };
    this.state.size = { width: 300, height: 200 };
    this.state.opacity = 50;
    this.state.blendMode = 'normal';
    this.updateImageAll();
    this.updateToolbar();
    this.saveState();
  }

  setOriginalSize() {
    if (!this.image) return;
    this.state.size.width = this.state.originalSize.width;
    this.state.size.height = this.state.originalSize.height;
    this.updateImageSize();
    this.updateToolbar();
    this.saveState();
  }

  setDoubleSize() {
    if (!this.image) return;
    this.state.size.width = this.state.originalSize.width * 2;
    this.state.size.height = this.state.originalSize.height * 2;
    this.updateImageSize();
    this.updateToolbar();
    this.saveState();
  }

  setHalfSize() {
    if (!this.image) return;
    this.state.size.width = this.state.originalSize.width * 0.5;
    this.state.size.height = this.state.originalSize.height * 0.5;
    this.updateImageSize();
    this.updateToolbar();
    this.saveState();
  }

  fitToWidth() {
    if (!this.image) return;
    const windowWidth = window.innerWidth;
    const ratio = this.state.originalSize.height / this.state.originalSize.width;
    this.state.size.width = windowWidth * 0.9;
    this.state.size.height = this.state.size.width * ratio;
    this.state.position.x = windowWidth * 0.05;
    this.updateImageSize();
    this.updateImagePosition();
    this.updateToolbar();
    this.saveState();
  }

  async loadImageFromUrl(url) {
    try {
      // 简单校验：必须是http(s)
      if (!/^https?:\/\//i.test(url)) return;
      this.activate(url);
    } catch (e) {
      console.warn('Failed to load image from URL:', e);
    }
  }

  fitToScreen() {
    if (!this.image) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const imageRatio = this.state.originalSize.width / this.state.originalSize.height;
    const windowRatio = windowWidth / windowHeight;

    // 根据宽高比决定如何铺满屏幕
    if (imageRatio > windowRatio) {
      // 图片更宽，以宽度为准
      this.state.size.width = windowWidth;
      this.state.size.height = windowWidth / imageRatio;
      this.state.position.x = 0;
      this.state.position.y = (windowHeight - this.state.size.height) / 2;
    } else {
      // 图片更高，以高度为准
      this.state.size.height = windowHeight;
      this.state.size.width = windowHeight * imageRatio;
      this.state.position.y = 0;
      this.state.position.x = (windowWidth - this.state.size.width) / 2;
    }

    this.updateImageSize();
    this.updateImagePosition();
    this.updateToolbar();
    this.saveState();
  }

  // 更新方法
  updateImageAll() {
    if (!this.image) return;
    this.updateImagePosition();
    this.updateImageSize();
    this.updateImageOpacity();
    this.updateImageBlendMode();
    this.updateImageState();
  }

  updateImagePosition() {
    if (!this.image) return;
    // 确保位置值是数字
    const x = typeof this.state.position.x === 'number' ? this.state.position.x : 0;
    const y = typeof this.state.position.y === 'number' ? this.state.position.y : 0;

    this.image.style.left = x + 'px';
    this.image.style.top = y + 'px';
  }

  updateImageSize() {
    if (!this.image) return;
    this.image.style.width = this.state.size.width + 'px';
    this.image.style.height = this.state.size.height + 'px';
  }

  updateImageOpacity() {
    if (!this.image) return;
    this.image.style.opacity = this.state.opacity / 100;
  }

  updateImageBlendMode() {
    if (!this.image) return;
    this.image.style.mixBlendMode = this.state.blendMode;
  }



  updateImageState() {
    if (!this.image) return;

    // 显示/隐藏
    if (this.state.visible) {
      this.image.classList.remove('hidden');
    } else {
      this.image.classList.add('hidden');
    }

    // 冻结状态
    if (this.state.frozen) {
      this.image.classList.add('frozen');
    } else {
      this.image.classList.remove('frozen');
    }

    // 更新调整手柄
    const handles = this.image.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
      if (this.state.frozen) {
        handle.classList.add('frozen');
      } else {
        handle.classList.remove('frozen');
      }
    });
  }

  updateToolbarState() {
    if (!this.toolbar) return;

    if (this.state.toolbarVisible) {
      this.toolbar.classList.add('visible');
    } else {
      this.toolbar.classList.remove('visible');
    }
  }

  toggleImageDraggable() {
    if (!this.image) return;
    this.image.classList.toggle('draggable');
  }

  updateToolbar() {
    if (!this.toolbar) return;

    // 更新透明度控制
    const opacitySlider = document.getElementById('opacity-slider');
    const opacityInput = document.getElementById('opacity-input');
    if (opacitySlider && opacityInput) {
      opacitySlider.value = this.state.opacity;
      opacityInput.value = this.state.opacity;
    }

    // 更新位置输入
    const posXInput = document.getElementById('pos-x-input');
    const posYInput = document.getElementById('pos-y-input');
    if (posXInput && posYInput) {
      posXInput.value = Math.round(this.state.position.x);
      posYInput.value = Math.round(this.state.position.y);
    }

    // 更新尺寸输入
    const widthInput = document.getElementById('width-input');
    const heightInput = document.getElementById('height-input');
    if (widthInput && heightInput) {
      widthInput.value = Math.round(this.state.size.width);
      heightInput.value = Math.round(this.state.size.height);
    }

    // 更新锁定按钮文本
    const lockBtn = document.getElementById('lock-btn');
    if (lockBtn) {
      lockBtn.textContent = this.state.frozen ? '解锁' : '锁定';
    }
  }

  updateStatusIndicator() {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    if (!statusDot || !statusText) return;

    // 清除所有状态类
    statusDot.classList.remove('frozen', 'hidden');

    if (!this.state.visible) {
      statusDot.classList.add('hidden');
      statusText.textContent = '已隐藏';
    } else if (this.state.frozen) {
      statusDot.classList.add('frozen');
      statusText.textContent = '已冻结';
    } else {
      statusText.textContent = '正常';
    }
  }

  // 状态保存和加载 - 使用Chrome Storage API
  async saveState() {
    if (!this.isActive) return;

    const stateKey = `vision-compare-${window.location.hostname}`;
    try {
      // 检查扩展上下文是否有效
      if (!chrome.runtime?.id) {
        console.warn('Extension context invalidated, skipping state save');
        return;
      }

      const stateToSave = {
        ...this.state,
        imageData: this.image ? this.image.src : null, // 保存图片数据
        timestamp: Date.now()
      };
      await chrome.storage.local.set({
        [stateKey]: stateToSave
      });
    } catch (error) {
      console.warn('Failed to save Vision Check state:', error);
    }
  }

  async loadState() {
    const stateKey = `vision-compare-${window.location.hostname}`;
    try {
      const result = await chrome.storage.local.get([stateKey]);
      const savedState = result[stateKey];

      if (savedState) {
        // 检查状态是否过期（24小时）
        const isExpired = Date.now() - savedState.timestamp > 24 * 60 * 60 * 1000;
        if (!isExpired && savedState.imageData) {
          // 恢复状态
          this.state = { ...this.state, ...savedState };

          // 重新激活插件并恢复图片
          this.activate(savedState.imageData, true);
        }
      }
    } catch (error) {
      console.warn('Failed to load Vision Check state:', error);
    }
  }

  async clearState() {
    const stateKey = `vision-compare-${window.location.hostname}`;
    try {
      await chrome.storage.local.remove([stateKey]);
    } catch (error) {
      console.warn('Failed to clear Vision Check state:', error);
    }
  }
}

// 初始化插件
let designInspector;

// 确保DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    designInspector = new DesignInspector();
  });
} else {
  designInspector = new DesignInspector();
}

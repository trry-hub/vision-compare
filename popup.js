document.addEventListener('DOMContentLoaded', function() {
  const uploadSection = document.getElementById('uploadSection');
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('fileInput');
  const exitSection = document.getElementById('exitSection');

  // 检查当前页面是否有激活的插件
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'checkStatus' }, function(response) {
      if (response && response.isActive) {
        exitSection.style.display = 'block';
      }
    });
  });

  // 点击上传按钮
  uploadBtn.addEventListener('click', function(e) {
    e.stopPropagation(); // 阻止事件冒泡
    fileInput.click();
  });

  // 点击上传区域（但不包括按钮）
  uploadSection.addEventListener('click', function(e) {
    // 如果点击的是按钮，不执行
    if (e.target === uploadBtn || uploadBtn.contains(e.target)) {
      return;
    }
    fileInput.click();
  });

  // 文件选择处理
  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  });

  // 拖拽上传
  uploadSection.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadSection.classList.add('dragover');
  });

  uploadSection.addEventListener('dragleave', function(e) {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
  });

  uploadSection.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadSection.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageUpload(files[0]);
    }
  });

  // 处理图片上传
  function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const imageData = e.target.result;

      // 发送图片数据到content script
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'uploadImage',
          imageData: imageData,
          fileName: file.name
        });
      });

      // 关闭popup
      window.close();
    };
    reader.readAsDataURL(file);
  }



  // 退出插件
  const exitBtn = document.getElementById('exitBtn');
  exitBtn?.addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'exit' });
    });
    exitSection.style.display = 'none';
    window.close();
  });

  // 粘贴剪贴板图片
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          handleImageUpload(file);
          break;
        }
      }
    }
  });
});

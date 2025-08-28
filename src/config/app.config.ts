/**
 * 应用配置文件
 * 集中管理应用的配置项
 */
export const AppConfig = {
  // 应用信息
  app: {
    name: 'Vision Compare',
    version: '1.0.0',
    description: 'Chrome extension for visual comparison',
  },

  // 默认设置
  defaults: {
    opacity: 50,
    position: { x: 0, y: 0 },
    positionMode: 'absolute' as const,
    size: { width: 300, height: 200 },
    originalSize: { width: 0, height: 0 },
    visible: true,
    frozen: false,
    freezed: false,
    toolbarVisible: true,
  },

  // UI 配置
  ui: {
    controller: {
      width: 320,
      height: 250,
      margin: 10,
    },
    debounceDelay: 1000,
    dragThreshold: 5,
    animationDuration: 300,
  },

  // 存储键名
  storage: {
    keys: {
      locked: 'vision-compare-current-locked-key',
      freezed: 'vision-compare-current-freezed-key',
      temp: 'vision-compare-temp',
    },
    prefixes: {
      locked: 'vision-compare-locked',
      freezed: 'vision-compare-freezed',
      temp: 'vision-compare-temp',
    },
  },

  // 样式配置
  styles: {
    zIndex: {
      image: 999999998,
      controller: 999999999,
    },
    colors: {
      primary: '#3d61e3',
      primaryHover: '#2a4bc7',
      danger: '#ff3b30',
      dangerHover: '#d70015',
    },
  },

  // 快捷键配置
  shortcuts: {
    visibility: 'v',
    freeze: 'l',
    freezed: 'z',
    controllerVisibility: 'f',
    exit: 'escape',
  },

  // 开发配置
  dev: {
    enableLogging: process.env.NODE_ENV === 'development',
    enableDebugMode: false,
  },
} as const

// 类型导出
export type AppConfigType = typeof AppConfig
export type DefaultSettings = typeof AppConfig.defaults
export type UIConfig = typeof AppConfig.ui
export type StorageConfig = typeof AppConfig.storage
export type StylesConfig = typeof AppConfig.styles

/**
 * 应用常量定义
 */

// 消息类型
export const MESSAGE_TYPES = {
  PING: 'ping',
  UPLOAD_IMAGE: 'uploadImage',
  EXIT: 'exit',
  CHECK_STATUS: 'checkStatus',
  TOGGLE_CONTROLLER_VISIBILITY: 'toggleControllerVisibility',
  COMMAND: 'command',
} as const

// 位置模式
export const POSITION_MODES = {
  ABSOLUTE: 'absolute',
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right',
  TOP_LEFT: 'top-left',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
} as const

// CSS 类名
export const CSS_CLASSES = {
  VISION_IMAGE: 'vision-image',
  VISION_CONTROLLER: 'vision-controller',
  CONTROLLER_CONTENT: 'controller-content',
  CONTROLLER_PANEL: 'controller-panel',
  CONTROLLER_ROW: 'controller-row',
  CONTROLLER_LABEL: 'controller-label',
  CONTROLLER_SLIDER: 'controller-slider',
  CONTROLLER_INPUT: 'controller-input',
  CONTROLLER_SELECT: 'controller-select',
  CONTROLLER_VALUE: 'controller-value',
  POSITION_INPUTS: 'position-inputs',
  POSITION_INPUT_GROUP: 'position-input-group',
  POSITION_LABEL: 'position-label',
  POSITION_INPUT: 'position-input',
  POSITION_SHORTCUTS: 'position-shortcuts',
  SIZE_SHORTCUTS: 'size-shortcuts',
  SHORTCUT_BTN: 'shortcut-btn',
  ASPECT_RATIO_BTN: 'aspect-ratio-btn',
  CONTROLLER_ACTIONS: 'controller-actions',
  VISIBLE: 'visible',
  ACTIVE: 'active',
  DISABLED: 'disabled',
  FROZEN: 'frozen',
  HIDDEN: 'hidden',
  DRAGGING: 'vision-compare-dragging',
} as const

// 元素 ID
export const ELEMENT_IDS = {
  CONTROLLER_PANEL: 'controller-panel',
  OPACITY_SLIDER: 'opacity-slider',
  OPACITY_VALUE: 'opacity-value',
  POSITION_MODE: 'position-mode',
  POS_TOP: 'pos-top',
  POS_BOTTOM: 'pos-bottom',
  POS_LEFT: 'pos-left',
  POS_RIGHT: 'pos-right',
  SIZE_W: 'size-w',
  SIZE_H: 'size-h',
  VISIBILITY_BTN: 'visibility-btn',
  FREEZE_BTN: 'freeze-btn',
  FREEZED_BTN: 'freezed-btn',
  RESET_BTN: 'reset-btn',
  MOVE_TOP: 'move-top',
  MOVE_BOTTOM: 'move-bottom',
  MOVE_LEFT: 'move-left',
  MOVE_RIGHT: 'move-right',
  FIT_WIDTH: 'fit-width',
  FIT_HEIGHT: 'fit-height',
  ORIGINAL_SIZE: 'original-size',
  ASPECT_RATIO_TOGGLE: 'aspect-ratio-toggle',
} as const

// 事件类型
export const EVENT_TYPES = {
  CLICK: 'click',
  MOUSEDOWN: 'mousedown',
  MOUSEMOVE: 'mousemove',
  MOUSEUP: 'mouseup',
  KEYDOWN: 'keydown',
  INPUT: 'input',
  CHANGE: 'change',
  LOAD: 'load',
} as const

// 键盘按键
export const KEYBOARD_KEYS = {
  ARROW_UP: 'arrowup',
  ARROW_DOWN: 'arrowdown',
  ARROW_LEFT: 'arrowleft',
  ARROW_RIGHT: 'arrowright',
  ESCAPE: 'escape',
  V: 'v',
  L: 'l',
  Z: 'z',
  F: 'f',
} as const

// 错误消息
export const ERROR_MESSAGES = {
  NO_IMAGE_DATA: 'No image data provided',
  UNKNOWN_ACTION: 'Unknown action',
  STORAGE_FAILED: 'Storage operation failed',
  ELEMENT_NOT_FOUND: 'Element not found',
  INVALID_POSITION: 'Invalid position',
  INVALID_SIZE: 'Invalid size',
} as const

// 成功消息
export const SUCCESS_MESSAGES = {
  IMAGE_UPLOADED: 'Image uploaded successfully',
  STATE_SAVED: 'State saved successfully',
  CONTROLLER_TOGGLED: 'Controller visibility toggled',
  POSITION_UPDATED: 'Position updated',
  SIZE_UPDATED: 'Size updated',
} as const

// 类型导出
export type MessageType = typeof MESSAGE_TYPES[keyof typeof MESSAGE_TYPES]
export type PositionMode = typeof POSITION_MODES[keyof typeof POSITION_MODES]
export type CSSClass = typeof CSS_CLASSES[keyof typeof CSS_CLASSES]
export type ElementID = typeof ELEMENT_IDS[keyof typeof ELEMENT_IDS]
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]
export type KeyboardKey = typeof KEYBOARD_KEYS[keyof typeof KEYBOARD_KEYS]

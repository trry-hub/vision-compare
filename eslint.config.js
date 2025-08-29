import antfu from '@antfu/eslint-config'

export default antfu(
  {
    rules: {
      'eslint-comments/no-unlimited-disable': 'off',
      'curly': ['error', 'all'],
      'antfu/consistent-list-newline': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/*.vue'],
    rules: {
      // vue template 属性换行
      'vue/max-attributes-per-line': ['error', {
        singleline: {
          max: 2,
        },
        multiline: {
          max: 1,
        },
      }],
      'vue/block-order': ['error', {
        order: ['route', 'i18n', 'script', 'template', 'style'],
      }],
    },
  },
)

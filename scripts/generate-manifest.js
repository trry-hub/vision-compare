import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

async function generateManifest() {
  try {
    console.log('📦 Generating manifest.json from template...')
    
    // 读取 package.json
    const packageJsonPath = path.join(rootDir, 'package.json')
    const packageJson = await fs.readJson(packageJsonPath)
    
    // 读取模板文件
    const templatePath = path.join(rootDir, 'scripts', 'manifest.template.json')
    const template = await fs.readFile(templatePath, 'utf8')
    
    // 准备替换变量
    const variables = {
      name: packageJson.displayName || packageJson.name || 'Vision Compare（你的眼睛不是尺）',
      version: packageJson.version || '1.0.0',
      description: packageJson.description || '前端页面与设计稿像素级对比，提升还原率；支持覆盖、差异高亮、分屏对比、快捷键与持久化'
    }
    
    console.log('📋 Using variables:')
    console.log(`  Name: ${variables.name}`)
    console.log(`  Version: ${variables.version}`)
    console.log(`  Description: ${variables.description}`)
    
    // 替换模板变量
    let manifestContent = template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      manifestContent = manifestContent.replace(new RegExp(placeholder, 'g'), value)
    }
    
    // 验证生成的 JSON
    try {
      JSON.parse(manifestContent)
    } catch (error) {
      throw new Error(`Generated manifest.json is not valid JSON: ${error.message}`)
    }
    
    // 写入 manifest.json
    const manifestPath = path.join(rootDir, 'dist', 'manifest.json')
    await fs.writeFile(manifestPath, manifestContent, 'utf8')
    
    console.log('✅ manifest.json generated successfully!')
    console.log(`📍 Location: ${manifestPath}`)
    
    // 验证文件内容
    const generatedManifest = await fs.readJson(manifestPath)
    console.log('🔍 Generated manifest preview:')
    console.log(`  Name: ${generatedManifest.name}`)
    console.log(`  Version: ${generatedManifest.version}`)
    console.log(`  Description: ${generatedManifest.description.substring(0, 50)}...`)
    
  } catch (error) {
    console.error('❌ Failed to generate manifest.json:', error.message)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  generateManifest()
}

export default generateManifest

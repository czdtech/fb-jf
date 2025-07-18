// Stagewise 工具栏初始化脚本
// 使用 v0.5.2 工具栏与扩展 v0.8.7 的兼容配置

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.log('[Stagewise] 开始初始化工具栏... (v0.5.2)')

  // 动态导入 Stagewise 工具栏
  import('@stagewise/toolbar')
    .then(({ initToolbar }) => {
      console.log('[Stagewise] 工具栏模块加载成功')

      // 基础配置
      const stagewiseConfig = {
        plugins: [],
      }

      try {
        console.log('[Stagewise] 正在初始化工具栏...')
        initToolbar(stagewiseConfig)
        console.log('[Stagewise] 工具栏初始化完成')
      } catch (error) {
        console.error('[Stagewise] 初始化过程中出错:', error)
      }
    })
    .catch(error => {
      console.error('[Stagewise] 工具栏加载失败:', error)
    })
}

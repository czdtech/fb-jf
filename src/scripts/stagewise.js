// stagewise 工具栏初始化脚本
import { initToolbar } from '@stagewise/toolbar';

// 定义工具栏配置
const stagewiseConfig = {
  plugins: [],
};

// 初始化 stagewise 工具栏
function setupStagewise() {
  // 只在开发环境下初始化
  if (import.meta.env.DEV) {
    try {
      initToolbar(stagewiseConfig);
      console.log('✨ Stagewise 工具栏已初始化');
      console.log('💡 提示：WebSocket 连接错误是正常的发现机制，请忽略');
      console.log('🔍 如果显示 "No IDE windows found"，请确保：');
      console.log('  1. 只有一个 Cursor 窗口打开');
      console.log('  2. stagewise 扩展已在 Cursor 中启用');
      console.log('  3. 尝试重启 Cursor 或重新加载页面');
      console.log('  4. 检查 Cursor 命令面板中的 stagewise 命令');
    } catch (error) {
      console.warn('⚠️ Stagewise 工具栏初始化失败:', error);
      console.log('🔧 故障排除步骤：');
      console.log('  1. 检查网络连接');
      console.log('  2. 确认扩展已正确安装');
      console.log('  3. 尝试重新加载页面');
    }
  }
}

// 当 DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupStagewise);
} else {
  setupStagewise();
}

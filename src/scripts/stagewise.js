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
    } catch (error) {
      console.warn('⚠️ Stagewise 工具栏初始化失败:', error);
    }
  }
}

// 当 DOM 加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupStagewise);
} else {
  setupStagewise();
}
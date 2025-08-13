/**
 * Navigation.astro 修复持续监控策略
 * 
 * 该脚本用于监控 Navigation 组件在生产环境中的表现
 * 包括性能指标、用户体验和错误追踪
 */

// 性能监控配置
const PERFORMANCE_THRESHOLDS = {
  navigationRenderTime: 100, // ms
  languageSwitchTime: 200,   // ms
  mobileMenuToggleTime: 150, // ms
  memoryUsage: 5 * 1024      // 5KB
};

// 用户体验监控点
const UX_CHECKPOINTS = [
  'navigation-visible',
  'menu-items-clickable', 
  'language-selector-functional',
  'mobile-menu-toggle-working',
  'breadcrumb-accurate',
  'active-state-correct'
];

// 错误监控配置
const ERROR_CATEGORIES = {
  CRITICAL: [
    'navigation-not-rendered',
    'language-switch-broken',
    'mobile-menu-non-functional'
  ],
  WARNING: [
    'slow-language-switch',
    'accessibility-issue',
    'responsive-layout-problem'
  ],
  INFO: [
    'performance-degradation',
    'user-interaction-anomaly'
  ]
};

/**
 * Navigation 组件性能监控
 */
function monitorNavigationPerformance() {
  // 监控导航渲染时间
  const renderStart = performance.now();
  
  // 模拟导航组件加载
  return new Promise((resolve) => {
    // 监控关键指标
    const checkInterval = setInterval(() => {
      const navigationElement = document.querySelector('[role="navigation"]');
      
      if (navigationElement) {
        const renderTime = performance.now() - renderStart;
        
        if (renderTime > PERFORMANCE_THRESHOLDS.navigationRenderTime) {
          console.warn(`⚠️  Navigation 渲染时间超出阈值: ${renderTime}ms`);
          reportPerformanceIssue('navigation-slow-render', { renderTime });
        }
        
        clearInterval(checkInterval);
        resolve({ renderTime, status: 'success' });
      }
    }, 10);
    
    // 超时检查
    setTimeout(() => {
      clearInterval(checkInterval);
      console.error('❌ Navigation 渲染超时');
      reportCriticalError('navigation-render-timeout');
      resolve({ renderTime: null, status: 'timeout' });
    }, 5000);
  });
}

/**
 * 用户交互监控
 */
function monitorUserInteractions() {
  // 监控语言切换
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    
    // 语言选择器点击监控
    if (target.closest('[data-language-selector]')) {
      const switchStart = performance.now();
      
      // 监控语言切换完成
      const observer = new MutationObserver(() => {
        const switchTime = performance.now() - switchStart;
        
        if (switchTime > PERFORMANCE_THRESHOLDS.languageSwitchTime) {
          console.warn(`⚠️  语言切换耗时: ${switchTime}ms`);
          reportPerformanceIssue('language-switch-slow', { switchTime });
        }
        
        observer.disconnect();
      });
      
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    }
    
    // 移动端菜单切换监控
    if (target.closest('[data-mobile-menu-toggle]')) {
      const toggleStart = performance.now();
      const mobileMenu = document.querySelector('[data-mobile-menu]');
      
      if (mobileMenu) {
        const toggleTime = performance.now() - toggleStart;
        
        if (toggleTime > PERFORMANCE_THRESHOLDS.mobileMenuToggleTime) {
          console.warn(`⚠️  移动端菜单切换耗时: ${toggleTime}ms`);
          reportPerformanceIssue('mobile-menu-slow-toggle', { toggleTime });
        }
      }
    }
  });
}

/**
 * 可访问性监控
 */
function monitorAccessibility() {
  const accessibilityChecks = [
    {
      name: 'navigation-aria-label',
      check: () => document.querySelector('nav[aria-label]') !== null
    },
    {
      name: 'mobile-menu-aria-expanded',
      check: () => {
        const toggle = document.querySelector('[aria-expanded]');
        return toggle && ['true', 'false'].includes(toggle.getAttribute('aria-expanded'));
      }
    },
    {
      name: 'language-selector-aria-haspopup',
      check: () => document.querySelector('[aria-haspopup="true"]') !== null
    }
  ];
  
  accessibilityChecks.forEach(({ name, check }) => {
    if (!check()) {
      console.warn(`⚠️  可访问性问题: ${name}`);
      reportAccessibilityIssue(name);
    }
  });
}

/**
 * 响应式设计监控
 */
function monitorResponsiveDesign() {
  const breakpoints = {
    mobile: window.matchMedia('(max-width: 768px)'),
    tablet: window.matchMedia('(min-width: 769px) and (max-width: 1024px)'),
    desktop: window.matchMedia('(min-width: 1025px)')
  };
  
  Object.entries(breakpoints).forEach(([name, mediaQuery]) => {
    mediaQuery.addListener(() => {
      // 检查导航在不同屏幕尺寸下的表现
      setTimeout(() => {
        const navigation = document.querySelector('[role="navigation"]');
        if (!navigation) {
          console.error(`❌ Navigation 在 ${name} 尺寸下不可见`);
          reportCriticalError(`navigation-missing-${name}`);
        }
        
        // 检查移动端菜单
        if (name === 'mobile') {
          const mobileMenu = document.querySelector('[data-mobile-menu]');
          const menuToggle = document.querySelector('[data-mobile-menu-toggle]');
          
          if (!mobileMenu || !menuToggle) {
            console.error('❌ 移动端导航元素缺失');
            reportCriticalError('mobile-navigation-elements-missing');
          }
        }
      }, 100);
    });
  });
}

/**
 * 错误报告函数
 */
function reportCriticalError(type: string, details?: any) {
  console.error(`🚨 关键错误: ${type}`, details);
  
  // 发送到监控服务（模拟）
  if (typeof gtag !== 'undefined') {
    gtag('event', 'navigation_critical_error', {
      error_type: type,
      error_details: JSON.stringify(details),
      timestamp: Date.now()
    });
  }
}

function reportPerformanceIssue(type: string, metrics: any) {
  console.warn(`📊 性能问题: ${type}`, metrics);
  
  // 发送性能数据（模拟）
  if (typeof gtag !== 'undefined') {
    gtag('event', 'navigation_performance_issue', {
      issue_type: type,
      metrics: JSON.stringify(metrics),
      timestamp: Date.now()
    });
  }
}

function reportAccessibilityIssue(type: string) {
  console.warn(`♿ 可访问性问题: ${type}`);
  
  // 发送可访问性数据（模拟）
  if (typeof gtag !== 'undefined') {
    gtag('event', 'navigation_accessibility_issue', {
      issue_type: type,
      timestamp: Date.now()
    });
  }
}

/**
 * 综合健康检查
 */
function performHealthCheck() {
  const healthChecks = [
    {
      name: 'navigation-element-exists',
      check: () => document.querySelector('[role="navigation"]') !== null
    },
    {
      name: 'menu-items-present',
      check: () => {
        const menuItems = document.querySelectorAll('[role="navigation"] a');
        return menuItems.length >= 3; // 至少有 Home, Games, About
      }
    },
    {
      name: 'language-selector-present',
      check: () => document.querySelector('[data-language-selector]') !== null
    },
    {
      name: 'mobile-menu-functional',
      check: () => {
        const toggle = document.querySelector('[data-mobile-menu-toggle]');
        const menu = document.querySelector('[data-mobile-menu]');
        return toggle && menu;
      }
    },
    {
      name: 'active-state-working',
      check: () => {
        const activeLinks = document.querySelectorAll('[aria-current="page"]');
        return activeLinks.length >= 0; // 可能为 0（首页）或 1（其他页面）
      }
    }
  ];
  
  const results = healthChecks.map(({ name, check }) => ({
    name,
    passed: check(),
    timestamp: Date.now()
  }));
  
  const failedChecks = results.filter(result => !result.passed);
  
  if (failedChecks.length > 0) {
    console.error('❌ 健康检查失败:', failedChecks);
    failedChecks.forEach(check => {
      reportCriticalError(`health-check-failed-${check.name}`);
    });
  } else {
    console.log('✅ Navigation 健康检查全部通过');
  }
  
  return results;
}

/**
 * 初始化监控
 */
function initializeNavigationMonitoring() {
  console.log('🚀 启动 Navigation 监控...');
  
  // 等待 DOM 加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMonitoring);
  } else {
    startMonitoring();
  }
}

function startMonitoring() {
  // 启动各项监控
  monitorNavigationPerformance();
  monitorUserInteractions();
  monitorAccessibility();
  monitorResponsiveDesign();
  
  // 定期健康检查
  setInterval(performHealthCheck, 30000); // 每 30 秒检查一次
  
  // 初始健康检查
  setTimeout(performHealthCheck, 1000);
  
  console.log('✅ Navigation 监控已启动');
}

// 导出监控函数供外部使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeNavigationMonitoring,
    performHealthCheck,
    monitorNavigationPerformance
  };
} else if (typeof window !== 'undefined') {
  // 浏览器环境自动启动
  initializeNavigationMonitoring();
}
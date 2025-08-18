/**
 * URL测试配置 - 定义13种URL类型的测试用例
 * 基于项目实际结构，专注检测语言内容不匹配问题
 */

const baseUrl = 'http://localhost:4321';

/**
 * 13种URL类型的完整测试配置
 */
export const urlTestCases = [
  // 1. 主页 (/)
  {
    type: 'homepage',
    urls: {
      en: '/',
      zh: '/zh/'
    },
    expectedContent: {
      en: {
        title: 'Free Browser Games',
        h1: /free.*games/i,
        language: 'en'
      },
      zh: {
        title: '免费浏览器游戏',
        h1: /免费.*游戏/,
        language: 'zh'
      }
    }
  },

  // 2. 游戏列表页 (/games/, /zh/games/)
  {
    type: 'games-list',
    urls: {
      en: '/games/',
      zh: '/zh/games/'
    },
    expectedContent: {
      en: {
        title: /games/i,
        h1: /games/i,
        language: 'en',
        gameCount: 'should-have-games'
      },
      zh: {
        title: /游戏/,
        h1: /游戏/,
        language: 'zh',
        gameCount: 'should-have-games'
      }
    }
  },

  // 3. 游戏详情页 - 英文游戏 (/snake-game/)
  {
    type: 'game-detail-en',
    urls: {
      en: '/snake-game/',
      zh: '/zh/snake-game/'
    },
    expectedContent: {
      en: {
        title: /snake/i,
        language: 'en',
        content: /snake|play|game/i
      },
      zh: {
        title: /贪吃蛇|蛇/,
        language: 'zh',
        content: /游戏|玩|蛇/
      }
    }
  },

  // 4. 游戏详情页 - 中文游戏 (可能有翻译版本)
  {
    type: 'game-detail-zh',
    urls: {
      en: '/puzzle-game/',
      zh: '/zh/puzzle-game/'
    },
    expectedContent: {
      en: {
        title: /puzzle/i,
        language: 'en',
        content: /puzzle|solve|brain/i
      },
      zh: {
        title: /拼图|益智/,
        language: 'zh',
        content: /拼图|解谜|益智/
      }
    }
  },

  // 5. 分页游戏列表 (/games/page/2/, /zh/games/page/2/)
  {
    type: 'games-pagination',
    urls: {
      en: '/games/page/2/',
      zh: '/zh/games/page/2/'
    },
    expectedContent: {
      en: {
        title: /page 2|games/i,
        language: 'en',
        pagination: 'should-exist'
      },
      zh: {
        title: /第2页|游戏/,
        language: 'zh',
        pagination: 'should-exist'
      }
    }
  },

  // 6. 分类页面 (/categories/, /zh/categories/)
  {
    type: 'categories',
    urls: {
      en: '/categories/',
      zh: '/zh/categories/'
    },
    expectedContent: {
      en: {
        title: /categories/i,
        language: 'en',
        content: /category|type/i
      },
      zh: {
        title: /分类|类别/,
        language: 'zh',
        content: /分类|类型/
      }
    }
  },

  // 7. 特定分类 (/categories/action/, /zh/categories/action/)
  {
    type: 'category-detail',
    urls: {
      en: '/categories/action/',
      zh: '/zh/categories/action/'
    },
    expectedContent: {
      en: {
        title: /action/i,
        language: 'en',
        content: /action|fast/i
      },
      zh: {
        title: /动作|行动/,
        language: 'zh',
        content: /动作|快速/
      }
    }
  },

  // 8. 搜索页 (/search/, /zh/search/)
  {
    type: 'search',
    urls: {
      en: '/search/',
      zh: '/zh/search/'
    },
    expectedContent: {
      en: {
        title: /search/i,
        language: 'en',
        searchForm: 'should-exist'
      },
      zh: {
        title: /搜索|查找/,
        language: 'zh',
        searchForm: 'should-exist'
      }
    }
  },

  // 9. 搜索结果 (/search?q=snake, /zh/search?q=snake)
  {
    type: 'search-results',
    urls: {
      en: '/search?q=snake',
      zh: '/zh/search?q=snake'
    },
    expectedContent: {
      en: {
        title: /search.*snake/i,
        language: 'en',
        results: 'should-exist'
      },
      zh: {
        title: /搜索.*snake/,
        language: 'zh',
        results: 'should-exist'
      }
    }
  },

  // 10. 关于页面 (/about/, /zh/about/)
  {
    type: 'about',
    urls: {
      en: '/about/',
      zh: '/zh/about/'
    },
    expectedContent: {
      en: {
        title: /about/i,
        language: 'en',
        content: /about|information/i
      },
      zh: {
        title: /关于|介绍/,
        language: 'zh',
        content: /关于|介绍/
      }
    }
  },

  // 11. 联系页面 (/contact/, /zh/contact/)
  {
    type: 'contact',
    urls: {
      en: '/contact/',
      zh: '/zh/contact/'
    },
    expectedContent: {
      en: {
        title: /contact/i,
        language: 'en',
        form: 'should-exist'
      },
      zh: {
        title: /联系|接触/,
        language: 'zh',
        form: 'should-exist'
      }
    }
  },

  // 12. 隐私政策 (/privacy/, /zh/privacy/)
  {
    type: 'privacy',
    urls: {
      en: '/privacy/',
      zh: '/zh/privacy/'
    },
    expectedContent: {
      en: {
        title: /privacy/i,
        language: 'en',
        content: /privacy|policy/i
      },
      zh: {
        title: /隐私|政策/,
        language: 'zh',
        content: /隐私|政策/
      }
    }
  },

  // 13. 404错误页 (/non-existent-page, /zh/non-existent-page)
  {
    type: '404-error',
    urls: {
      en: '/non-existent-page-test',
      zh: '/zh/non-existent-page-test'
    },
    expectedContent: {
      en: {
        title: /404|not found/i,
        language: 'en',
        statusCode: 404
      },
      zh: {
        title: /404|找不到|未找到/,
        language: 'zh',
        statusCode: 404
      }
    }
  }
];

/**
 * 移动端视口配置
 */
export const mobileViewport = {
  width: 375,
  height: 667,
  isMobile: true,
  hasTouch: true
};

/**
 * 桌面端视口配置
 */
export const desktopViewport = {
  width: 1920,
  height: 1080,
  isMobile: false,
  hasTouch: false
};

/**
 * 测试超时配置
 */
export const testConfig = {
  timeout: 30000, // 30秒
  navigationTimeout: 15000, // 15秒
  baseUrl,
  retryAttempts: 2
};

/**
 * 获取完整URL
 */
export function getFullUrl(path) {
  return `${baseUrl}${path}`;
}

/**
 * 验证是否为有效的测试配置
 */
export function validateTestCase(testCase) {
  const required = ['type', 'urls', 'expectedContent'];
  for (const field of required) {
    if (!testCase[field]) {
      throw new Error(`Missing required field: ${field} in test case: ${testCase.type}`);
    }
  }
  
  if (!testCase.urls.en || !testCase.urls.zh) {
    throw new Error(`Missing en or zh URL in test case: ${testCase.type}`);
  }
  
  if (!testCase.expectedContent.en || !testCase.expectedContent.zh) {
    throw new Error(`Missing en or zh expected content in test case: ${testCase.type}`);
  }
  
  return true;
}

export default {
  urlTestCases,
  mobileViewport,
  desktopViewport,
  testConfig,
  getFullUrl,
  validateTestCase
};
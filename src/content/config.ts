import { z, defineCollection } from 'astro:content';

const gamesCollection = defineCollection({
  type: 'content', 
  
  schema: z.object({
    title: z.string(), // 游戏标题，必须是字符串
    description: z.string(), // 简短描述，用于 SEO meta 标签，必须是字符串
    iframeSrc: z.string().url(), // 游戏 iframe 的 URL，必须是有效的 URL 字符串
    thumbnail: z.string(), // 游戏缩略图的路径，必须是字符串 (例如 /thumbnails/game.jpg)
    tags: z.array(z.string()), // 游戏标签，必须是一个字符串数组
    urlstr: z.string(),
    // 内容语言，用于多语言详情页选择（默认英文）
    locale: z.enum(['en', 'zh', 'ja', 'es', 'fr', 'de', 'ko']).default('en'),
    // Mod 类型（用于 Mod 列表页筛选）
    modType: z.enum(['sprunki', 'incredibox', 'fiddlebops']).optional(),
    // 运营/展示字段：用于侧栏与精选
    featured: z.boolean().optional(),
    sidebarNew: z.number().int().min(1).max(4).optional(),
    sidebarPopular: z.number().int().min(1).max(4).optional(),
    // 使用 .optional() 来定义可选字段
    developer: z.string().optional(), // 开发者名称，可选的字符串
    releaseDate: z.date().optional(), // 发布日期，可选的日期对象
    score: z.string().optional(), 
  }),
});

export const collections = {
  'games': gamesCollection,
};

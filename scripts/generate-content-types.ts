#!/usr/bin/env tsx

/**
 * Content Types Generator Script
 * 自动从Content Collections生成TypeScript类型定义
 */

import { getCollection } from 'astro:content';
import * as fs from 'fs';
import * as path from 'path';

interface GeneratedType {
  name: string;
  definition: string;
  jsdoc?: string;
}

class ContentTypeGenerator {
  private typesDir = 'src/types';
  private outputFile = 'src/types/content.d.ts';

  async generateTypes(): Promise<void> {
    console.log('🔧 Generating content types...');
    
    const types: GeneratedType[] = [];
    
    // 生成UI类型
    await this.generateUITypes(types);
    
    // 生成游戏类型 
    await this.generateGameTypes(types);
    
    // 生成静态数据类型
    await this.generateStaticDataTypes(types);
    
    // 生成内容管理器类型
    this.generateContentManagerTypes(types);
    
    // 写入文件
    await this.writeTypesToFile(types);
    
    console.log(`✅ Generated ${types.length} type definitions in ${this.outputFile}`);
  }

  private async generateUITypes(types: GeneratedType[]): Promise<void> {
    try {
      const uiCollection = await getCollection('i18nUI');
      
      if (uiCollection.length > 0) {
        const sampleUI = uiCollection[0].data;
        const interfaceDefinition = this.generateInterfaceFromObject('UITranslations', sampleUI);
        
        types.push({
          name: 'UITranslations',
          definition: interfaceDefinition,
          jsdoc: '/**\n * UI界面翻译数据类型\n * 从 i18nUI Content Collection 自动生成\n */'
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to generate UI types:', error);
    }
  }

  private async generateGameTypes(types: GeneratedType[]): Promise<void> {
    try {
      const gamesCollection = await getCollection('games');
      
      if (gamesCollection.length > 0) {
        const sampleGame = gamesCollection[0].data;
        const interfaceDefinition = this.generateInterfaceFromObject('GameData', sampleGame);
        
        types.push({
          name: 'GameData',
          definition: interfaceDefinition,
          jsdoc: '/**\n * 游戏数据类型\n * 从 games Content Collection 自动生成\n */'
        });

        // 生成游戏集合条目类型
        types.push({
          name: 'GameEntry',
          definition: `interface GameEntry {
  id: string;
  slug: string;
  data: GameData;
  body: string;
  collection: 'games';
}`,
          jsdoc: '/**\n * 游戏内容集合条目类型\n */'
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to generate game types:', error);
    }
  }

  private async generateStaticDataTypes(types: GeneratedType[]): Promise<void> {
    try {
      const staticCollection = await getCollection('staticData');
      
      if (staticCollection.length > 0) {
        const sampleData = staticCollection[0].data;
        const interfaceDefinition = this.generateInterfaceFromObject('StaticData', sampleData);
        
        types.push({
          name: 'StaticData',
          definition: interfaceDefinition,
          jsdoc: '/**\n * 静态数据类型\n * 从 staticData Content Collection 自动生成\n */'
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to generate static data types:', error);
    }
  }

  private generateContentManagerTypes(types: GeneratedType[]): void {
    // 语言类型
    types.push({
      name: 'SupportedLocale',
      definition: `type SupportedLocale = 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko';`,
      jsdoc: '/**\n * 支持的语言类型\n */'
    });

    // 内容类型枚举
    types.push({
      name: 'ContentType',
      definition: `type ContentType = 'ui' | 'games' | 'static' | 'staticData' | 'i18nUI';`,
      jsdoc: '/**\n * 内容类型枚举\n */'
    });

    // 本地化内容类型
    types.push({
      name: 'LocalizedContent',
      definition: `interface LocalizedContent<T = any> {
  data: T;
  locale: SupportedLocale;
  fallbackUsed?: boolean;
  source: 'collection' | 'static' | 'fallback';
  timestamp?: number;
}`,
      jsdoc: '/**\n * 本地化内容通用类型\n */'
    });

    // 内容验证结果类型
    types.push({
      name: 'ContentValidationResult',
      definition: `interface ContentValidationResult {
  isValid: boolean;
  missingKeys: string[];
  warnings: string[];
  suggestions: string[];
  locale: SupportedLocale;
  contentType: ContentType;
}`,
      jsdoc: '/**\n * 内容验证结果类型\n */'
    });
  }

  private generateInterfaceFromObject(name: string, obj: any, depth: number = 0): string {
    const indent = '  '.repeat(depth);
    const lines: string[] = [`${indent}interface ${name} {`];
    
    for (const [key, value] of Object.entries(obj)) {
      const type = this.inferTypeFromValue(value, depth + 1);
      const optional = this.shouldBeOptional(key, value) ? '?' : '';
      lines.push(`${indent}  ${key}${optional}: ${type};`);
    }
    
    lines.push(`${indent}}`);
    return lines.join('\n');
  }

  private inferTypeFromValue(value: any, depth: number = 0): string {
    if (value === null || value === undefined) {
      return 'any';
    }
    
    if (typeof value === 'string') {
      return 'string';
    }
    
    if (typeof value === 'number') {
      return 'number';
    }
    
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'any[]';
      }
      const itemType = this.inferTypeFromValue(value[0], depth);
      return `${itemType}[]`;
    }
    
    if (typeof value === 'object') {
      // 对于嵌套对象，生成内联类型
      const indent = '  '.repeat(depth);
      const lines: string[] = ['{'];
      
      for (const [key, nestedValue] of Object.entries(value)) {
        const type = this.inferTypeFromValue(nestedValue, depth + 1);
        const optional = this.shouldBeOptional(key, nestedValue) ? '?' : '';
        lines.push(`${indent}  ${key}${optional}: ${type};`);
      }
      
      lines.push(`${indent}}`);
      return lines.join('\n');
    }
    
    return 'any';
  }

  private shouldBeOptional(key: string, value: any): boolean {
    // 某些字段通常是可选的
    const optionalKeys = ['canonical', 'ogImage', 'seo', 'rating', 'breadcrumb'];
    return optionalKeys.includes(key) || value === null || value === undefined;
  }

  private async writeTypesToFile(types: GeneratedType[]): Promise<void> {
    // 确保目录存在
    const dir = path.dirname(this.outputFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 生成文件内容
    const fileHeader = `/**
 * Content Types
 * 
 * 此文件由 scripts/generate-content-types.ts 自动生成
 * 请勿手动编辑，所有更改将被覆盖
 * 
 * 生成时间: ${new Date().toISOString()}
 */

// Astro Content Collections 相关类型
import type { CollectionEntry } from 'astro:content';

`;

    const typeDefinitions = types
      .map(type => {
        const jsdoc = type.jsdoc ? `${type.jsdoc}\n` : '';
        return `${jsdoc}export ${type.definition}`;
      })
      .join('\n\n');

    const utilityTypes = `

// 实用类型
export type ContentKey = keyof {
  ui: UITranslations;
  games: GameEntry[];
  static: StaticData;
};

export type ContentResult<T extends ContentType> = 
  T extends 'ui' ? UITranslations :
  T extends 'games' ? GameEntry[] :
  T extends 'static' ? StaticData :
  any;

// 内容管理器相关类型
export interface ContentCache {
  get<T>(key: string): LocalizedContent<T> | null;
  set<T>(key: string, content: LocalizedContent<T>, ttl?: number): void;
  clear(pattern?: string): void;
  stats(): {
    total: number;
    valid: number;
    expired: number;
    hitRate: number;
  };
}

// 内容适配器接口
export interface ContentAdapter<T = any> {
  readonly name: string;
  readonly supportedTypes: ContentType[];
  load(locale: SupportedLocale, type: ContentType): Promise<T>;
  validate(content: T): ContentValidationResult;
  normalize(content: T): T;
}

// 回退策略接口
export interface FallbackStrategy {
  getFallbackChain(locale: SupportedLocale): SupportedLocale[];
  resolve(locale: SupportedLocale, key: string): Promise<any>;
  exists(locale: SupportedLocale, key: string): Promise<boolean>;
}
`;

    const fileContent = fileHeader + typeDefinitions + utilityTypes;
    
    fs.writeFileSync(this.outputFile, fileContent, 'utf-8');
  }
}

// 主函数
async function main() {
  try {
    const generator = new ContentTypeGenerator();
    await generator.generateTypes();
  } catch (error) {
    console.error('❌ Failed to generate types:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

export { ContentTypeGenerator };
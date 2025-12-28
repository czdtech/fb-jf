import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';

type MdastNode = {
  type: string;
  value?: string;
  children?: MdastNode[];
} & Record<string, unknown>;

export type StructureNode =
  | { type: 'heading'; level: number }
  | { type: 'list-item'; indentBucket: number }
  | { type: 'paragraph' };

function isHtmlComment(raw: string): boolean {
  const t = raw.trim();
  return t.startsWith('<!--') && t.endsWith('-->');
}

export function formatStructureNode(node: StructureNode): string {
  switch (node.type) {
    case 'heading':
      return `heading:h${node.level}`;
    case 'list-item':
      return `list-item:indentBucket=${node.indentBucket}`;
    case 'paragraph':
      return 'paragraph';
  }
}

type WalkContext = {
  listDepth: number;
  inListItem: boolean;
};

function walkToSkeleton(node: MdastNode, ctx: WalkContext, out: StructureNode[]): void {
  switch (node.type) {
    case 'html': {
      const raw = typeof node.value === 'string' ? node.value : '';
      if (isHtmlComment(raw)) return;
      if (!ctx.inListItem) out.push({ type: 'paragraph' });
      return;
    }
    case 'heading': {
      const level = typeof node.depth === 'number' ? node.depth : 0;
      out.push({ type: 'heading', level });
      return;
    }
    case 'paragraph': {
      if (!ctx.inListItem) {
        out.push({ type: 'paragraph' });
      }
      return;
    }
    case 'list': {
      const children = Array.isArray(node.children) ? node.children : [];
      for (const child of children) {
        if (child.type !== 'listItem') continue;
        walkToSkeleton(child, { ...ctx, inListItem: true }, out);
      }
      return;
    }
    case 'listItem': {
      // Treat list items as atomic: count the item itself, but do not
      // count paragraphs inside it (formatting variance across locales).
      out.push({ type: 'list-item', indentBucket: ctx.listDepth });

      // Still walk nested lists to keep depth information.
      const children = Array.isArray(node.children) ? node.children : [];
      for (const child of children) {
        if (child.type !== 'list') continue;
        walkToSkeleton(child, { listDepth: ctx.listDepth + 1, inListItem: false }, out);
      }
      return;
    }
    default: {
      // Unknown node: walk children (if any) to avoid silently dropping structure.
      if (node.type === 'code' || node.type === 'blockquote' || node.type === 'table' || node.type === 'thematicBreak') {
        if (!ctx.inListItem) out.push({ type: 'paragraph' });
        return;
      }
      const children = Array.isArray(node.children) ? node.children : [];
      for (const child of children) {
        walkToSkeleton(child, ctx, out);
      }
    }
  }
}

export function extractStructureSkeleton(markdown: string): StructureNode[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as MdastNode;
  const out: StructureNode[] = [];
  const children = Array.isArray(tree.children) ? tree.children : [];
  for (const child of children) {
    walkToSkeleton(child, { listDepth: 0, inListItem: false }, out);
  }
  return out;
}

export function nodesMatch(a: StructureNode, b: StructureNode): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'heading' && b.type === 'heading') return a.level === b.level;
  if (a.type === 'list-item' && b.type === 'list-item') return a.indentBucket === b.indentBucket;
  return true;
}

/**
 * Check that the canonical structure appears as an ordered subsequence
 * inside the localized structure. Localized content may contain extra
 * nodes, but cannot miss any canonical node.
 */
export function localizedContainsCanonicalStructure(canonical: StructureNode[], localized: StructureNode[]): boolean {
  let i = 0;
  let j = 0;

  while (i < canonical.length && j < localized.length) {
    if (nodesMatch(canonical[i], localized[j])) {
      i++;
      j++;
    } else {
      j++;
    }
  }

  return i === canonical.length;
}

export function firstMissingCanonicalNode(
  canonical: StructureNode[],
  localized: StructureNode[]
): { index: number; node: StructureNode } | null {
  let i = 0;
  let j = 0;

  while (i < canonical.length && j < localized.length) {
    if (nodesMatch(canonical[i], localized[j])) {
      i++;
      j++;
    } else {
      j++;
    }
  }

  if (i < canonical.length) {
    return { index: i, node: canonical[i] };
  }
  return null;
}

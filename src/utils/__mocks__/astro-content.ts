import { jest } from '@jest/globals';

export const getCollection = jest.fn(() => Promise.resolve([]));

export interface CollectionEntry<T extends string> {
  id: string;
  slug: string;
  body: string;
  collection: T;
  data: any;
  render: () => Promise<{ Content: () => any }>;
}
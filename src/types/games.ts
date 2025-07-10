export interface Game {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  iframe: string;
  category: string;
  meta: {
    title: string;
    description: string;
    canonical: string;
    ogImage: string;
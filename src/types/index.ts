export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' |
  'XS (Kids)' | 'S (Kids)' | 'M (Kids)' | 'L (Kids)' | 'XL (Kids)' | '2XL (Kids)' |
  '2T' | '3T' | '4T' | '5T';

export type AgeGroup = 'adults' | 'kids' | 'toddlers';

export type Theme = 'casual' | 'graphic' | 'sports' | 'vintage' | 'limited';

export interface ProductImage {
  color: string;
  url: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  images: ProductImage[];
  styles: Theme[];
  themes: string[];
  colors: string[];
  ageGroup: AgeGroup;
  sizes: Size[];
  createdAt: string;
  canPersonalize?: boolean;
}

export interface FilterState {
  styles: Theme[];
  theme: string;
  color: string;
  ageGroups: AgeGroup[];
  searchQuery: string;
  sortBy: string;
}

export interface CartItem {
  productId: string;
  title: string;
  image: string;
  price: number;
  quantity: number;
  color: string;
  size: string;
  id?: string;
  personalizationText?: string;
}
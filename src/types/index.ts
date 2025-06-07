export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' |
  'XS (Kids)' | 'S (Kids)' | 'M (Kids)' | 'L (Kids)' | 'XL (Kids)' | '2XL (Kids)' |
  '2T' | '3T' | '4T' | '5T';

export type Color = 'white' | 'black' | 'sport-grey' | 'ice-grey' | 'dark-heather-grey' |
  'dark-chocolate' | 'maroon' | 'tropical-blue' | 'sand' | 'mint-green' |
  'sage' | 'military-green' | 'forest-green' | 'light-blue' | 'navy' |
  'light-pink' | 'antique-heliconia' | 'heather-orange' | 'coral-silk';

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
  availableAgeGroups?: AgeGroup[]; // Age groups available from variants
  sizes: Size[];
  createdAt: string;
  canPersonalize?: boolean;
  category?: string; // Added category field
}

export interface ProductCategoryObject {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
}

export type ProductCategory = string; // This is the slug of the category

export interface FilterState {
  styles: Theme[];
  theme: string;
  color: string;
  ageGroups: AgeGroup[];
  categories: ProductCategory[];
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
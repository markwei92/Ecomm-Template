import { Product } from '../types';

export const products: Product[] = [
  {
    id: '1',
    title: 'Classic Cotton Crew',
    description: 'Premium cotton t-shirt with a comfortable fit',
    price: 24.99,
    images: [
      {
        color: 'white',
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800'
      },
      {
        color: 'black',
        url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800'
      },
      {
        color: 'navy',
        url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=80&w=800'
      },
      {
        color: 'gray',
        url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=800'
      }
    ],
    styles: ['casual', 'vintage'],
    themes: ['daily-life', 'common-phrases'],
    colors: ['white', 'black', 'navy', 'gray'],
    ageGroup: 'adults',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    createdAt: '2024-03-01'
  },
  {
    id: '2',
    title: 'Kids Superhero Graphic Tee',
    description: 'Fun superhero design for young adventurers',
    price: 19.99,
    images: [
      {
        color: 'red',
        url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=800'
      }
    ],
    styles: ['graphic', 'casual'],
    themes: ['graphic-only', 'hobby'],
    colors: ['red', 'blue', 'yellow'],
    ageGroup: 'kids',
    sizes: ['XS (Kids)', 'S (Kids)', 'M (Kids)', 'L (Kids)', 'XL (Kids)', '2XL (Kids)'],
    createdAt: '2024-03-02'
  },
  {
    id: '3',
    title: 'Toddler Basic Tee',
    description: 'Soft and comfortable t-shirt for toddlers',
    price: 14.99,
    images: [
      {
        color: 'white',
        url: 'https://images.unsplash.com/photo-1519278409-1f56fdda7485?auto=format&fit=crop&q=80&w=800'
      }
    ],
    styles: ['casual'],
    themes: ['daily-life'],
    colors: ['white', 'pink', 'blue', 'yellow'],
    ageGroup: 'toddlers',
    sizes: ['2T', '3T', '4T', '5T'],
    createdAt: '2024-03-03'
  },
  {
    id: '4',
    title: 'Abstract Design Tee',
    description: 'Modern abstract art printed on premium cotton',
    price: 34.99,
    images: [
      {
        color: 'white',
        url: 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?auto=format&fit=crop&q=80&w=800'
      },
      {
        color: 'black',
        url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=800'
      }
    ],
    styles: ['graphic', 'limited'],
    themes: ['graphic-only', 'personality'],
    colors: ['white', 'black'],
    ageGroup: 'adults',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    createdAt: '2024-03-04'
  },
  {
    id: '5',
    title: 'Nature Inspired Collection',
    description: 'Eco-friendly tees with nature-inspired designs',
    price: 29.99,
    images: [
      {
        color: 'green',
        url: 'https://images.unsplash.com/photo-1503342250614-aabb357e6582?auto=format&fit=crop&q=80&w=800'
      },
      {
        color: 'blue',
        url: 'https://images.unsplash.com/photo-1503342452485-86b7f7f0a5b2?auto=format&fit=crop&q=80&w=800'
      }
    ],
    styles: ['graphic', 'casual'],
    themes: ['hobby', 'personality'],
    colors: ['green', 'blue'],
    ageGroup: 'adults',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL'],
    createdAt: '2024-03-05'
  }
];
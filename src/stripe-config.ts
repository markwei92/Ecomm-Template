import { Product } from './types';

export const products: Product[] = [
  {
    id: 'prod_SEMKVvX5EHb5vS',
    priceId: 'price_1RJtcFD3jaZLGJYszU8hZ880',
    title: 'Funny Kawaii Leaf Graphic Tee',
    description: 'A funny leaf graphic tee featuring an unhappy leaf with arms crossed and the "leaf me alone" quote. This softstyle unisex t-shirt is made from durable and smooth fabric, perfect for printing. It gives off a playful and laid-back vibe, ideal for those who enjoy quirky and humorous designs. Perfect for casual wear or as a fun gift for the nature lover in your life.',
    price: 23.99,
    mode: 'payment',
    images: [
      {
        color: 'white',
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800'
      },
      {
        color: 'black',
        url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=800'
      }
    ],
    styles: ['casual', 'graphic'],
    themes: ['daily-life', 'common-phrases'],
    colors: ['white', 'black'],
    ageGroup: 'adults',
    sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'],
    createdAt: '2024-03-01'
  }
];
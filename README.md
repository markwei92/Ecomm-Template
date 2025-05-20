# FunnyJokeTees E-commerce Platform

A modern e-commerce platform built with React, TypeScript, and Supabase, featuring a full-featured shopping experience with Stripe integration for payments.

## Features

- 🛍️ Product catalog with filtering and search
- 🛒 Shopping cart functionality
- 💳 Secure checkout with Stripe
- 👤 User authentication and account management
- 📦 Order tracking
- 🎫 Coupon management
- 📱 Responsive design
- 🔒 Role-based access control
- 📧 Contact form
- 🎨 Theme customization

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- A Supabase account
- A Stripe account

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/funnyjoketees.git
cd funnyjoketees
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Supabase Setup

1. Create a new Supabase project
2. Click the "Connect to Supabase" button in the project
3. Run the database migrations:
   - All migrations are in the `supabase/migrations` directory
   - They will be automatically applied when connecting to Supabase

## Stripe Setup

1. Create a Stripe account
2. Get your publishable key and add it to the `.env` file
3. Set up webhook endpoints in your Stripe dashboard:
   - Endpoint: `your_supabase_url/functions/v1/stripe-webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`

## Deployment

### Frontend

1. Build the project:
```bash
npm run build
```

2. Deploy to your preferred hosting platform (e.g., Netlify):
```bash
netlify deploy --prod
```

### Supabase Edge Functions

Edge functions are automatically deployed when connected to Supabase. No additional steps required.

## Project Structure

```
├── src/
│   ├── components/      # Reusable React components
│   ├── context/        # React context providers
│   ├── lib/            # Utility functions and API clients
│   ├── pages/          # Page components
│   ├── types/          # TypeScript type definitions
│   └── data/           # Static data and constants
├── supabase/
│   ├── functions/      # Supabase Edge Functions
│   └── migrations/     # Database migrations
└── public/            # Static assets
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
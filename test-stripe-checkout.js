// This is a simple script to test the Stripe checkout function
// Run it with: node test-stripe-checkout.js

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const ACCESS_TOKEN = 'your-access-token'; // Replace with a valid access token

async function testStripeCheckout() {
  try {
    const apiUrl = `${SUPABASE_URL}/functions/v1/stripe-checkout`;
    console.log('Testing Stripe checkout API at:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        items: [
          {
            price: 10.99,
            quantity: 1,
            title: 'Test Product'
          }
        ],
        success_url: 'http://localhost:5173/checkout/success',
        cancel_url: 'http://localhost:5173/checkout/cancel'
      })
    });

    const responseText = await response.text();
    console.log('Raw response:', responseText);

    try {
      const data = JSON.parse(responseText);
      console.log('Parsed response:', data);
      console.log('Session ID:', data.sessionId);
      console.log('Client Secret:', data.clientSecret);
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  } catch (error) {
    console.error('Error testing Stripe checkout:', error);
  }
}

testStripeCheckout();

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail } from 'lucide-react';
import { FooterSettings, fetchFooterSettings } from '../services/siteSettingsService';
import { supabase } from '../lib/supabase';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [settings, setSettings] = useState<FooterSettings>({
    copyright_text: '© {year} FunnyJokeTees.',
    brand_text: 'An OpenStore Brand.',
    payment_providers: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFooterSettings = async () => {
      try {
        setIsLoading(true);
        const footerSettings = await fetchFooterSettings();
        setSettings(footerSettings);
      } catch (error) {
        console.error('Error loading footer settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFooterSettings();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubscriptionError('');
    setSubscriptionSuccess(false);

    try {
      console.log('Attempting to subscribe email:', email);

      // First, create the table if it doesn't exist
      try {
        await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE TABLE IF NOT EXISTS public.mailing_list (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              email TEXT UNIQUE NOT NULL,
              created_at TIMESTAMPTZ DEFAULT now(),
              updated_at TIMESTAMPTZ DEFAULT now(),
              viewed BOOLEAN DEFAULT FALSE
            );
            ALTER TABLE public.mailing_list DISABLE ROW LEVEL SECURITY;
          `
        });
      } catch (tableError) {
        console.error('Error creating table:', tableError);
        // Continue anyway, as the table might already exist
      }

      // Insert the email directly
      const { data, error } = await supabase
        .from('mailing_list')
        .insert([{ email }]);

      if (error) {
        if (error.code === '23505') { // Unique violation
          console.log('Email already subscribed:', email);
          setSubscriptionError('This email is already subscribed.');
        } else {
          console.error('Error subscribing to mailing list:', error);
          setSubscriptionError(`Failed to subscribe: ${error.message}`);
        }
        return;
      }

      // Success
      console.log('Successfully subscribed email:', email);
      setSubscriptionSuccess(true);
      setEmail('');

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubscriptionSuccess(false);
      }, 5000);
    } catch (error: any) {
      console.error('Exception subscribing to mailing list:', error);
      setSubscriptionError(`An unexpected error occurred: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-themed pt-12 pb-6">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Customer Care Section */}
          <div>
            <h3 className="text-lg font-bold mb-4">Customer Care</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/shipping" className="hover:opacity-80">
                  Shipping & Delivery
                </Link>
              </li>
              <li>
                <Link to="/returns" className="hover:opacity-80">
                  Returns & Exchanges
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:opacity-80">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links Section */}
          <div>
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/help" className="hover:opacity-80">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="hover:opacity-80">
                  Track My Order
                </Link>
              </li>
              <li>
                <Link to="/return" className="hover:opacity-80">
                  Start a Return
                </Link>
              </li>
              <li>
                <Link to="/reviews" className="hover:opacity-80">
                  Reviews
                </Link>
              </li>
            </ul>
          </div>

          {/* About Us Section */}
          <div>
            <h3 className="text-lg font-bold mb-4">About Us</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="hover:opacity-80">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:opacity-80">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/media" className="hover:opacity-80">
                  Media Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Subscribe Section */}
          <div>
            <h3 className="text-lg font-bold mb-4">Subscribe</h3>
            <p className="mb-4">
              Sign up for free discounts and giveaways!
            </p>
            <form onSubmit={handleSubmit} className="mb-4">
              <div className="flex flex-col space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="submit"
                  className="footer-button px-4 py-2 rounded hover:opacity-90 transition-colors uppercase text-sm font-medium flex justify-center items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Sign Up'
                  )}
                </button>
              </div>
              {subscriptionError && (
                <p className="mt-2 text-sm text-red-600">{subscriptionError}</p>
              )}
              {subscriptionSuccess && (
                <p className="mt-2 text-sm text-green-600">Thank you for subscribing!</p>
              )}
            </form>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section with Copyright and Payment Methods */}
        <div className="mt-12 pt-6 border-t footer-divider">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <p className="text-sm">
                {settings.copyright_text.replace('{year}', currentYear.toString())} {settings.brand_text}
              </p>
            </div>
            <div className="flex space-x-2">
              {/* Payment Method Icons */}
              {settings.payment_providers
                .filter(provider => provider.enabled)
                .map(provider => (
                  <a
                    key={provider.id}
                    href={provider.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={provider.name}
                  >
                    <img
                      src={provider.image_url}
                      alt={provider.name}
                      className="h-6"
                    />
                  </a>
                ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

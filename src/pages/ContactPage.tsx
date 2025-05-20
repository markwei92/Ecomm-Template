import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      // First, ensure the viewed column exists
      try {
        const { error: alterError } = await supabase.rpc('execute_sql', {
          sql_query: "ALTER TABLE IF EXISTS public.inquiries ADD COLUMN IF NOT EXISTS viewed BOOLEAN DEFAULT FALSE"
        });

        if (alterError) {
          console.warn('Error ensuring viewed column exists:', alterError);
        } else {
          console.log('Ensured viewed column exists in inquiries table');
        }
      } catch (columnError) {
        console.warn('Error ensuring viewed column exists:', columnError);
      }

      // Insert the inquiry with viewed=false
      const { data, error } = await supabase
        .from('inquiries')
        .insert({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          status: 'pending',
          viewed: false
        })
        .select();

      if (error) throw error;

      console.log('Inquiry submitted successfully:', data);

      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });

      toast.success('Your message has been sent successfully!');
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Contact Us</h1>
            <p className="text-gray-600 italic mb-8">*We will respond within 1-2 working days</p>

            {submitSuccess ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                <h3 className="text-lg font-medium text-green-800">Thank you for your message!</h3>
                <p className="mt-2 text-green-700">We've received your inquiry and will get back to you as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  >
                    <option value="">Select a subject</option>
                    <option value="order">Order Inquiry</option>
                    <option value="product">Product Question</option>
                    <option value="returns">Returns & Exchanges</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                    placeholder="How can we help you?"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`
                    flex items-center justify-center w-full px-6 py-3
                    bg-black text-white rounded-md font-medium
                    transition-all duration-200
                    ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-800'}
                  `}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      Submit Inquiry
                      <Send className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* About Us */}
          <div>
            <h2 className="text-2xl font-bold text-black mb-6">About Us</h2>
            <div className="prose prose-lg text-gray-700 space-y-4">
              <p>
                Welcome to FunnyJokeTees – where fashion meets humor, and every tee tells a story!
              </p>
              <p>
                We believe that clothing should do more than just cover you up—it should make a statement, spark a laugh, and maybe even inspire a double-take. That's why we create bold, witty, and ridiculously funny graphic tees that let your personality shine.
              </p>
              <p>
                Our designs range from hilarious one-liners and quirky puns to unexpected mashups and relatable jokes that'll have your friends asking, "Where did you get that?" Whether you're looking to roast your bestie, drop some sarcasm, or spread positive vibes, we've got the perfect tee for every mood and occasion.
              </p>
              <p>
                At FunnyJokeTees, we're all about quality and comfort, so our tees are soft, durable, and made to last—because a good joke never goes out of style. Plus, we're always cooking up fresh designs, so you'll never run out of ways to express yourself.
              </p>
              <p className="font-medium">
                So, go ahead—wear the joke, own the laugh, and let your wardrobe do the talking!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
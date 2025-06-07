import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "How long does shipping take?",
    answer: "Standard shipping typically takes 3-7 business days within the United States. Express shipping options are available for 1-2 business day delivery. International shipping may take 7-14 business days depending on your location."
  },
  {
    question: "What is your return policy?",
    answer: "We offer a 30-day return policy for all unworn items in their original condition with tags attached. Returns are free for defective items, while customer returns may be subject to a small restocking fee. Please contact our customer service team to initiate a return."
  },
  {
    question: "How do I track my order?",
    answer: "Once your order ships, you'll receive a tracking number via email. You can use this number to track your package on our website or directly with the shipping carrier. If you have an account, you can also view your order status in your dashboard."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, American Express, Discover), PayPal, Apple Pay, Google Pay, and Shop Pay. All payments are processed securely through Stripe."
  },
  {
    question: "Can I cancel or modify my order?",
    answer: "Orders can be cancelled or modified within 1 hour of placement. After this time, orders are processed for fulfillment and cannot be changed. Please contact customer service immediately if you need to make changes."
  },
  {
    question: "Do you offer international shipping?",
    answer: "Yes, we ship to most countries worldwide. International shipping costs and delivery times vary by destination. Customers are responsible for any customs duties or taxes that may apply."
  },
  {
    question: "What sizes do you offer?",
    answer: "We offer a full range of sizes from XS to 3XL for adults, and sizes 2T to Youth XL for kids and toddlers. Please refer to our size chart for specific measurements to ensure the best fit."
  },
  {
    question: "How do I care for my t-shirts?",
    answer: "For best results, wash your t-shirts in cold water with like colors, tumble dry on low heat, and avoid bleach. Turn shirts inside out before washing to protect the design. Iron on low heat if needed, avoiding direct contact with printed areas."
  },
  {
    question: "Can I personalize my t-shirt?",
    answer: "Yes! Many of our t-shirts offer personalization options. Look for the personalization toggle on product pages. You can add custom text up to 1000 characters. Personalized items may take an additional 1-2 business days to process."
  },
  {
    question: "Do you offer bulk or wholesale pricing?",
    answer: "We offer special pricing for bulk orders of 20+ items. Please contact our customer service team with your requirements for a custom quote. Wholesale accounts are available for qualified retailers."
  },
  {
    question: "How can I contact customer service?",
    answer: "You can reach our customer service team through our contact form, email us directly, or use the live chat feature on our website. We typically respond within 24 hours during business days."
  },
  {
    question: "Are your t-shirts eco-friendly?",
    answer: "We're committed to sustainability and offer eco-friendly options made from organic cotton and recycled materials. Look for the eco-friendly badge on product pages. We're continuously working to reduce our environmental impact."
  }
];

const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleContactNavigation = () => {
    navigate('/contact');
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find answers to common questions about our products, shipping, returns, and more.
            If you can't find what you're looking for, feel free to contact our customer service team.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md">
          {faqData.map((item, index) => (
            <div key={index} className="border-b border-gray-200 last:border-b-0">
              <button
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                onClick={() => toggleItem(index)}
              >
                <h3 className="text-lg font-medium text-gray-900 pr-4">
                  {item.question}
                </h3>
                {openItems.includes(index) ? (
                  <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              {openItems.includes(index) && (
                <div className="px-6 pb-4">
                  <p className="text-gray-700 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Still have questions?
            </h2>
            <p className="text-gray-600 mb-6">
              Our customer service team is here to help you with any questions or concerns.
            </p>
            <button
              onClick={handleContactNavigation}
              className="inline-flex items-center px-6 py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Contact Us
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FAQ;

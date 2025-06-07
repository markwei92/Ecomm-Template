import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchActiveCarouselSlides, CarouselSlide, clearSupabaseCache } from '../services/carouselService';
import { getHomepageData, HomepageSectionWithProducts } from '../services/homepageSectionService';

// Featured products data
const featuredProducts = {
  trending: [
    {
      id: '101',
      title: 'Classic White Tee',
      price: 24.99,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400',
      category: 'casual'
    },
    {
      id: '102',
      title: 'Black Essential',
      price: 29.99,
      image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=400',
      category: 'casual'
    },
    {
      id: '103',
      title: 'Vintage Logo Tee',
      price: 34.99,
      image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=400',
      category: 'vintage'
    },
    {
      id: '104',
      title: 'Summer Vibes',
      price: 27.99,
      image: 'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?auto=format&fit=crop&q=80&w=400',
      category: 'casual'
    }
  ],
  graphic: [
    {
      id: '201',
      title: 'Mountain Explorer',
      price: 32.99,
      image: 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?auto=format&fit=crop&q=80&w=400',
      category: 'graphic'
    },
    {
      id: '202',
      title: 'Urban Art Tee',
      price: 36.99,
      image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=400',
      category: 'graphic'
    },
    {
      id: '203',
      title: 'Abstract Design',
      price: 34.99,
      image: 'https://images.unsplash.com/photo-1503342452485-86b7f7f0a5b2?auto=format&fit=crop&q=80&w=400',
      category: 'graphic'
    },
    {
      id: '204',
      title: 'Nature Inspired',
      price: 29.99,
      image: 'https://images.unsplash.com/photo-1503342250614-aabb357e6582?auto=format&fit=crop&q=80&w=400',
      category: 'graphic'
    }
  ],
  limited: [
    {
      id: '301',
      title: 'Artist Collab',
      price: 49.99,
      image: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&q=80&w=400',
      category: 'limited'
    },
    {
      id: '302',
      title: 'Special Edition',
      price: 54.99,
      image: 'https://images.unsplash.com/photo-1571945153237-4929e783af4a?auto=format&fit=crop&q=80&w=400',
      category: 'limited'
    },
    {
      id: '303',
      title: 'Collector\'s Item',
      price: 59.99,
      image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&q=80&w=400',
      category: 'limited'
    },
    {
      id: '304',
      title: 'Anniversary Edition',
      price: 44.99,
      image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&q=80&w=400',
      category: 'limited'
    }
  ]
};

export const HomePage: React.FC = () => {
  const [carouselItems, setCarouselItems] = useState<CarouselSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sections, setSections] = useState<HomepageSectionWithProducts[]>([]);
  const [isSectionsLoading, setIsSectionsLoading] = useState(true);

  // Popup banner state
  const [showPopup, setShowPopup] = useState(false);
  const [popupSettings, setPopupSettings] = useState({
    is_enabled: true,
    layout: 'square',
    rounded_edges: true,
    image_url: ''
  });

  // Fetch carousel items from database using the carousel service
  const fetchCarouselItems = async (forceRefresh = false) => {
    try {
      setIsLoading(true);

      // Clear Supabase cache before fetching
      await clearSupabaseCache();

      if (forceRefresh) {
        await supabase.rpc('force_update_homepage');
      }

      // Use the dedicated carousel service with direct SQL
      const slides = await fetchActiveCarouselSlides();
      setCarouselItems(slides);
    } catch (error) {
      // Fallback to empty array if there's an error
      setCarouselItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch homepage sections
  const fetchHomepageSections = async () => {
    try {
      setIsSectionsLoading(true);

      // Clear Supabase cache before fetching
      await clearSupabaseCache();

      // Fetch homepage sections
      const sectionsData = await getHomepageData();
      setSections(sectionsData);
    } catch (error) {
      // Fallback to empty array if there's an error
      setSections([]);
    } finally {
      setIsSectionsLoading(false);
    }
  };

  // Fetch carousel items and sections on component mount
  useEffect(() => {
    fetchCarouselItems();
    fetchHomepageSections();

    // Set up a refresh interval to periodically check for updates
    const refreshInterval = setInterval(() => {
      fetchCarouselItems();
      fetchHomepageSections();
    }, 60000); // Refresh every minute

    // Clean up interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  // Check for popup banner settings and show popup
  useEffect(() => {
    const checkPopupSettings = async () => {
      try {
        // Clear the popup closed state on page load to ensure it appears on refresh
        sessionStorage.removeItem('popupBannerClosed');

        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'popup_banner')
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // No rows returned
            setShowPopup(true);
          }
        } else if (data && data.setting_value) {
          setPopupSettings(data.setting_value);
          if (data.setting_value.is_enabled) {
            setShowPopup(true);
          }
        }
      } catch (error) {
        // Silently handle error
      }
    };

    checkPopupSettings();
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (carouselItems.length === 0) return;

    const interval = setInterval(() => {
      if (!isAnimating) {
        handleNextSlide();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [currentSlide, isAnimating, carouselItems.length]);

  const handlePrevSlide = () => {
    if (isAnimating || carouselItems.length === 0) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev === 0 ? carouselItems.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handleNextSlide = () => {
    if (isAnimating || carouselItems.length === 0) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev === carouselItems.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsAnimating(false), 500);
  };



  return (
    <div>
      {/* Custom Popup Banner Implementation Only */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className={`relative ${popupSettings.layout === 'horizontal' ? 'w-[80%] max-w-4xl h-auto aspect-[16/9]' :
            popupSettings.layout === 'vertical' ? 'w-[90%] max-w-md h-auto aspect-[9/16]' :
              'w-[90%] max-w-xl h-auto aspect-square'
            }`}>
            {/* Close button - positioned outside the banner */}
            <button
              onClick={() => {
                setShowPopup(false);
                sessionStorage.setItem('popupBannerClosed', 'true');
              }}
              className="absolute -top-10 -right-10 p-2 bg-white bg-opacity-80 rounded-full text-black hover:bg-opacity-100 transition-all shadow-md z-50"
              aria-label="Close popup"
            >
              <X size={24} />
            </button>

            <div
              className={`w-full h-full overflow-hidden ${popupSettings.rounded_edges ? 'rounded-lg' : ''} bg-white flex flex-col`}
            >

              {popupSettings.image_url && (
                <div className="w-full h-full relative">
                  <img
                    src={popupSettings.image_url}
                    alt="Banner"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {!popupSettings.image_url && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <p className="text-gray-500">No image selected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Carousel */}
      <div className="relative h-[70vh] overflow-hidden">

        {isLoading ? (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <Loader className="w-10 h-10 animate-spin text-gray-500" />
          </div>
        ) : carouselItems.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-gray-100">
            <p className="text-gray-500">No carousel items found</p>
          </div>
        ) : (
          <>
            <div
              className="flex transition-transform duration-500 ease-in-out h-full"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {carouselItems.map((item) => (
                <div key={item.id} className="min-w-full h-full relative">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className={`absolute inset-0 flex items-center justify-center ${item.show_tint ? 'bg-black bg-opacity-30' : ''}`}>
                    <div className="text-center px-4">
                      <h2
                        className="text-4xl md:text-5xl font-bold mb-2"
                        style={{ color: item.title_color || item.text_color }}
                      >
                        {item.title}
                      </h2>
                      {item.description && (
                        <p
                          className="text-xl md:text-2xl mb-6"
                          style={{ color: item.description_color || item.text_color }}
                        >
                          {item.description}
                        </p>
                      )}
                      <Link
                        to={item.button_link}
                        className="inline-block px-6 py-3 rounded-md font-medium transition-colors duration-200"
                        style={{
                          backgroundColor: item.button_color,
                          color: item.button_color === '#FFFFFF' ? '#000000' : '#FFFFFF'
                        }}
                      >
                        {item.button_text}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel Controls */}
            <button
              onClick={handlePrevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 shadow-md rounded-full p-2.5 transition-all duration-200"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
            <button
              onClick={handleNextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/40 hover:bg-black/60 shadow-md rounded-full p-2.5 transition-all duration-200"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>

            {/* Carousel Indicators */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {carouselItems.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (!isAnimating) {
                      setIsAnimating(true);
                      setCurrentSlide(index);
                      setTimeout(() => setIsAnimating(false), 500);
                    }
                  }}
                  className={`w-3 h-3 rounded-full shadow-md ${currentSlide === index ? 'bg-white' : 'bg-white/60'
                    } transition-colors duration-200 hover:bg-white/90`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Dynamic Product Sections */}
      {isSectionsLoading ? (
        <div className="py-16 px-4 flex justify-center">
          <Loader className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      ) : sections.length === 0 ? (
        // Fallback to static sections if no dynamic sections are found
        <>
          {/* Trending Products */}
          <section className="py-16 px-4 bg-gray-50">
            <div className="w-full">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold">Trending Now</h2>
                <Link
                  to="/products?sortBy=newest"
                  className="text-black hover:underline flex items-center"
                >
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.trending.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="group"
                  >
                    <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                      <div className="h-64 overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-medium text-black">{product.title}</h3>
                        <p className="mt-1 text-black">${product.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        // Render dynamic sections
        <>
          {sections.map((section, index) => (
            <section
              key={section.id}
              className={`py-16 px-4 ${index % 2 === 1 ? 'bg-gray-50' : ''}`}
            >
              <div className="w-full">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold">{section.title}</h2>
                  <Link
                    to={section.link_url}
                    className="text-black hover:underline flex items-center"
                  >
                    {section.link_text}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
                {section.products.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No products found in this section</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {section.products.map((product) => (
                      <Link
                        key={product.id}
                        to={`/products/${product.id}`}
                        className="group"
                      >
                        <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
                          <div className="h-64 overflow-hidden">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-400">No image</span>
                              </div>
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-medium text-black">{product.title}</h3>
                            <p className="mt-1 text-black">${product.price.toFixed(2)}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
};
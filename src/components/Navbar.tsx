import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, ChevronDown, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Product } from '../types';
import { SearchResults } from './SearchResults';
import { AuthDialog } from './AuthDialog';
import { CartDropdown } from './CartDropdown';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchLogoSettings, fetchSiteTitleSettings, fetchThemeColorSettings, ThemeColorSettings } from '../services/siteSettingsService';
import { generateHoverColor } from '../utils/colorUtils';

export const Navbar: React.FC = () => {
  const { state } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isThemesDropdownOpen, setIsThemesDropdownOpen] = useState(false);
  const [isCollectionsDropdownOpen, setIsCollectionsDropdownOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Logo and title settings
  const [logoSettings, setLogoSettings] = useState({
    image_url: '',
    alt_text: 'FunnyJokeTees',
    alignment: 'left'
  });
  const [titleSettings, setTitleSettings] = useState({
    text: 'FunnyJokeTees',
    color: '#000000'
  });
  const [themeColors, setThemeColors] = useState<ThemeColorSettings>({
    navbarBackground: '#FFFFFF',
    navbarText: '#000000',
    bodyBackground: '#FFFFFF',
    footerBackground: '#f8e8e4'
  });
  const [isLogoLoading, setIsLogoLoading] = useState(true);
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  const searchRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLDivElement>(null);
  const themesDropdownRef = useRef<HTMLDivElement>(null);
  const collectionsDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const itemCount = state.items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    setIsCheckingAuth(false);
  }, [user]);

  // Fetch logo, title, and theme settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLogoLoading(true);
        setIsThemeLoading(true);

        // Fetch theme color settings first to minimize flash of default styles
        const colors = await fetchThemeColorSettings();
        setThemeColors(colors);

        // Apply navbar colors to CSS variables
        document.documentElement.style.setProperty('--navbar-bg-color', colors.navbarBackground);
        document.documentElement.style.setProperty('--navbar-text-color', colors.navbarText);

        // Calculate and set hover colors
        // Use the navbar text color for both icon and text hover colors
        const textHoverColor = generateHoverColor(colors.navbarText);
        const iconHoverColor = generateHoverColor(colors.navbarText);

        console.log('Original navbar text color:', colors.navbarText);
        console.log('Generated icon hover color:', iconHoverColor);

        document.documentElement.style.setProperty('--navbar-icon-hover-color', iconHoverColor);
        document.documentElement.style.setProperty('--navbar-text-hover-color', textHoverColor);

        // Set theme loading to false as soon as we have the colors
        setIsThemeLoading(false);

        // Fetch logo settings
        const logo = await fetchLogoSettings();
        setLogoSettings(logo);

        // Fetch title settings
        const title = await fetchSiteTitleSettings();
        setTitleSettings(title);
      } catch (error) {
        console.error('Error fetching site settings:', error);
        setIsThemeLoading(false);
      } finally {
        setIsLogoLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleCartClick = useCallback(() => {
    setIsCartOpen(!isCartOpen);
  }, [isCartOpen]);

  const handleUserIconClick = async () => {
    if (user) {
      // Check if user is an admin
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!sessionError && session) {
          // User has a Supabase session, check if they're an admin
          const { data: adminCheck, error: adminError } = await supabase
            .from('admin_users')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          if (!adminError && adminCheck) {
            // User is an admin, redirect to admin dashboard
            navigate('/admin/products');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }

      // User is not an admin or error occurred, go to regular account page
      navigate('/account');
    } else {
      setIsAuthDialogOpen(true);
    }
  };

  const [themeCategories, setThemeCategories] = useState<{ name: string; href: string }[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);

  // Fetch themes from database
  const fetchThemes = useCallback(async () => {
    try {
      setIsLoadingThemes(true);

      // Fetch themes from the themes table
      const { data, error } = await supabase
        .from('themes')
        .select('name, slug')
        .order('name');

      if (error) throw error;

      // Transform to theme categories and include all age groups
      const categories = data.map(theme => ({
        name: theme.name,
        href: `/products?theme=${theme.slug}`
      }));

      setThemeCategories(categories);
      console.log('Navbar themes updated:', categories);
    } catch (error) {
      console.error('Error fetching themes for navbar:', error);
      // Fallback to default themes if there's an error (without age group parameter)
      setThemeCategories([
        { name: 'Christmas', href: '/products?theme=christmas' },
        { name: 'Common Phrases', href: '/products?theme=common-phrases' },
        { name: 'Daily Life Struggles', href: '/products?theme=daily-life' },
        { name: 'Graphic Only', href: '/products?theme=graphic-only' },
        { name: 'Hobby', href: '/products?theme=hobby' },
        { name: 'Memes', href: '/products?theme=memes' },
        { name: 'Others', href: '/products?theme=others' },
        { name: 'Personality Trait', href: '/products?theme=personality' },
        { name: 'Politics', href: '/products?theme=politics' },
        { name: 'Sports', href: '/products?theme=sports' },
        { name: 'Yoda-Like Quotes', href: '/products?theme=yoda' }
      ]);
    } finally {
      setIsLoadingThemes(false);
    }
  }, []);

  useEffect(() => {
    fetchThemes();

    // Set up real-time subscription for theme changes
    const channel = supabase.channel('navbar-themes');

    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'themes'
        },
        (payload) => {
          console.log('Theme change detected in navbar:', payload);
          // Refresh themes when a change is detected
          fetchThemes();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchThemes]);

  const collectionCategories = [
    { name: "All Collections", href: '/products' },
    { name: "Adults Collection", href: '/products?ageGroup=adults' },
    { name: "Kids Collection", href: '/products?ageGroup=kids' },
    { name: "Toddlers Collection", href: '/products?ageGroup=toddlers' }
  ];

  const handleThemesDropdown = (isOpen: boolean) => {
    setIsThemesDropdownOpen(isOpen);
    if (isOpen) {
      setIsCollectionsDropdownOpen(false);
    }
  };

  const handleCollectionsDropdown = (isOpen: boolean) => {
    setIsCollectionsDropdownOpen(isOpen);
    if (isOpen) {
      setIsThemesDropdownOpen(false);
    }
  };

  // Function to search products from Supabase
  const searchProductsFromSupabase = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          description,
          price,
          themes,
          age_group,
          product_images (
            url,
            color,
            is_primary
          )
        `)
        .ilike('title', `%${query}%`)
        .limit(5);

      if (error) {
        console.error('Error searching products:', error);
        return;
      }

      // Transform the data to match our Product type
      const transformedProducts: Product[] = data.map(product => ({
        id: product.id,
        title: product.title,
        description: product.description || '',
        price: product.price,
        images: product.product_images.map((img: any) => ({
          color: img.color || 'default',
          url: img.url
        })),
        styles: [],
        themes: product.themes || [],
        colors: [],
        ageGroup: product.age_group,
        sizes: [],
        createdAt: ''
      }));

      setSearchResults(transformedProducts);
      setShowResults(true);
    } catch (error) {
      console.error('Error in search:', error);
      setSearchResults([]);
    }
  };

  // Debounce function to prevent too many API calls
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Create a debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      searchProductsFromSupabase(query);
    }, 300),
    []
  );

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (query.trim().length > 0) {
      debouncedSearch(query);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setShowResults(false);
      setSearchQuery('');
    }
  };

  const handleSelectProduct = (product: Product) => {
    setIsSearchOpen(false);
    setShowResults(false);
    setSearchQuery('');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setShowResults(false);
      }
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        setIsCartOpen(false);
      }
      if (themesDropdownRef.current && !themesDropdownRef.current.contains(event.target as Node)) {
        setIsThemesDropdownOpen(false);
      }
      if (collectionsDropdownRef.current && !collectionsDropdownRef.current.contains(event.target as Node)) {
        setIsCollectionsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Track banner visibility
  const [isBannerVisible, setIsBannerVisible] = useState(
    sessionStorage.getItem('bannerClosed') !== 'true'
  );

  // Listen for banner visibility changes
  useEffect(() => {
    const handleBannerChange = () => {
      setIsBannerVisible(sessionStorage.getItem('bannerClosed') !== 'true');
    };

    // Check on mount
    handleBannerChange();

    // Listen for custom event from banner
    window.addEventListener('bannerVisibilityChanged', handleBannerChange);

    return () => {
      window.removeEventListener('bannerVisibilityChanged', handleBannerChange);
    };
  }, []);

  // Create a skeleton loader for the navbar during loading
  if (isThemeLoading) {
    return (
      <header className={`sticky left-0 right-0 z-40 navbar-transition ${isBannerVisible ? 'top-8' : 'top-0'}`}>
        <div className="bg-white border-b border-gray-100">
          <div className="w-full px-4">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-6 w-32 bg-gray-200 animate-pulse rounded ml-2"></div>
              </div>
              <div className="flex space-x-4">
                <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full"></div>
                <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full"></div>
                <div className="h-8 w-8 bg-gray-200 animate-pulse rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`sticky left-0 right-0 z-40 navbar-transition ${isBannerVisible ? 'top-8' : 'top-0'}`}>
      <nav className="navbar-themed border-b border-gray-100">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left Section - Logo */}
            <div className="flex items-center">
              {/* Mobile Menu Button */}
              <button
                className="sm:hidden p-2 rounded-lg mr-2 navbar-icon-button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6 navbar-themed navbar-icon" style={{ color: 'var(--navbar-text-color)' }} />
                ) : (
                  <Menu className="h-6 w-6 navbar-themed navbar-icon" style={{ color: 'var(--navbar-text-color)' }} />
                )}
              </button>

              {/* Logo and Title */}
              <Link to="/" className="flex items-center">
                {isLogoLoading ? (
                  <div className="h-8 w-8 bg-gray-200 animate-pulse rounded"></div>
                ) : logoSettings.image_url ? (
                  <img
                    src={logoSettings.image_url}
                    alt={logoSettings.alt_text}
                    className="h-8 w-auto object-contain"
                    onError={(e) => {
                      // If image fails to load, show default
                      const target = e.target as HTMLImageElement;
                      target.onerror = null; // Prevent infinite loop
                      target.src = "https://raw.githubusercontent.com/stackblitz/stackblitz-icons/main/public/emoji-smile-sunglasses.png";
                    }}
                  />
                ) : (
                  <img
                    src="https://raw.githubusercontent.com/stackblitz/stackblitz-icons/main/public/emoji-smile-sunglasses.png"
                    alt="FunnyJokeTees Logo"
                    className="h-8 w-8"
                  />
                )}
                {isLogoLoading ? (
                  <div className="hidden sm:block h-8 w-32 bg-gray-200 animate-pulse rounded ml-2"></div>
                ) : (
                  <span
                    className="hidden sm:block text-2xl font-bold ml-2"
                    style={{ color: titleSettings.color }}
                  >
                    {titleSettings.text}
                  </span>
                )}
              </Link>
            </div>

            {/* Center Section - Navigation */}
            <div className="hidden sm:flex items-center space-x-6">
              <div
                ref={themesDropdownRef}
                className="relative"
                onMouseEnter={() => handleThemesDropdown(true)}
                onMouseLeave={() => handleThemesDropdown(false)}
              >
                <button
                  onClick={() => handleThemesDropdown(!isThemesDropdownOpen)}
                  className="flex items-center hover:opacity-80 font-medium transition-colors duration-200 navbar-themed"
                  aria-expanded={isThemesDropdownOpen}
                  aria-haspopup="true"
                >
                  Themes
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${isThemesDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className="absolute -bottom-2 left-0 h-2 w-full" />

                <div
                  className={`
                    absolute left-0 top-[calc(100%)] w-56
                    transform origin-top-left transition-all duration-200
                    ${isThemesDropdownOpen
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                    }
                  `}
                >
                  <div className="pt-2">
                    <div className="bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 py-1">
                      {isLoadingThemes ? (
                        <div className="flex justify-center items-center py-4">
                          <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      ) : (
                        themeCategories.map((category) => (
                          <Link
                            key={category.name}
                            to={category.href}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                            onClick={() => handleThemesDropdown(false)}
                          >
                            {category.name}
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div
                ref={collectionsDropdownRef}
                className="relative"
                onMouseEnter={() => handleCollectionsDropdown(true)}
                onMouseLeave={() => handleCollectionsDropdown(false)}
              >
                <button
                  onClick={() => handleCollectionsDropdown(!isCollectionsDropdownOpen)}
                  className="flex items-center hover:opacity-80 font-medium transition-colors duration-200 navbar-themed"
                  aria-expanded={isCollectionsDropdownOpen}
                  aria-haspopup="true"
                >
                  Collections
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${isCollectionsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className="absolute -bottom-2 left-0 h-2 w-full" />

                <div
                  className={`
                    absolute left-0 top-[calc(100%)] w-56
                    transform origin-top-left transition-all duration-200
                    ${isCollectionsDropdownOpen
                      ? 'opacity-100 scale-100 translate-y-0'
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                    }
                  `}
                >
                  <div className="pt-2">
                    <div className="bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 py-1">
                      {collectionCategories.map((category) => (
                        <Link
                          key={category.name}
                          to={category.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          onClick={() => handleCollectionsDropdown(false)}
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>


            </div>

            {/* Right Section - Utility Icons */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div
                ref={searchRef}
                className="relative"
              >
                <button
                  onClick={() => {
                    setIsSearchOpen(!isSearchOpen);
                    if (!isSearchOpen) {
                      setTimeout(() => {
                        if (searchInputRef.current) {
                          searchInputRef.current.focus();
                        }
                      }, 100);
                    }
                  }}
                  className={`p-2 rounded-full transition-colors duration-200 navbar-icon-button ${isSearchOpen ? 'bg-gray-100' : ''
                    }`}
                  aria-label="Search"
                >
                  <Search className="h-5 w-5 navbar-themed navbar-icon" style={{ color: 'var(--navbar-text-color)' }} />
                </button>

                <div className={`
                  absolute right-0 top-full mt-2
                  transform origin-top-right transition-all duration-200
                  ${isSearchOpen
                    ? 'opacity-100 scale-100 translate-y-0'
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }
                `}>
                  <div className="bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 p-2">
                    <form onSubmit={handleSearchSubmit} className="relative w-64">
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className="w-full pl-10 pr-10 py-2 text-sm text-black placeholder-gray-500
                                 border border-gray-300 rounded-md focus:outline-none focus:ring-2
                                 focus:ring-black focus:border-transparent"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </button>
                      )}
                    </form>
                  </div>

                  {showResults && (
                    <SearchResults
                      results={searchResults}
                      searchQuery={searchQuery}
                      onClose={() => {
                        setShowResults(false);
                        setIsSearchOpen(false);
                      }}
                      onSelectProduct={handleSelectProduct}
                    />
                  )}
                </div>
              </div>

              <div ref={cartRef} className="relative">
                <button
                  onClick={handleCartClick}
                  className="relative p-2 rounded-lg transition-colors duration-200 navbar-icon-button"
                >
                  <ShoppingCart className="h-5 w-5 navbar-themed navbar-icon" style={{ color: 'var(--navbar-text-color)' }} />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </button>
                <CartDropdown isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
              </div>

              <button
                onClick={handleUserIconClick}
                disabled={isCheckingAuth}
                className="p-2 rounded-lg transition-colors duration-200 navbar-icon-button"
                aria-label="Account"
              >
                <User
                  className={`h-5 w-5 ${isCheckingAuth ? 'text-gray-400' : 'navbar-themed navbar-icon'}`}
                  style={isCheckingAuth ? {} : { color: 'var(--navbar-text-color)' }}
                />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`
          fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300
          ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Menu Sidebar */}
      <div
        className={`
          fixed top-16 left-0 bottom-0 w-64 bg-white z-50
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}
      >
        {/* Search Section */}
        <div className="p-4 border-b border-gray-200">
          <form onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
              setIsMobileMenuOpen(false);
              setSearchQuery('');
              setSearchResults([]);
            }
          }}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-10 py-2 text-sm text-black placeholder-gray-500
                         border border-gray-300 rounded-md focus:outline-none focus:ring-2
                         focus:ring-black focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </form>

          {/* Mobile search results */}
          {showResults && searchResults.length > 0 && (
            <div className="mt-2 bg-white rounded-lg shadow-sm border border-gray-200">
              <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                {searchResults.map((product) => (
                  <li key={product.id} className="py-2">
                    <Link
                      to={`/products?search=${searchQuery}`}
                      className="flex items-center hover:bg-gray-50 p-2 rounded-md"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                        <img
                          src={product.images[0]?.url || ''}
                          alt={product.title}
                          className="h-full w-full object-cover object-center"
                        />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">{product.title}</p>
                        <p className="text-xs text-gray-500">${product.price.toFixed(2)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                to={`/products?search=${searchQuery}`}
                className="block text-center py-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 border-t border-gray-200"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                View all results
              </Link>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-4 py-6">
            <div className="space-y-8">
              {/* Themes Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Themes
                </h3>
                <div className="space-y-2">
                  {isLoadingThemes ? (
                    <div className="flex justify-center items-center py-4">
                      <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : (
                    themeCategories.map((category) => (
                      <Link
                        key={category.name}
                        to={category.href}
                        className="block text-base text-gray-900 hover:text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors duration-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {category.name}
                      </Link>
                    ))
                  )}
                </div>
              </div>

              {/* Collections Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Collections
                </h3>
                <div className="space-y-2">
                  {collectionCategories.map((category) => (
                    <Link
                      key={category.name}
                      to={category.href}
                      className="block text-base text-gray-900 hover:text-gray-600 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors duration-200"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </div>


            </div>
          </nav>
        </div>
      </div>

      <AuthDialog
        isOpen={isAuthDialogOpen}
        onClose={() => setIsAuthDialogOpen(false)}
      />
    </header>
  );
};
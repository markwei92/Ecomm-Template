import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, ChevronUp, ChevronDown, Upload, X, Save, Loader, RefreshCw, RotateCw, Zap, LayoutGrid, Image, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { HomepageSections } from '../../components/admin/HomepageSections';
import { SiteLogo } from '../../components/admin/SiteLogo';
import { BannerSettings } from '../../components/admin/BannerSettings';
import { PopupBannerSettings } from '../../components/admin/PopupBannerSettings';
import { ThemeColors } from '../../components/admin/ThemeColors';
import { FooterSettings } from '../../components/admin/FooterSettings';
import { ThemesManager } from '../../components/admin/ThemesManager';
import {
  CarouselSlide,
  EditingSlide,
  fetchAllCarouselSlides,
  uploadCarouselImage,
  saveCarouselSlide,
  deleteCarouselSlide,
  clearSupabaseCache
} from '../../services/carouselService';

export const StoreFront: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'carousel' | 'themes' | 'sections' | 'logo' | 'banner' | 'popup' | 'colors' | 'footer'>('carousel');

  // Carousel state
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSlide, setEditingSlide] = useState<EditingSlide | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const isUserAuthenticated = !!data.session;
        setIsAuthenticated(isUserAuthenticated);

        if (!isUserAuthenticated) {
          console.warn('User is not authenticated. Some features may not work.');
          return;
        }

        // Check if user is an admin
        const { data: adminData, error: adminError } = await supabase.rpc('is_admin');

        if (adminError) {
          console.error('Error checking if user is admin:', adminError);
        } else {
          console.log('User is admin:', adminData);
          if (!adminData) {
            console.warn('User is not an admin. Some features may not work.');
            toast.warning('You are logged in but not an admin. Some features may be limited.');
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);

      // Re-check admin status when auth state changes
      if (session) {
        supabase.rpc('is_admin').then(({ data, error }) => {
          if (error) {
            console.error('Error checking if user is admin after auth change:', error);
          } else {
            console.log('User is admin after auth change:', data);
          }
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Force refresh function - clears cache and reloads data
  const forceRefresh = async () => {
    console.log('Force refreshing page...');
    toast.info('Force refreshing carousel data...');

    try {
      // Fetch slides with force refresh
      await fetchSlides(true);
      toast.success('Carousel data refreshed successfully');
    } catch (error: any) {
      console.error('Error during force refresh:', error);
      toast.error(`Error refreshing data: ${error.message}`);

      // As a last resort, reload the page
      if (window.confirm('Could not refresh data. Reload the page?')) {
        window.location.reload();
      }
    }
  };

  // Debug function to check carousel data
  const debugCarouselData = async () => {
    try {
      console.log('Debugging carousel data using direct SQL...');

      // Use direct SQL to fetch all slides
      const { data: result, error } = await supabase.rpc('direct_sql_carousel_operation', {
        operation: 'fetch'
      });

      if (error) {
        console.error('Error fetching carousel data for debugging:', error);
        return;
      }

      if (!result || !result.success) {
        console.error('Error fetching carousel data:', result?.error || 'Unknown error');
        return;
      }

      // Extract the slides from the result
      let slides = [];
      if (Array.isArray(result.data)) {
        slides = result.data;
      } else if (typeof result.data === 'object') {
        slides = Object.values(result.data);
      }

      console.log('Current carousel data in database:');
      slides.forEach((slide: CarouselSlide) => {
        console.log(`Slide ID: ${slide.id}`);
        console.log(`  Title: ${slide.title}`);
        console.log(`  Description: ${slide.description}`);
        console.log(`  Button Text: ${slide.button_text}`);
        console.log(`  Button Link: ${slide.button_link}`);
        console.log(`  Button Color: ${slide.button_color}`);
        console.log(`  Text Color: ${slide.text_color}`);
        console.log(`  Display Order: ${slide.display_order}`);
        console.log(`  Is Active: ${slide.is_active}`);
        console.log(`  Updated At: ${slide.updated_at}`);
        console.log('-----------------------------------');
      });
    } catch (error) {
      console.error('Error in debug function:', error);
    }
  };

  // Fetch carousel slides using the carousel service
  const fetchSlides = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      console.log('Fetching carousel slides using direct SQL...');

      // Clear Supabase cache before fetching
      await clearSupabaseCache();

      if (forceRefresh) {
        // Force a hard refresh by executing a direct SQL query
        console.log('Forcing a hard refresh of carousel data...');

        // Force update homepage to refresh cache
        await supabase.rpc('force_update_homepage');
      }

      // Use the dedicated carousel service with direct SQL
      const data = await fetchAllCarouselSlides();

      console.log('Carousel slides fetched successfully:', data);
      setSlides(data || []);

      // Debug the data after fetching
      await debugCarouselData();
    } catch (error: any) {
      console.error('Failed to load carousel slides:', error);
      toast.error(`Error loading carousel slides: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  // Handle creating a new slide
  const handleCreateSlide = () => {
    if (slides.length >= 6) {
      toast.warning('Maximum of 6 carousel slides allowed');
      return;
    }

    setEditingSlide({
      title: '',
      description: '',
      image_url: '',
      button_text: 'Shop Now',
      button_link: '/products',
      button_color: '#FFFFFF',
      text_color: '#FFFFFF',
      title_color: '#FFFFFF',
      description_color: '#FFFFFF',
      show_tint: true,
      display_order: slides.length,
      is_active: true,
      imageFile: null
    });
    setIsEditing(true);
  };

  // Handle editing an existing slide
  const handleEditSlide = (slide: CarouselSlide) => {
    setEditingSlide({
      ...slide,
      imageFile: null
    });
    setIsEditing(true);
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (editingSlide) {
        setEditingSlide({
          ...editingSlide,
          imageFile: file,
          image_url: URL.createObjectURL(file)
        });
      }
    }
  };

  // Upload image to Supabase storage using the carousel service
  const uploadImage = async (file: File): Promise<string> => {
    return uploadCarouselImage(file);
  };

  // Save slide changes using the carousel service
  const handleSaveSlide = async () => {
    if (!editingSlide) return;
    if (!editingSlide.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!editingSlide.image_url && !editingSlide.imageFile) {
      toast.error('Image is required');
      return;
    }
    if (!editingSlide.button_link.trim()) {
      toast.error('Button link is required');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Saving slide using carousel service:', editingSlide);
      let imageUrl = editingSlide.image_url;

      // Upload new image if selected
      if (editingSlide.imageFile) {
        console.log('Uploading new image...');
        try {
          imageUrl = await uploadImage(editingSlide.imageFile);
          console.log('Image uploaded successfully:', imageUrl);
        } catch (uploadError: any) {
          console.error('Error uploading image:', uploadError);
          toast.error(`Error uploading image: ${uploadError.message}`);
          setIsSaving(false);
          return;
        }
      }

      // Prepare slide data with the updated image URL
      const slideToSave: EditingSlide = {
        ...editingSlide,
        image_url: imageUrl
      };

      console.log('Saving slide data:', slideToSave);

      // Use the carousel service to save the slide
      console.log('Calling saveCarouselSlide with:', slideToSave);
      const savedSlide = await saveCarouselSlide(slideToSave);
      console.log('Slide saved successfully, returned data:', savedSlide);

      // Show success message
      const actionType = editingSlide.id ? 'updated' : 'created';
      toast.success(`Slide ${actionType} successfully`);

      // Verify the changes were saved by fetching the latest data with a force refresh
      await fetchSlides(true);

      setIsEditing(false);
      setEditingSlide(null);
    } catch (error: any) {
      console.error('Error saving slide:', error);
      toast.error(`Error saving slide: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle slide deletion
  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      console.log(`Deleting slide with ID: ${deleteId} using carousel service`);

      // Use the carousel service to delete the slide
      await deleteCarouselSlide(deleteId);

      console.log('Slide deleted successfully');
      toast.success('Slide deleted successfully');

      // Verify the deletion by fetching the latest data with a force refresh
      await fetchSlides(true);
    } catch (error: any) {
      console.error('Error during slide deletion:', error);
      toast.error(`Error deleting slide: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Handle reordering slides
  const handleMoveSlide = async (id: string, direction: 'up' | 'down') => {
    console.log(`Moving slide ${id} ${direction}`);

    const currentIndex = slides.findIndex(slide => slide.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === slides.length - 1)
    ) {
      console.log('Cannot move slide further in this direction');
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newSlides = [...slides];

    // Store the original slides before swapping
    const slideA = { ...newSlides[currentIndex] };
    const slideB = { ...newSlides[newIndex] };

    // Swap display orders only
    const tempOrder = slideA.display_order;
    slideA.display_order = slideB.display_order;
    slideB.display_order = tempOrder;

    // Update the slides array
    newSlides[currentIndex] = slideB;
    newSlides[newIndex] = slideA;

    console.log(`Swapping slide at index ${currentIndex} with slide at index ${newIndex}`);

    // Update both affected slides with ALL their fields
    try {
      const timestamp = new Date().toISOString();

      // Update first slide using carousel service
      console.log(`Updating slide ${slideA.id} with new display_order ${slideA.display_order}`);
      const savedSlideA = await saveCarouselSlide(slideA);
      console.log(`First slide ${slideA.id} updated successfully:`, savedSlideA);

      // Update second slide using carousel service
      console.log(`Updating slide ${slideB.id} with new display_order ${slideB.display_order}`);
      const savedSlideB = await saveCarouselSlide(slideB);
      console.log(`Second slide ${slideB.id} updated successfully:`, savedSlideB);

      // Verify the changes by fetching the latest data with a force refresh
      await fetchSlides(true);
      toast.success('Slide order updated successfully');
    } catch (error: any) {
      console.error('Error reordering slides:', error);
      toast.error(`Error reordering slides: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {isAuthenticated === false && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center justify-between">
          <div>
            <strong className="font-bold">Authentication Error!</strong>
            <span className="block sm:inline ml-2">You are not logged in. Please log in to manage storefront content.</span>
          </div>
          <button
            onClick={() => {
              // Redirect to login page
              window.location.href = '/login';
            }}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Log In
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold">Storefront Management</h1>
          <button
            onClick={() => {
              window.open('/', '_blank');
            }}
            className="ml-4 flex items-center px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 text-sm"
          >
            <span>View Storefront</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('carousel')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'carousel'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Homepage Carousel
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'themes'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Themes
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'sections'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Product Sections
          </button>
          <button
            onClick={() => setActiveTab('logo')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'logo'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <Image className="w-4 h-4 mr-1" />
            Logo & Title
          </button>
          <button
            onClick={() => setActiveTab('banner')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'banner'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <span className="w-4 h-4 mr-1 flex items-center justify-center text-xs">📢</span>
            Announcement Banner
          </button>
          <button
            onClick={() => setActiveTab('popup')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'popup'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <MessageSquare className="w-4 h-4 mr-1" />
            Popup Banner
          </button>
          <button
            onClick={() => setActiveTab('colors')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'colors'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <span className="w-4 h-4 mr-1 flex items-center justify-center text-xs">🎨</span>
            Theme Colors
          </button>
          <button
            onClick={() => setActiveTab('footer')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${activeTab === 'footer'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <span className="w-4 h-4 mr-1 flex items-center justify-center text-xs">👣</span>
            Footer
          </button>
        </nav>
      </div>

      {/* Carousel Tab Content */}
      {activeTab === 'carousel' && (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold">Homepage Carousel</h2>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleCreateSlide}
                disabled={slides.length >= 6 || isAuthenticated === false}
                className={`flex items-center px-4 py-2 rounded-md ${slides.length >= 6 || isAuthenticated === false
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
                  }`}
                title={isAuthenticated === false ? 'You must be logged in to add slides' : slides.length >= 6 ? 'Maximum number of slides reached' : 'Add a new slide'}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Slide
              </button>
            </div>
          </div>
        </>
      )}

      {/* Themes Tab Content */}
      {activeTab === 'themes' && (
        <ThemesManager isAuthenticated={isAuthenticated} />
      )}

      {/* Sections Tab Content */}
      {activeTab === 'sections' && (
        <HomepageSections isAuthenticated={isAuthenticated} />
      )}

      {/* Logo Tab Content */}
      {activeTab === 'logo' && (
        <SiteLogo isAuthenticated={isAuthenticated} />
      )}

      {/* Banner Tab Content */}
      {activeTab === 'banner' && (
        <BannerSettings isAuthenticated={isAuthenticated} />
      )}

      {/* Popup Banner Tab Content */}
      {activeTab === 'popup' && (
        <PopupBannerSettings isAuthenticated={isAuthenticated} />
      )}

      {/* Theme Colors Tab Content */}
      {activeTab === 'colors' && (
        <ThemeColors isAuthenticated={isAuthenticated} />
      )}

      {/* Footer Settings Tab Content */}
      {activeTab === 'footer' && (
        <FooterSettings isAuthenticated={isAuthenticated} />
      )}

      {/* Carousel Tab Content (continued) */}
      {activeTab === 'carousel' && (isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      ) : slides.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No carousel slides found</p>
          <button
            onClick={handleCreateSlide}
            className="bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Create First Slide
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Button
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {slides.map((slide) => (
                <tr key={slide.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-16 w-24 rounded overflow-hidden">
                      <img
                        src={slide.image_url}
                        alt={slide.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{slide.title}</div>
                    <div className="text-sm text-gray-500">{slide.description}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{slide.button_text}</div>
                    <div className="text-sm text-gray-500">{slide.button_link}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${slide.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                      {slide.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <button
                        onClick={() => handleMoveSlide(slide.id, 'up')}
                        disabled={slide.display_order === 0}
                        className={`p-1 ${slide.display_order === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <span className="mx-2">{slide.display_order + 1}</span>
                      <button
                        onClick={() => handleMoveSlide(slide.id, 'down')}
                        disabled={slide.display_order === slides.length - 1}
                        className={`p-1 ${slide.display_order === slides.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700'
                          }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditSlide(slide)}
                      className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(slide.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Edit Slide Modal */}
      {isEditing && editingSlide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingSlide.id ? 'Edit Slide' : 'Create New Slide'}
              </h2>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingSlide(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingSlide.title}
                    onChange={(e) => setEditingSlide({ ...editingSlide, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Slide Title"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingSlide.description || ''}
                    onChange={(e) => setEditingSlide({ ...editingSlide, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Slide Description"
                    rows={3}
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={editingSlide.button_text}
                    onChange={(e) => setEditingSlide({ ...editingSlide, button_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Button Text"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Link
                  </label>
                  <input
                    type="text"
                    value={editingSlide.button_link}
                    onChange={(e) => setEditingSlide({ ...editingSlide, button_link: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="/products"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Button Color
                    </label>
                    <div className="flex items-center">
                      <input
                        type="color"
                        value={editingSlide.button_color}
                        onChange={(e) => setEditingSlide({ ...editingSlide, button_color: e.target.value })}
                        className="w-10 h-10 border border-gray-300 rounded-md mr-2"
                      />
                      <input
                        type="text"
                        value={editingSlide.button_color}
                        onChange={(e) => setEditingSlide({ ...editingSlide, button_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      General Text Color
                    </label>
                    <div className="flex items-center">
                      <input
                        type="color"
                        value={editingSlide.text_color}
                        onChange={(e) => setEditingSlide({ ...editingSlide, text_color: e.target.value })}
                        className="w-10 h-10 border border-gray-300 rounded-md mr-2"
                      />
                      <input
                        type="text"
                        value={editingSlide.text_color}
                        onChange={(e) => setEditingSlide({ ...editingSlide, text_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title Color
                    </label>
                    <div className="flex items-center">
                      <input
                        type="color"
                        value={editingSlide.title_color || '#FFFFFF'}
                        onChange={(e) => setEditingSlide({ ...editingSlide, title_color: e.target.value })}
                        className="w-10 h-10 border border-gray-300 rounded-md mr-2"
                      />
                      <input
                        type="text"
                        value={editingSlide.title_color || '#FFFFFF'}
                        onChange={(e) => setEditingSlide({ ...editingSlide, title_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description Color
                    </label>
                    <div className="flex items-center">
                      <input
                        type="color"
                        value={editingSlide.description_color || '#FFFFFF'}
                        onChange={(e) => setEditingSlide({ ...editingSlide, description_color: e.target.value })}
                        className="w-10 h-10 border border-gray-300 rounded-md mr-2"
                      />
                      <input
                        type="text"
                        value={editingSlide.description_color || '#FFFFFF'}
                        onChange={(e) => setEditingSlide({ ...editingSlide, description_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-4 flex space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingSlide.is_active}
                      onChange={(e) => setEditingSlide({ ...editingSlide, is_active: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingSlide.show_tint}
                      onChange={(e) => setEditingSlide({ ...editingSlide, show_tint: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Background Tint</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slide Image
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    {editingSlide.image_url ? (
                      <div className="space-y-1 text-center">
                        <div className="relative">
                          <img
                            src={editingSlide.image_url}
                            alt="Preview"
                            className="max-h-48 mx-auto"
                          />
                          <button
                            onClick={() => setEditingSlide({ ...editingSlide, image_url: '', imageFile: null })}
                            className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex justify-center mt-4">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Change Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center">
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                          aria-hidden="true"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Image
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                  <div className="bg-gray-800 rounded-lg overflow-hidden">
                    <div className="relative h-48">
                      {editingSlide.image_url ? (
                        <img
                          src={editingSlide.image_url}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                          <p className="text-gray-500">No image selected</p>
                        </div>
                      )}
                      <div className={`absolute inset-0 flex items-center justify-center ${editingSlide.show_tint ? 'bg-black bg-opacity-30' : ''}`}>
                        <div className="text-center px-4">
                          <h2 className="text-xl font-bold mb-1" style={{ color: editingSlide.title_color || editingSlide.text_color }}>
                            {editingSlide.title || 'Slide Title'}
                          </h2>
                          {editingSlide.description && (
                            <p className="text-sm mb-3" style={{ color: editingSlide.description_color || editingSlide.text_color }}>
                              {editingSlide.description}
                            </p>
                          )}
                          <button
                            className="px-4 py-1 rounded text-sm font-medium"
                            style={{
                              backgroundColor: editingSlide.button_color,
                              color: editingSlide.button_color === '#FFFFFF' ? '#000000' : '#FFFFFF'
                            }}
                          >
                            {editingSlide.button_text || 'Shop Now'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingSlide(null);
                }}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSlide}
                disabled={isSaving}
                className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 flex items-center"
              >
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleting}
        title="Delete Slide"
        message="Are you sure you want to delete this slide? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleting(false);
          setDeleteId(null);
        }}
        type="danger"
      />
    </div>
  );
};

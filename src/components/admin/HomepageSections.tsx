import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, ChevronUp, ChevronDown, Save, Loader, X, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { ConfirmationDialog } from '../ConfirmationDialog';
import {
  HomepageSection,
  EditingSection,
  SectionProduct,
  fetchAllSections,
  saveSection,
  deleteSection,
  fetchSectionProducts,
  addProductToSection,
  removeProductFromSection,
  updateProductOrder
} from '../../services/homepageSectionService';
import { supabase } from '../../lib/supabase';

interface HomepageSectionsProps {
  isAuthenticated: boolean | null;
}

export const HomepageSections: React.FC<HomepageSectionsProps> = ({ isAuthenticated }) => {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<EditingSection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [sectionProducts, setSectionProducts] = useState<SectionProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Fetch all sections
  const fetchSections = async () => {
    try {
      setIsLoading(true);
      const data = await fetchAllSections();
      setSections(data);
      
      // If there are sections and none is selected, select the first one
      if (data.length > 0 && !selectedSectionId) {
        setSelectedSectionId(data[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load sections:', error);
      toast.error(`Error loading sections: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch products for the selected section
  const fetchProducts = async (sectionId: string) => {
    if (!sectionId) return;
    
    try {
      setIsLoadingProducts(true);
      const products = await fetchSectionProducts(sectionId);
      setSectionProducts(products);
    } catch (error: any) {
      console.error(`Failed to load products for section ${sectionId}:`, error);
      toast.error(`Error loading section products: ${error.message}`);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Fetch available products
  const fetchAvailableProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, title, price, description, product_images(url)')
        .order('title');
      
      if (error) throw error;
      
      // Format the products
      const formattedProducts = data.map(product => ({
        id: product.id,
        title: product.title,
        price: product.price,
        description: product.description,
        image_url: product.product_images?.[0]?.url || ''
      }));
      
      setAvailableProducts(formattedProducts);
    } catch (error: any) {
      console.error('Failed to load available products:', error);
      toast.error(`Error loading products: ${error.message}`);
    }
  };

  // Initial data loading
  useEffect(() => {
    fetchSections();
    fetchAvailableProducts();
  }, []);

  // Load products when a section is selected
  useEffect(() => {
    if (selectedSectionId) {
      fetchProducts(selectedSectionId);
    }
  }, [selectedSectionId]);

  // Handle creating a new section
  const handleCreateSection = () => {
    setEditingSection({
      title: '',
      link_text: 'View All',
      link_url: '/products',
      display_order: sections.length,
      is_active: true
    });
    setIsEditing(true);
  };

  // Handle editing an existing section
  const handleEditSection = (section: HomepageSection) => {
    setEditingSection({ ...section });
    setIsEditing(true);
  };

  // Save section changes
  const handleSaveSection = async () => {
    if (!editingSection) return;
    if (!editingSection.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!editingSection.link_url.trim()) {
      toast.error('Link URL is required');
      return;
    }

    try {
      setIsSaving(true);
      const savedSection = await saveSection(editingSection);
      
      // Show success message
      const actionType = editingSection.id ? 'updated' : 'created';
      toast.success(`Section ${actionType} successfully`);
      
      // Refresh the sections list
      await fetchSections();
      
      // If this was a new section, select it
      if (!editingSection.id) {
        setSelectedSectionId(savedSection.id);
      }
      
      setIsEditing(false);
      setEditingSection(null);
    } catch (error: any) {
      console.error('Error saving section:', error);
      toast.error(`Error saving section: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle section deletion
  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleting(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteSection(deleteId);
      toast.success('Section deleted successfully');
      
      // Refresh the sections list
      await fetchSections();
      
      // If the deleted section was selected, clear the selection
      if (selectedSectionId === deleteId) {
        setSelectedSectionId(null);
        setSectionProducts([]);
      }
    } catch (error: any) {
      console.error('Error during section deletion:', error);
      toast.error(`Error deleting section: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Handle reordering sections
  const handleMoveSection = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex(section => section.id === id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sections.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newSections = [...sections];

    // Store the original sections before swapping
    const sectionA = { ...newSections[currentIndex] };
    const sectionB = { ...newSections[newIndex] };

    // Swap display orders
    const tempOrder = sectionA.display_order;
    sectionA.display_order = sectionB.display_order;
    sectionB.display_order = tempOrder;

    try {
      // Update both sections
      await saveSection(sectionA);
      await saveSection(sectionB);
      
      // Refresh the sections list
      await fetchSections();
      
      toast.success('Section order updated successfully');
    } catch (error: any) {
      console.error('Error reordering sections:', error);
      toast.error(`Error reordering sections: ${error.message}`);
    }
  };

  // Handle adding a product to the section
  const handleAddProduct = async () => {
    if (!selectedSectionId || !selectedProductId) {
      toast.error('Please select a product to add');
      return;
    }

    try {
      await addProductToSection(selectedSectionId, selectedProductId);
      toast.success('Product added to section successfully');
      
      // Refresh the products list
      await fetchProducts(selectedSectionId);
      
      // Reset the product selection
      setSelectedProductId('');
      setIsAddingProduct(false);
    } catch (error: any) {
      console.error('Error adding product to section:', error);
      toast.error(`Error adding product: ${error.message}`);
    }
  };

  // Handle removing a product from the section
  const handleRemoveProduct = async (productId: string) => {
    if (!selectedSectionId) return;

    try {
      await removeProductFromSection(selectedSectionId, productId);
      toast.success('Product removed from section successfully');
      
      // Refresh the products list
      await fetchProducts(selectedSectionId);
    } catch (error: any) {
      console.error('Error removing product from section:', error);
      toast.error(`Error removing product: ${error.message}`);
    }
  };

  // Handle reordering products
  const handleMoveProduct = async (productId: string, direction: 'up' | 'down') => {
    if (!selectedSectionId) return;
    
    const currentIndex = sectionProducts.findIndex(product => product.id === productId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === sectionProducts.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newOrder = direction === 'up' 
      ? sectionProducts[newIndex].display_order
      : sectionProducts[newIndex].display_order;

    try {
      await updateProductOrder(selectedSectionId, productId, newOrder);
      
      // Refresh the products list
      await fetchProducts(selectedSectionId);
      
      toast.success('Product order updated successfully');
    } catch (error: any) {
      console.error('Error reordering products:', error);
      toast.error(`Error reordering products: ${error.message}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-6">Homepage Sections</h2>
      
      {isAuthenticated === false ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>You must be logged in to manage homepage sections.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sections List */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Sections</h3>
              <button
                onClick={handleCreateSection}
                disabled={isAuthenticated === false}
                className={`flex items-center px-3 py-1 rounded-md ${
                  isAuthenticated === false
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Section
              </button>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : sections.length === 0 ? (
              <div className="text-center py-8 bg-gray-100 rounded-lg">
                <p className="text-gray-500 mb-2">No sections found</p>
                <button
                  onClick={handleCreateSection}
                  className="bg-black text-white px-3 py-1 rounded-md hover:bg-gray-800"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Create First Section
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {sections.map((section) => (
                  <li
                    key={section.id}
                    className={`p-3 rounded-md cursor-pointer transition-colors ${
                      selectedSectionId === section.id
                        ? 'bg-blue-100 border-l-4 border-blue-500'
                        : 'bg-white hover:bg-gray-100 border-l-4 border-transparent'
                    }`}
                    onClick={() => setSelectedSectionId(section.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{section.title}</h4>
                        <p className="text-sm text-gray-500">{section.link_url}</p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSection(section.id, 'up');
                          }}
                          disabled={sections.indexOf(section) === 0}
                          className={`p-1 ${
                            sections.indexOf(section) === 0
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSection(section.id, 'down');
                          }}
                          disabled={sections.indexOf(section) === sections.length - 1}
                          className={`p-1 ${
                            sections.indexOf(section) === sections.length - 1
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditSection(section);
                          }}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(section.id);
                          }}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          section.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {section.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Section Products */}
          <div className="md:col-span-2 bg-gray-50 p-4 rounded-lg">
            {selectedSectionId ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    {sections.find(s => s.id === selectedSectionId)?.title} Products
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => fetchProducts(selectedSectionId)}
                      className="p-1 rounded-full hover:bg-gray-200"
                      title="Refresh products"
                    >
                      <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoadingProducts ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => setIsAddingProduct(true)}
                      disabled={isAuthenticated === false}
                      className={`flex items-center px-3 py-1 rounded-md ${
                        isAuthenticated === false
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-black text-white hover:bg-gray-800'
                      }`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Product
                    </button>
                  </div>
                </div>
                
                {isLoadingProducts ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader className="w-6 h-6 animate-spin text-gray-500" />
                  </div>
                ) : sectionProducts.length === 0 ? (
                  <div className="text-center py-8 bg-gray-100 rounded-lg">
                    <p className="text-gray-500 mb-2">No products in this section</p>
                    <button
                      onClick={() => setIsAddingProduct(true)}
                      className="bg-black text-white px-3 py-1 rounded-md hover:bg-gray-800"
                    >
                      <Plus className="w-4 h-4 inline mr-1" />
                      Add First Product
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sectionProducts.map((product) => (
                      <div
                        key={product.id}
                        className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200 flex"
                      >
                        <div className="w-24 h-24 flex-shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No image</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 p-3">
                          <div className="flex justify-between">
                            <h4 className="font-medium text-sm">{product.title}</h4>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => handleMoveProduct(product.id, 'up')}
                                disabled={sectionProducts.indexOf(product) === 0}
                                className={`p-1 ${
                                  sectionProducts.indexOf(product) === 0
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleMoveProduct(product.id, 'down')}
                                disabled={sectionProducts.indexOf(product) === sectionProducts.length - 1}
                                className={`p-1 ${
                                  sectionProducts.indexOf(product) === sectionProducts.length - 1
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                <ChevronDown className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleRemoveProduct(product.id)}
                                className="p-1 text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-500 mt-1 truncate">{product.description}</p>
                          <p className="text-sm font-semibold mt-1">${product.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-500 mb-4">Select a section to manage its products</p>
                {sections.length === 0 && (
                  <button
                    onClick={handleCreateSection}
                    className="bg-black text-white px-3 py-1 rounded-md hover:bg-gray-800"
                  >
                    <Plus className="w-4 h-4 inline mr-1" />
                    Create First Section
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Edit Section Modal */}
      {isEditing && editingSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingSection.id ? 'Edit Section' : 'Create New Section'}
              </h2>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingSection(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingSection.title}
                  onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Section Title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  value={editingSection.link_text}
                  onChange={(e) => setEditingSection({ ...editingSection, link_text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="View All"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link URL
                </label>
                <input
                  type="text"
                  value={editingSection.link_url}
                  onChange={(e) => setEditingSection({ ...editingSection, link_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="/products"
                />
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingSection.is_active}
                    onChange={(e) => setEditingSection({ ...editingSection, is_active: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingSection(null);
                }}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSection}
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
      
      {/* Add Product Modal */}
      {isAddingProduct && selectedSectionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add Product to Section</h2>
              <button
                onClick={() => {
                  setIsAddingProduct(false);
                  setSelectedProductId('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Product
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select a product --</option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title} - ${product.price.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setIsAddingProduct(false);
                  setSelectedProductId('');
                }}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={!selectedProductId}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center ${
                  !selectedProductId
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleting}
        title="Delete Section"
        message="Are you sure you want to delete this section? This action cannot be undone."
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

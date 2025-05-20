import React, { useState, useEffect } from 'react';
import { Search, Mail, CheckCircle, Clock, RotateCcw, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { useAdminNotifications } from '../../context/AdminNotificationsContext';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved';
  created_at: string;
  viewed?: boolean;
}

export const InquiriesList: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedInquiryId, setExpandedInquiryId] = useState<string | null>(null);
  const [inquiryToDelete, setInquiryToDelete] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const { markInquiriesAsViewed, markInquiryAsViewed } = useAdminNotifications();

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      // Fetch all inquiries with their viewed status
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Make sure we preserve the viewed status
      // This ensures highlights don't disappear when switching tabs
      setInquiries(data);

      // Don't mark inquiries as viewed automatically
      // Let the user click on each item to mark it as viewed
    } catch (error) {
      console.error('Error fetching inquiries:', error);
      toast.error('Failed to load inquiries');
    } finally {
      setIsLoading(false);
    }
  };

  const updateInquiryStatus = async (id: string, status: 'pending' | 'in_progress' | 'resolved') => {
    try {
      const { error } = await supabase
        .from('inquiries')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setInquiries(inquiries.map(inquiry =>
        inquiry.id === id ? { ...inquiry, status } : inquiry
      ));

      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating inquiry status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDeleteClick = (id: string) => {
    setInquiryToDelete(id);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!inquiryToDelete) return;

    try {
      const { error } = await supabase
        .from('inquiries')
        .delete()
        .eq('id', inquiryToDelete);

      if (error) throw error;

      setInquiries(inquiries.filter(inquiry => inquiry.id !== inquiryToDelete));
      toast.success('Inquiry deleted successfully');
    } catch (error) {
      console.error('Error deleting inquiry:', error);
      toast.error('Failed to delete inquiry');
    } finally {
      setShowDeleteConfirmation(false);
      setInquiryToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setInquiryToDelete(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedInquiryId(expandedInquiryId === id ? null : id);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'in_progress':
        return <RotateCcw className="w-5 h-5 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  const filteredInquiries = inquiries.filter(inquiry => {
    const matchesSearch =
      inquiry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inquiry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inquiry.subject.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inquiry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-3xl font-bold text-gray-900">User Inquiries</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage and respond to user inquiries from the contact form
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="search"
            placeholder="Search inquiries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-40 pl-3 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
        >
          <option value="all">All Status</option>
          <option value="pending" className="text-yellow-600">Pending</option>
          <option value="in_progress" className="text-blue-600">In Progress</option>
          <option value="resolved" className="text-green-600">Resolved</option>
        </select>
      </div>

      {/* Inquiries List */}
      <div className="mt-8 flex flex-col">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-1/5">
                      Contact
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-2/5">
                      Subject
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/5">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/10">
                      Date
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 w-1/10">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-sm text-gray-500 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredInquiries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-sm text-gray-500 text-center">
                        No inquiries found
                      </td>
                    </tr>
                  ) : (
                    filteredInquiries.map((inquiry) => (
                      <React.Fragment key={inquiry.id}>
                        <tr
                          className={`cursor-pointer ${inquiry.viewed === false ? 'new-item-highlight' : 'hover:bg-gray-50'}`}
                          onClick={() => {
                            toggleExpand(inquiry.id);

                            // If this is a new inquiry, mark it as viewed when clicked
                            if (inquiry.viewed === false) {
                              // Update the inquiry in the local state
                              setInquiries(inquiries.map(i =>
                                i.id === inquiry.id ? { ...i, viewed: true } : i
                              ));

                              // Update the inquiry in the database and notification count
                              markInquiryAsViewed(inquiry.id);
                            }
                          }}
                        >
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                            <div>
                              <div className="font-medium text-gray-900">{inquiry.name}</div>
                              <div className="text-gray-500">{inquiry.email}</div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500">
                            <div className="flex items-center justify-between">
                              <div className="w-full pr-2 overflow-hidden">
                                <div className="font-medium text-gray-900">{inquiry.subject}</div>
                                {expandedInquiryId !== inquiry.id && (
                                  <div className="text-gray-500 truncate max-w-[200px] md:max-w-[300px] lg:max-w-[400px]">
                                    {inquiry.message}
                                  </div>
                                )}
                              </div>
                              <div className="flex-shrink-0 ml-1">
                                {expandedInquiryId === inquiry.id ?
                                  <ChevronUp className="h-5 w-5 text-gray-400" /> :
                                  <ChevronDown className="h-5 w-5 text-gray-400" />
                                }
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <select
                              value={inquiry.status}
                              onChange={(e) => {
                                e.stopPropagation(); // Prevent row expansion when changing status
                                updateInquiryStatus(inquiry.id, e.target.value as 'pending' | 'in_progress' | 'resolved');
                              }}
                              className={`block w-full pl-3 pr-10 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black min-w-[120px] ${inquiry.status === 'pending' ? 'text-yellow-600' :
                                inquiry.status === 'in_progress' ? 'text-blue-600' :
                                  'text-green-600'
                                }`}
                              onClick={(e) => e.stopPropagation()} // Prevent row expansion when clicking the select
                            >
                              <option value="pending" className="text-yellow-600">Pending</option>
                              <option value="in_progress" className="text-blue-600">In Progress</option>
                              <option value="resolved" className="text-green-600">Resolved</option>
                            </select>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(inquiry.created_at).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row expansion when clicking delete
                                handleDeleteClick(inquiry.id);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                        {expandedInquiryId === inquiry.id && (
                          <tr className="bg-gray-50">
                            <td colSpan={5} className="px-6 py-4 text-sm text-gray-500">
                              <div className="border-t border-gray-200 pt-4">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Message:</h4>
                                <p className="whitespace-pre-wrap">{inquiry.message}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Delete Inquiry"
        message="Are you sure you want to delete this inquiry? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        type="danger"
      />
    </div>
  );
};
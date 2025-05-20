import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, RefreshCw, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Subscriber {
  id: string;
  email: string;
  created_at: string;
  viewed: boolean;
}

export const MailingList: React.FC = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch subscribers
  const fetchSubscribers = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('mailing_list')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      setSubscribers(data || []);
      setFilteredSubscribers(data || []);
      
      // Mark all as viewed
      await supabase.rpc('mark_mailing_list_viewed');
    } catch (error: any) {
      console.error('Error fetching subscribers:', error);
      toast.error(`Error loading subscribers: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchSubscribers();
  }, []);

  // Filter subscribers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSubscribers(subscribers);
      return;
    }
    
    const filtered = subscribers.filter(subscriber => 
      subscriber.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setFilteredSubscribers(filtered);
  }, [searchQuery, subscribers]);

  // Handle select all checkbox
  useEffect(() => {
    if (selectAll) {
      setSelectedSubscribers(filteredSubscribers.map(s => s.id));
    } else if (selectedSubscribers.length === filteredSubscribers.length) {
      // If all are selected but selectAll is false, deselect all
      setSelectedSubscribers([]);
    }
  }, [selectAll, filteredSubscribers]);

  // Handle individual selection
  const toggleSubscriberSelection = (id: string) => {
    if (selectedSubscribers.includes(id)) {
      setSelectedSubscribers(selectedSubscribers.filter(s => s !== id));
    } else {
      setSelectedSubscribers([...selectedSubscribers, id]);
    }
  };

  // Export selected subscribers to CSV
  const exportSelectedToCSV = () => {
    if (selectedSubscribers.length === 0) {
      toast.info('Please select at least one subscriber to export');
      return;
    }
    
    setIsExporting(true);
    
    try {
      const selectedData = subscribers.filter(s => selectedSubscribers.includes(s.id));
      const csvContent = [
        ['Email', 'Subscription Date'],
        ...selectedData.map(s => [
          s.email,
          format(new Date(s.created_at), 'yyyy-MM-dd HH:mm:ss')
        ])
      ]
        .map(row => row.join(','))
        .join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `mailing-list-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${selectedData.length} subscribers`);
    } catch (error: any) {
      console.error('Error exporting subscribers:', error);
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Delete selected subscribers
  const deleteSelected = async () => {
    if (selectedSubscribers.length === 0) {
      toast.info('Please select at least one subscriber to delete');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${selectedSubscribers.length} subscribers? This action cannot be undone.`)) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('mailing_list')
        .delete()
        .in('id', selectedSubscribers);
      
      if (error) {
        throw error;
      }
      
      toast.success(`Deleted ${selectedSubscribers.length} subscribers`);
      setSelectedSubscribers([]);
      setSelectAll(false);
      fetchSubscribers();
    } catch (error: any) {
      console.error('Error deleting subscribers:', error);
      toast.error(`Delete failed: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mailing List</h1>
        <div className="flex space-x-2">
          <button
            onClick={fetchSubscribers}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 flex items-center"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportSelectedToCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            disabled={isExporting || selectedSubscribers.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Selected
          </button>
          <button
            onClick={deleteSelected}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
            disabled={isDeleting || selectedSubscribers.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Selected
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <div className="ml-4 text-sm text-gray-600">
              {selectedSubscribers.length > 0 ? (
                <span>{selectedSubscribers.length} selected</span>
              ) : (
                <span>{filteredSubscribers.length} subscribers</span>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={() => setSelectAll(!selectAll)}
                      className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                    />
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    {searchQuery ? 'No subscribers match your search' : 'No subscribers found'}
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSubscribers.includes(subscriber.id)}
                        onChange={() => toggleSubscriberSelection(subscriber.id)}
                        className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{subscriber.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {format(new Date(subscriber.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subscriber.viewed ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          <Check className="h-4 w-4 mr-1" /> Viewed
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          <X className="h-4 w-4 mr-1" /> New
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

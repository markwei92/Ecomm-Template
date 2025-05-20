import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const ReviewDebug: React.FC = () => {
  const [directReviews, setDirectReviews] = useState<any[]>([]);
  const [serviceReviews, setServiceReviews] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [directLoading, setDirectLoading] = useState(false);
  const [productLoading, setProductLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState<string>('');
  const [reviewId, setReviewId] = useState<string>('');
  const [singleReview, setSingleReview] = useState<any | null>(null);

  // Reset loading states when component mounts
  useEffect(() => {
    setIsLoading(false);
    setColumnsLoading(false);
    setTablesLoading(false);
    setDirectLoading(false);
    setProductLoading(false);
    setReviewLoading(false);
  }, []);

  const fetchTables = async () => {
    try {
      setTablesLoading(true);
      setError(null);

      console.log('Fetching database tables');

      // Query to get all tables in the public schema
      const { data, error } = await supabase
        .rpc('get_tables');

      if (error) {
        console.error('Error fetching tables:', error);
        setError(`Tables error: ${error.message}`);

        // Try a direct query as fallback
        try {
          // This is a simplified approach - in a real app, you'd need proper permissions
          const { data: tablesData, error: tablesError } = await supabase
            .from('pg_tables')
            .select('tablename')
            .eq('schemaname', 'public');

          if (tablesError) {
            console.error('Error in fallback tables query:', tablesError);
          } else {
            console.log('Tables from fallback query:', tablesData);
            setTables(tablesData || []);
          }
        } catch (err) {
          console.error('Error in fallback tables check:', err);
        }

        return;
      }

      console.log('Tables data:', data);
      setTables(data || []);
    } catch (err: any) {
      console.error('Exception in fetchTables:', err);
      setError(`Tables exception: ${err.message}`);
    } finally {
      setTablesLoading(false);
    }
  };

  const fetchTableColumns = async () => {
    try {
      setColumnsLoading(true);
      setError(null);

      // Query to get column information
      const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: 'product_reviews' });

      if (error) {
        console.error('Error fetching table columns:', error);
        setError(`Table columns error: ${error.message}`);

        // Try a direct query as fallback
        try {
          const { data: reviewSample, error: sampleError } = await supabase
            .from('product_reviews')
            .select('*')
            .limit(1);

          if (sampleError) {
            console.error('Error fetching sample review:', sampleError);
          } else if (reviewSample && reviewSample.length > 0) {
            // Get column names from the sample
            const columnNames = Object.keys(reviewSample[0]).map(key => ({
              column_name: key,
              data_type: typeof reviewSample[0][key]
            }));
            setTableColumns(columnNames);
            console.log('Column names from sample:', columnNames);
          }
        } catch (err) {
          console.error('Error in fallback column check:', err);
        }

        return;
      }

      console.log('Table columns data:', data);
      setTableColumns(data || []);
    } catch (err: any) {
      console.error('Exception in fetchTableColumns:', err);
      setError(`Table columns exception: ${err.message}`);
    } finally {
      setColumnsLoading(false);
    }
  };

  const fetchDirectReviews = async () => {
    try {
      setDirectLoading(true);
      setError(null);

      console.log('Fetching direct reviews');

      // Simplified query first to get all reviews
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .limit(10);

      if (error) {
        console.error('Error fetching direct reviews:', error);
        setError(`Direct query error: ${error.message}`);
        return;
      }

      console.log('Direct reviews data:', data);

      // If we have reviews, fetch the user profiles separately
      if (data && data.length > 0) {
        try {
          // Get unique user IDs
          const userIds = [...new Set(data.map(review => review.user_id))];

          // Fetch profiles for these users
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching user profiles:', profilesError);
          } else if (profiles) {
            // Create a map of user_id to profile
            const profileMap = profiles.reduce((map, profile) => {
              map[profile.id] = profile;
              return map;
            }, {});

            // Attach profiles to reviews
            data.forEach(review => {
              review.profiles = profileMap[review.user_id] || null;
            });

            console.log('Enhanced reviews with profiles:', data);
          }
        } catch (profileErr) {
          console.error('Error enhancing reviews with profiles:', profileErr);
        }

        // Check if review_text exists and has content
        console.log('First review:', data[0]);
        console.log('Review text exists:', 'review_text' in data[0]);
        console.log('Review text value:', data[0].review_text);
        console.log('Review text type:', typeof data[0].review_text);
        console.log('Review text length:', data[0].review_text ? data[0].review_text.length : 0);

        // Try to access review_text directly for the first review
        try {
          const reviewId = data[0].id;
          const { data: textData, error: textError } = await supabase
            .from('product_reviews')
            .select('review_text')
            .eq('id', reviewId)
            .single();

          if (textError) {
            console.error('Error fetching review text directly:', textError);
          } else {
            console.log('Direct review text query result:', textData);
          }
        } catch (textErr) {
          console.error('Exception in direct text query:', textErr);
        }

        // Also try to get product details for the first review
        try {
          const productId = data[0].product_id;
          const { data: productData, error: productError } = await supabase
            .from('products')
            .select('id, title')
            .eq('id', productId)
            .maybeSingle();

          if (productError) {
            console.error('Error fetching product details:', productError);
          } else if (productData) {
            console.log('Product details for first review:', productData);
          } else {
            console.log('No product found with ID:', productId);
          }
        } catch (productErr) {
          console.error('Exception in product details fetch:', productErr);
        }
      }

      setDirectReviews(data || []);
    } catch (err: any) {
      console.error('Exception in fetchDirectReviews:', err);
      setError(`Direct query exception: ${err.message}`);
    } finally {
      setDirectLoading(false);
    }
  };

  const fetchReviewsByProductId = async () => {
    if (!productId) {
      setError('Please enter a product ID');
      return;
    }

    try {
      setProductLoading(true);
      setError(null);

      console.log('Fetching reviews for product ID:', productId);

      // First, check if the product exists
      const { data: productExists, error: productError } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId)
        .maybeSingle();

      if (productError) {
        console.error('Error checking if product exists:', productError);
        setError(`Error checking product: ${productError.message}`);
        return;
      }

      if (!productExists) {
        console.warn(`Product with ID ${productId} not found`);
        setError(`Product with ID ${productId} not found`);
        setServiceReviews([]);
        return;
      }

      // Direct query to the database for a specific product - simplified query
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId);

      if (error) {
        console.error('Error fetching reviews by product ID:', error);
        setError(`Product query error: ${error.message}`);
        return;
      }

      console.log('Reviews for product ID:', productId, data);

      // If we have reviews, fetch the user profiles separately
      if (data && data.length > 0) {
        try {
          // Get unique user IDs
          const userIds = [...new Set(data.map(review => review.user_id))];

          // Fetch profiles for these users
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', userIds);

          if (profilesError) {
            console.error('Error fetching user profiles:', profilesError);
          } else if (profiles) {
            // Create a map of user_id to profile
            const profileMap = profiles.reduce((map, profile) => {
              map[profile.id] = profile;
              return map;
            }, {});

            // Attach profiles to reviews
            data.forEach(review => {
              review.profiles = profileMap[review.user_id] || null;
            });

            console.log('Enhanced reviews with profiles:', data);
          }
        } catch (profileErr) {
          console.error('Error enhancing reviews with profiles:', profileErr);
        }
      }

      setServiceReviews(data || []);
    } catch (err: any) {
      console.error('Exception in fetchReviewsByProductId:', err);
      setError(`Product query exception: ${err.message}`);
    } finally {
      setProductLoading(false);
    }
  };

  const fetchReviewById = async () => {
    if (!reviewId) {
      setError('Please enter a review ID');
      return;
    }

    try {
      setReviewLoading(true);
      setError(null);
      setSingleReview(null);

      console.log('Fetching review with ID:', reviewId);

      // Simplified query first to check if the review exists
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('id', reviewId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching review by ID:', error);
        setError(`Review query error: ${error.message}`);
        return;
      }

      if (!data) {
        console.warn(`Review with ID ${reviewId} not found`);
        setError(`Review with ID ${reviewId} not found`);
        return;
      }

      console.log('Review data for ID:', reviewId, data);

      // If we have a review, fetch the user profile separately
      if (data.user_id) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', data.user_id)
            .maybeSingle();

          if (profileError) {
            console.error('Error fetching user profile:', profileError);
          } else if (profile) {
            data.profiles = profile;
            console.log('Enhanced review with profile:', data);
          }
        } catch (profileErr) {
          console.error('Error enhancing review with profile:', profileErr);
        }
      }

      setSingleReview(data);

      // Also try to get the product details
      try {
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('title, price, description')
          .eq('id', data.product_id)
          .maybeSingle();

        if (productError) {
          console.error('Error fetching product details:', productError);
        } else if (productData) {
          console.log('Product details for review:', productData);
          // You could add this to the singleReview state if needed
        }
      } catch (productErr) {
        console.error('Exception in product details fetch:', productErr);
      }
    } catch (err: any) {
      console.error('Exception in fetchReviewById:', err);
      setError(`Review query exception: ${err.message}`);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Review Debug Tool</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={fetchTables}
          className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          disabled={tablesLoading}
        >
          {tablesLoading ? 'Loading...' : 'List Database Tables'}
        </button>

        <button
          onClick={fetchTableColumns}
          className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
          disabled={columnsLoading}
        >
          {columnsLoading ? 'Loading...' : 'Check Table Columns'}
        </button>

        <button
          onClick={fetchDirectReviews}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          disabled={directLoading}
        >
          {directLoading ? 'Loading...' : 'Fetch Direct Reviews'}
        </button>
      </div>

      {tables.length > 0 && (
        <div className="mb-6 overflow-auto">
          <h3 className="text-xl font-semibold mb-2">Database Tables</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {tables.map((table, index) => (
              <div
                key={index}
                className="p-2 border rounded bg-gray-50 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  // Set the table name for the columns query
                  const tableName = table.tablename || table.table_name;
                  console.log(`Fetching columns for table: ${tableName}`);
                  // You could add functionality to fetch columns for this specific table
                }}
              >
                {table.tablename || table.table_name}
              </div>
            ))}
          </div>
        </div>
      )}

      {tableColumns.length > 0 && (
        <div className="mb-6 overflow-auto">
          <h3 className="text-xl font-semibold mb-2">Table Columns</h3>
          <table className="min-w-full border rounded">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Column Name</th>
                <th className="px-4 py-2 border">Data Type</th>
              </tr>
            </thead>
            <tbody>
              {tableColumns.map((column, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 border">{column.column_name}</td>
                  <td className="px-4 py-2 border">{column.data_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Fetch by Product ID</h3>
          <div className="flex items-center">
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Enter Product ID"
              className="border rounded px-3 py-2 mr-2 flex-grow"
            />
            <button
              onClick={fetchReviewsByProductId}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              disabled={productLoading}
            >
              {productLoading ? 'Loading...' : 'Fetch'}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Fetch by Review ID</h3>
          <div className="flex items-center">
            <input
              type="text"
              value={reviewId}
              onChange={(e) => setReviewId(e.target.value)}
              placeholder="Enter Review ID"
              className="border rounded px-3 py-2 mr-2 flex-grow"
            />
            <button
              onClick={fetchReviewById}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              disabled={reviewLoading}
            >
              {reviewLoading ? 'Loading...' : 'Fetch'}
            </button>
          </div>
        </div>
      </div>

      {singleReview && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Single Review</h3>
          <div className="border rounded p-4 bg-yellow-50">
            <div className="font-bold">Review ID: {singleReview.id}</div>
            <div>Product ID: {singleReview.product_id}</div>
            <div>User ID: {singleReview.user_id}</div>
            <div>User: {singleReview.profiles ?
              `${singleReview.profiles.first_name || ''} ${singleReview.profiles.last_name || ''}`.trim() || 'Anonymous'
              : 'Anonymous'}
            </div>
            <div>Rating: {singleReview.rating}</div>
            <div className="mt-2">
              <div className="font-semibold">Review Text:</div>
              <div className="bg-white p-2 rounded whitespace-pre-wrap border">
                {singleReview.review_text || <span className="text-red-500">No review text</span>}
              </div>
            </div>
            <div className="mt-4">
              <div className="font-semibold">All Fields:</div>
              <pre className="bg-white p-2 rounded text-xs overflow-auto mt-1 border">
                {JSON.stringify(singleReview, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xl font-semibold mb-2">Direct Reviews ({directReviews.length})</h3>
          {directReviews.length === 0 ? (
            <p className="text-gray-500">No direct reviews found</p>
          ) : (
            <div className="overflow-auto max-h-96 border rounded p-4">
              {directReviews.map((review, index) => (
                <div key={review.id || index} className="mb-4 pb-4 border-b">
                  <div className="font-bold">Review ID: {review.id}</div>
                  <div>Product ID: {review.product_id}</div>
                  <div>User ID: {review.user_id}</div>
                  <div>User: {review.profiles ?
                    `${review.profiles.first_name || ''} ${review.profiles.last_name || ''}`.trim() || 'Anonymous'
                    : 'Anonymous'}
                  </div>
                  <div>Rating: {review.rating}</div>
                  <div className="mt-2">
                    <div className="font-semibold">Review Text:</div>
                    <div className="bg-gray-100 p-2 rounded whitespace-pre-wrap">
                      {review.review_text || <span className="text-red-500">No review text</span>}
                    </div>
                  </div>
                  <div className="mt-2">
                    <details>
                      <summary className="cursor-pointer text-blue-500">Raw Data</summary>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto mt-1">
                        {JSON.stringify(review, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xl font-semibold mb-2">Product Reviews ({serviceReviews.length})</h3>
          {serviceReviews.length === 0 ? (
            <p className="text-gray-500">No product reviews found</p>
          ) : (
            <div className="overflow-auto max-h-96 border rounded p-4">
              {serviceReviews.map((review, index) => (
                <div key={review.id || index} className="mb-4 pb-4 border-b">
                  <div className="font-bold">Review ID: {review.id}</div>
                  <div>Product ID: {review.product_id}</div>
                  <div>User ID: {review.user_id}</div>
                  <div>User: {review.profiles ?
                    `${review.profiles.first_name || ''} ${review.profiles.last_name || ''}`.trim() || 'Anonymous'
                    : 'Anonymous'}
                  </div>
                  <div>Rating: {review.rating}</div>
                  <div className="mt-2">
                    <div className="font-semibold">Review Text:</div>
                    <div className="bg-gray-100 p-2 rounded whitespace-pre-wrap">
                      {review.review_text || <span className="text-red-500">No review text</span>}
                    </div>
                  </div>
                  <div className="mt-2">
                    <details>
                      <summary className="cursor-pointer text-blue-500">Raw Data</summary>
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto mt-1">
                        {JSON.stringify(review, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

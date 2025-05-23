import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const DiscountDebugPage: React.FC = () => {
  const [orderData, setOrderData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // First, try to find the specific payment intent from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const paymentIntentId = urlParams.get('payment_intent_id') || 'pi_3RRnY6D3jaZLGJYs2nQWIm2d';

        console.log('🔍 DEBUG PAGE - Looking for payment intent:', paymentIntentId);

        // Try to find the specific order first
        const { data: specificOrder, error: specificError } = await supabase
          .from('stripe_orders')
          .select('*')
          .eq('payment_intent_id', paymentIntentId)
          .limit(1);

        if (specificError) {
          console.error('🔍 DEBUG PAGE - Error finding specific order:', specificError);
        } else if (specificOrder && specificOrder.length > 0) {
          console.log('🔍 DEBUG PAGE - Found specific order:', specificOrder[0]);
          setOrderData(specificOrder[0]);
          return;
        } else {
          console.log('🔍 DEBUG PAGE - Specific order not found, getting most recent');
        }

        // If specific order not found, get the most recent order
        const { data: orders, error: ordersError } = await supabase
          .from('stripe_orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (ordersError) {
          throw ordersError;
        }

        if (orders && orders.length > 0) {
          setOrderData(orders[0]);
          console.log('🔍 DEBUG PAGE - Most recent order:', orders[0]);
        } else {
          setError('No orders found');
        }
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching order data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderData();
  }, []);

  const fixDiscountForOrder = async () => {
    if (!orderData) return;

    setIsFixing(true);
    setFixResult(null);

    try {
      // First, try to add the discount columns if they don't exist
      console.log('🔧 FIXING - Adding discount columns...');

      // Try to add columns one by one using simple ALTER TABLE statements
      const columns = [
        { name: 'discount_amount', type: 'INTEGER DEFAULT 0' },
        { name: 'discount_type', type: 'TEXT' },
        { name: 'discount_percentage', type: 'INTEGER' },
        { name: 'promo_code', type: 'TEXT' }
      ];

      let columnErrors = [];

      for (const column of columns) {
        try {
          const { error } = await supabase.rpc('execute_sql', {
            sql_query: `ALTER TABLE stripe_orders ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`
          });

          if (error) {
            console.warn(`🔧 FIXING - Could not add column ${column.name}:`, error.message);
            columnErrors.push(`${column.name}: ${error.message}`);
          } else {
            console.log(`🔧 FIXING - Column ${column.name} added successfully`);
          }
        } catch (err: any) {
          console.warn(`🔧 FIXING - Exception adding column ${column.name}:`, err.message);
          columnErrors.push(`${column.name}: ${err.message}`);
        }
      }

      if (columnErrors.length > 0) {
        console.log('🔧 FIXING - Some column creation issues:', columnErrors);
        // Continue anyway - columns might already exist
      }

      console.log('🔧 FIXING - Now trying to update order...');

      // Since the columns might not exist, let's try a different approach
      // First, let's try to just add the columns using a simple approach
      try {
        // Try to add columns using raw SQL
        await supabase.rpc('execute_sql', {
          sql_query: 'ALTER TABLE stripe_orders ADD COLUMN discount_amount INTEGER DEFAULT 0'
        });
        console.log('🔧 FIXING - Added discount_amount column');
      } catch (e) {
        console.log('🔧 FIXING - discount_amount column might already exist');
      }

      try {
        await supabase.rpc('execute_sql', {
          sql_query: 'ALTER TABLE stripe_orders ADD COLUMN discount_type TEXT'
        });
        console.log('🔧 FIXING - Added discount_type column');
      } catch (e) {
        console.log('🔧 FIXING - discount_type column might already exist');
      }

      try {
        await supabase.rpc('execute_sql', {
          sql_query: 'ALTER TABLE stripe_orders ADD COLUMN discount_percentage INTEGER'
        });
        console.log('🔧 FIXING - Added discount_percentage column');
      } catch (e) {
        console.log('🔧 FIXING - discount_percentage column might already exist');
      }

      try {
        await supabase.rpc('execute_sql', {
          sql_query: 'ALTER TABLE stripe_orders ADD COLUMN promo_code TEXT'
        });
        console.log('🔧 FIXING - Added promo_code column');
      } catch (e) {
        console.log('🔧 FIXING - promo_code column might already exist');
      }

      // Now try to update the order
      const { error: updateError } = await supabase.rpc('execute_sql', {
        sql_query: `UPDATE stripe_orders SET discount_amount = 240, discount_type = 'percentage', discount_percentage = 10, promo_code = 'TEST10' WHERE id = '${orderData.id}'`
      });

      if (updateError) {
        console.error('🔧 FIXING - Update error:', updateError);
        setFixResult(`Update failed: ${updateError.message}. The columns might not exist in the database.`);
      } else {
        console.log('🔧 FIXING - Order updated successfully!');
        setFixResult('✅ Discount data added successfully! Refresh the page to see changes.');
      }

    } catch (error: any) {
      console.error('🔧 FIXING - Exception:', error);
      setFixResult(`Error: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading order data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold mb-6">Discount Debug Page</h1>

        {orderData && (
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Most Recent Order Data</h2>
              <button
                onClick={fixDiscountForOrder}
                disabled={isFixing || !orderData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFixing ? 'Fixing...' : 'Fix Discount Data'}
              </button>
            </div>

            {fixResult && (
              <div className={`mb-4 p-3 rounded-md ${fixResult.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {fixResult}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="font-medium text-gray-700">Order ID</h3>
                <p className="text-sm text-gray-600">{orderData.id}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Payment Intent ID</h3>
                <p className="text-sm text-gray-600">{orderData.payment_intent_id}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Amount Total (cents)</h3>
                <p className="text-sm text-gray-600">{orderData.amount_total}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Shipping Cost (cents)</h3>
                <p className="text-sm text-gray-600">{orderData.shipping_cost}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Discount Amount (cents)</h3>
                <p className="text-sm text-gray-600">
                  {orderData.discount_amount ||
                    (orderData.items?.discount_info?.discount_amount) ||
                    'NULL'}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Discount Type</h3>
                <p className="text-sm text-gray-600">
                  {orderData.discount_type ||
                    (orderData.items?.discount_info?.discount_type) ||
                    'NULL'}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Discount Percentage</h3>
                <p className="text-sm text-gray-600">
                  {orderData.discount_percentage ||
                    (orderData.items?.discount_info?.discount_percentage) ||
                    'NULL'}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-700">Promo Code</h3>
                <p className="text-sm text-gray-600">
                  {orderData.promo_code ||
                    (orderData.items?.discount_info?.promo_code) ||
                    'NULL'}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Items</h3>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto">
                {JSON.stringify(orderData.items, null, 2)}
              </pre>
            </div>

            <div className="mb-6">
              <h3 className="font-medium text-gray-700 mb-2">Calculations</h3>
              <div className="bg-gray-100 p-3 rounded">
                {(() => {
                  // Handle both old format (items array) and new format (items object with discount_info)
                  const itemsData = orderData.items || [];
                  const actualItems = Array.isArray(itemsData) ? itemsData : (itemsData.items || []);
                  const discountInfo = Array.isArray(itemsData) ? null : itemsData.discount_info;

                  const subtotal = actualItems.reduce((sum: number, item: any) =>
                    sum + (parseFloat(item.price) * item.quantity), 0);

                  // Get discount amount from either the old columns or the embedded discount_info
                  const discountAmount = (
                    orderData.discount_amount ||
                    discountInfo?.discount_amount ||
                    0
                  ) / 100;

                  const shippingCost = (orderData.shipping_cost || 0) / 100;
                  const calculatedTotal = subtotal - discountAmount + shippingCost;
                  const storedTotal = (orderData.amount_total || 0) / 100;

                  return (
                    <div className="space-y-2 text-sm">
                      <p>Subtotal: ${subtotal.toFixed(2)}</p>
                      <p>Discount: ${discountAmount.toFixed(2)}</p>
                      <p>Shipping: ${shippingCost.toFixed(2)}</p>
                      <p>Calculated Total: ${calculatedTotal.toFixed(2)}</p>
                      <p>Stored Total: ${storedTotal.toFixed(2)}</p>
                      <p className={calculatedTotal !== storedTotal ? 'text-red-600 font-medium' : 'text-green-600'}>
                        Match: {calculatedTotal === storedTotal ? 'YES' : 'NO'}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Full Order Data</h3>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-x-auto max-h-96">
                {JSON.stringify(orderData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

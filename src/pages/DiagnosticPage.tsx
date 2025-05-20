import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

const DiagnosticPage: React.FC = () => {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [guestOrders, setGuestOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string>('');

  useEffect(() => {
    fetchDiagnosticData();
  }, []);

  const fetchDiagnosticData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let diagnosticLog = '';

      // Log the start of the diagnostic
      diagnosticLog += "Starting diagnostic check...\n\n";

      // Check for all orders
      diagnosticLog += "Checking for all orders...\n";
      const { data: allOrdersData, error: allOrdersError } = await supabase
        .from('stripe_orders')
        .select('id, payment_intent_id, is_guest, user_id, created_at, shipping_address')
        .order('created_at', { ascending: false })
        .limit(20);

      if (allOrdersError) {
        diagnosticLog += `Error fetching all orders: ${allOrdersError.message}\n`;
        setError(`Error fetching all orders: ${allOrdersError.message}`);
      } else {
        diagnosticLog += `Found ${allOrdersData?.length || 0} total orders\n\n`;
        setAllOrders(allOrdersData || []);
      }

      // Check specifically for guest orders
      diagnosticLog += "Checking for guest orders...\n";
      const { data: guestOrdersData, error: guestOrdersError } = await supabase
        .from('stripe_orders')
        .select('id, payment_intent_id, is_guest, user_id, created_at, shipping_address')
        .eq('is_guest', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (guestOrdersError) {
        diagnosticLog += `Error fetching guest orders: ${guestOrdersError.message}\n`;
      } else {
        diagnosticLog += `Found ${guestOrdersData?.length || 0} guest orders with is_guest=true\n\n`;
        setGuestOrders(guestOrdersData || []);
      }

      // Check for orders with guest in the payment_intent_id
      diagnosticLog += "Checking for orders with 'guest' in payment_intent_id...\n";
      const { data: guestIntentOrders, error: guestIntentError } = await supabase
        .from('stripe_orders')
        .select('id, payment_intent_id, is_guest, user_id, created_at, shipping_address')
        .ilike('payment_intent_id', '%guest%')
        .order('created_at', { ascending: false })
        .limit(10);

      if (guestIntentError) {
        diagnosticLog += `Error checking for guest intent orders: ${guestIntentError.message}\n`;
      } else {
        diagnosticLog += `Found ${guestIntentOrders?.length || 0} orders with 'guest' in payment_intent_id\n\n`;
      }

      // Check for orders with the guest user ID
      diagnosticLog += "Checking for orders with guest user ID...\n";
      const { data: guestUserOrders, error: guestUserError } = await supabase
        .from('stripe_orders')
        .select('id, payment_intent_id, is_guest, user_id, created_at, shipping_address')
        .eq('user_id', '00000000-0000-0000-0000-000000000001')
        .order('created_at', { ascending: false })
        .limit(10);

      if (guestUserError) {
        diagnosticLog += `Error checking for guest user orders: ${guestUserError.message}\n`;
      } else {
        diagnosticLog += `Found ${guestUserOrders?.length || 0} orders with guest user ID\n\n`;
      }

      // Check for recent orders
      diagnosticLog += "Checking for most recent orders...\n";
      const { data: recentOrders, error: recentOrdersError } = await supabase
        .from('stripe_orders')
        .select('id, payment_intent_id, is_guest, user_id, created_at, shipping_address')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentOrdersError) {
        diagnosticLog += `Error checking for recent orders: ${recentOrdersError.message}\n`;
      } else {
        diagnosticLog += `Most recent orders:\n`;
        recentOrders?.forEach((order, index) => {
          diagnosticLog += `${index + 1}. ID: ${order.id}, Payment Intent: ${order.payment_intent_id}, Is Guest: ${order.is_guest}, User ID: ${order.user_id}, Created: ${order.created_at}\n`;
        });
        diagnosticLog += '\n';
      }

      // Diagnostic complete
      diagnosticLog += "Diagnostic check complete.\n";
      setDiagnosticInfo(diagnosticLog);

    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runSqlFix = async () => {
    try {
      setIsLoading(true);
      
      // Update any orders with the guest user ID to have is_guest=true
      const { error: updateUserIdError } = await supabase.rpc('execute_sql', {
        sql_query: "UPDATE stripe_orders SET is_guest = true WHERE user_id = '00000000-0000-0000-0000-000000000001' AND is_guest IS NOT TRUE"
      });
      
      if (updateUserIdError) {
        setError(`Error updating orders with guest user ID: ${updateUserIdError.message}`);
        return;
      }
      
      // Update any orders with 'guest' in the payment_intent_id to have is_guest=true
      const { error: updateIntentError } = await supabase.rpc('execute_sql', {
        sql_query: "UPDATE stripe_orders SET is_guest = true WHERE payment_intent_id LIKE '%guest%' AND is_guest IS NOT TRUE"
      });
      
      if (updateIntentError) {
        setError(`Error updating orders with guest in payment_intent_id: ${updateIntentError.message}`);
        return;
      }
      
      // Refresh the data
      await fetchDiagnosticData();
      
      alert('SQL fix applied successfully. Please check the updated data.');
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Order Diagnostic Page</h1>
      
      <div className="mb-6">
        <Link to="/admin/orders" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4">
          Go to Admin Orders
        </Link>
        <button 
          onClick={fetchDiagnosticData} 
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-4"
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh Data'}
        </button>
        <button 
          onClick={runSqlFix} 
          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
          disabled={isLoading}
        >
          Apply SQL Fix
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Diagnostic Log</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap">
          {diagnosticInfo}
        </pre>
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">All Orders ({allOrders.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="px-4 py-2 border">ID</th>
                <th className="px-4 py-2 border">Payment Intent</th>
                <th className="px-4 py-2 border">Is Guest</th>
                <th className="px-4 py-2 border">User ID</th>
                <th className="px-4 py-2 border">Created At</th>
                <th className="px-4 py-2 border">Shipping Address</th>
              </tr>
            </thead>
            <tbody>
              {allOrders.map(order => (
                <tr key={order.id}>
                  <td className="px-4 py-2 border">{order.id}</td>
                  <td className="px-4 py-2 border">{order.payment_intent_id}</td>
                  <td className="px-4 py-2 border">{order.is_guest ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 border">{order.user_id}</td>
                  <td className="px-4 py-2 border">{new Date(order.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 border">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(order.shipping_address, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Guest Orders ({guestOrders.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="px-4 py-2 border">ID</th>
                <th className="px-4 py-2 border">Payment Intent</th>
                <th className="px-4 py-2 border">Is Guest</th>
                <th className="px-4 py-2 border">User ID</th>
                <th className="px-4 py-2 border">Created At</th>
                <th className="px-4 py-2 border">Shipping Address</th>
              </tr>
            </thead>
            <tbody>
              {guestOrders.map(order => (
                <tr key={order.id}>
                  <td className="px-4 py-2 border">{order.id}</td>
                  <td className="px-4 py-2 border">{order.payment_intent_id}</td>
                  <td className="px-4 py-2 border">{order.is_guest ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 border">{order.user_id}</td>
                  <td className="px-4 py-2 border">{new Date(order.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 border">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(order.shipping_address, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPage;

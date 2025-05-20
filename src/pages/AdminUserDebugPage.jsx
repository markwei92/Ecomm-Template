import React, { useState } from 'react';
import { signInWithEmail } from '../services/fixedAuthService';
import { createClient } from '@supabase/supabase-js';

const AdminUserDebugPage = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123');
  const [loginResult, setLoginResult] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const handleCreateUser = async () => {
    setIsCreating(true);
    setCreateResult(null);
    
    try {
      // Generate a unique email
      const newEmail = `admin-user-${Date.now()}@example.com`;
      setEmail(newEmail);
      
      // Create Supabase admin client
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      
      // Create user with admin API
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: newEmail,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: 'Admin',
          last_name: 'Test',
          full_name: 'Admin Test'
        }
      });
      
      if (error) {
        setCreateResult({
          success: false,
          message: `User creation failed: ${error.message}`
        });
      } else {
        setCreateResult({
          success: true,
          message: 'User created successfully!',
          user: {
            id: data.user.id,
            email: data.user.email,
            confirmed: data.user.email_confirmed_at ? 'Yes' : 'No'
          }
        });
      }
    } catch (error) {
      setCreateResult({
        success: false,
        message: `Exception during user creation: ${error.message}`
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginResult(null);
    
    try {
      const result = await signInWithEmail(email, password);
      setLoginResult(result);
    } catch (error) {
      setLoginResult({
        success: false,
        message: `Exception during login: ${error.message}`
      });
    } finally {
      setIsLoggingIn(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Admin User Debug Page</h1>
      
      <div className="mb-6">
        <p className="mb-4">
          This page creates a user with the admin API and tests login with our fixed login service.
        </p>
      </div>
      
      <div className="p-4 bg-white rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-bold mb-4">Create Admin User</h2>
        
        <button
          onClick={handleCreateUser}
          disabled={isCreating}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isCreating ? 'Creating...' : 'Create New Admin User'}
        </button>
        
        {createResult && (
          <div className={`mt-4 p-3 ${createResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded`}>
            <h4 className={`font-semibold ${createResult.success ? 'text-green-800' : 'text-red-800'} mb-2`}>
              {createResult.success ? 'User Created' : 'Creation Failed'}
            </h4>
            
            <p className="mb-2">{createResult.message}</p>
            
            {createResult.success && createResult.user && (
              <div className="mb-2">
                <p><strong>User ID:</strong> {createResult.user.id}</p>
                <p><strong>Email:</strong> {createResult.user.email}</p>
                <p><strong>Email Confirmed:</strong> {createResult.user.confirmed}</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {email && (
        <div className="p-4 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Test Login</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              readOnly
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          
          <button
            onClick={handleLogin}
            disabled={isLoggingIn || !email}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
          >
            {isLoggingIn ? 'Logging in...' : 'Test Login'}
          </button>
          
          {loginResult && (
            <div className={`mt-4 p-3 ${loginResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded`}>
              <h4 className={`font-semibold ${loginResult.success ? 'text-green-800' : 'text-red-800'} mb-2`}>
                {loginResult.success ? 'Login Successful' : 'Login Failed'}
              </h4>
              
              <p className="mb-2">{loginResult.message}</p>
              
              {loginResult.success && loginResult.user && (
                <div className="mb-2">
                  <p><strong>User ID:</strong> {loginResult.user.id}</p>
                  <p><strong>Email:</strong> {loginResult.user.email}</p>
                </div>
              )}
              
              <div className="mt-3">
                <details>
                  <summary className="cursor-pointer text-xs text-gray-500">View full response</summary>
                  <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(loginResult, null, 2)}</pre>
                </details>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUserDebugPage;

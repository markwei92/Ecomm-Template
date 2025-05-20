import React, { useState } from 'react';
import { signInWithEmail } from '../services/fixedAuthService';

const FixedLoginTest = () => {
  const [email, setEmail] = useState('necixed240@jazipo.com');
  const [password, setPassword] = useState('123456');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const loginResult = await signInWithEmail(email, password);
      setResult(loginResult);
    } catch (error) {
      setResult({
        success: false,
        error,
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Fixed Login Test</h2>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      {result && (
        <div className={`mt-4 p-3 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded`}>
          <h4 className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'} mb-2`}>
            {result.success ? 'Login Successful' : 'Login Failed'}
          </h4>
          
          <p className="mb-2">{result.message}</p>
          
          {result.success && result.user && (
            <div className="mb-2">
              <p><strong>User ID:</strong> {result.user.id}</p>
              <p><strong>Email:</strong> {result.user.email}</p>
            </div>
          )}
          
          <div className="mt-3">
            <details>
              <summary className="cursor-pointer text-xs text-gray-500">View full response</summary>
              <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedLoginTest;

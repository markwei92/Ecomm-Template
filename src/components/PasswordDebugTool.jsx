import React, { useState } from 'react';
import { signInWithEmail } from '../services/fixedAuthService';

const PasswordDebugTool = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <h2 className="text-xl font-bold mb-4">Password Debug Tool</h2>
      
      <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">Password Requirements</h3>
        <p className="mb-2">When creating a new account through the sign-up page, passwords must meet these requirements:</p>
        <ul className="list-disc pl-5 mb-2">
          <li>At least 8 characters long</li>
          <li>At least one uppercase letter (A-Z)</li>
          <li>At least one lowercase letter (a-z)</li>
          <li>At least one number (0-9)</li>
        </ul>
        <p className="text-sm text-blue-600">
          <strong>Note:</strong> Test users created programmatically may have simpler passwords like "123456".
        </p>
      </div>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
            required
            placeholder="Enter your email"
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
            placeholder="Enter your password"
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isLoading ? 'Testing...' : 'Test Login'}
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

export default PasswordDebugTool;

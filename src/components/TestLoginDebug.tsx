import React, { useState } from 'react';
import {
  testLogin,
  testPasswordHash,
  testUserWithHash,
  updateUserPasswordHash,
  checkAuthUser,
  sendPasswordResetEmail,
  directPasswordUpdate,
  resetPasswordWithSQL,
  testSupabaseLogin
} from '../services/testLogin';

const TestLoginDebug: React.FC = () => {
  const [email, setEmail] = useState('test3@test3.com');
  const [password, setPassword] = useState('123456');
  const [results, setResults] = useState<any>(null);
  const [passwordToHash, setPasswordToHash] = useState('123456');
  const [passwordHash, setPasswordHash] = useState('');
  const [hashToCheck, setHashToCheck] = useState('43b6630ee3a5548610a88be60fcc11c30d15bd0462a48cf3914d16a65b54cf7a');
  const [hashCheckResults, setHashCheckResults] = useState<any>(null);
  const [updateResults, setUpdateResults] = useState<any>(null);
  const [authUserResults, setAuthUserResults] = useState<any>(null);
  const [resetPasswordResults, setResetPasswordResults] = useState<any>(null);
  const [directPasswordResults, setDirectPasswordResults] = useState<any>(null);
  const [sqlPasswordResults, setSqlPasswordResults] = useState<any>(null);
  const [supabaseLoginResults, setSupabaseLoginResults] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('123456');

  const handleTestLogin = async () => {
    const result = await testLogin(email, password);
    setResults(result);
  };

  const handleGenerateHash = () => {
    const hash = testPasswordHash(passwordToHash);
    setPasswordHash(hash);
  };

  const handleCheckHash = async () => {
    const result = await testUserWithHash(email, hashToCheck);
    setHashCheckResults(result);
  };

  const handleUpdatePasswordHash = async () => {
    // Generate the hash for "123456"
    const hash = testPasswordHash("123456");
    const result = await updateUserPasswordHash(email, hash);
    setUpdateResults(result);
  };

  const handleCheckAuthUser = async () => {
    const result = await checkAuthUser(email);
    setAuthUserResults(result);
  };

  const handleSendPasswordReset = async () => {
    const result = await sendPasswordResetEmail(email);
    setResetPasswordResults(result);
  };

  const handleDirectPasswordUpdate = async () => {
    const result = await directPasswordUpdate(email, newPassword);
    setDirectPasswordResults(result);
  };

  const handleSqlPasswordReset = async () => {
    const result = await resetPasswordWithSQL(email, newPassword);
    setSqlPasswordResults(result);
  };

  const handleSupabaseLogin = async () => {
    const result = await testSupabaseLogin(email, password);
    setSupabaseLoginResults(result);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Login Debug Tool</h2>

      <div className="mb-6 p-4 border border-gray-200 rounded">
        <h3 className="text-lg font-semibold mb-2">Test Login</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleTestLogin}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Hybrid Login
          </button>
          <button
            onClick={handleSupabaseLogin}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Supabase Auth
          </button>
        </div>

        {results && (
          <div className="mt-4 p-3 bg-gray-100 rounded overflow-auto">
            <pre className="text-xs">{JSON.stringify(results, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="mb-6 p-4 border border-gray-200 rounded">
        <h3 className="text-lg font-semibold mb-2">Generate Password Hash</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="text"
            value={passwordToHash}
            onChange={(e) => setPasswordToHash(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <button
          onClick={handleGenerateHash}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Generate Hash
        </button>

        {passwordHash && (
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <p className="text-xs break-all">{passwordHash}</p>
          </div>
        )}
      </div>

      <div className="p-4 border border-gray-200 rounded mb-6">
        <h3 className="text-lg font-semibold mb-2">Check User with Hash</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Hash to Check</label>
          <input
            type="text"
            value={hashToCheck}
            onChange={(e) => setHashToCheck(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <button
          onClick={handleCheckHash}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Check Hash
        </button>

        {hashCheckResults && (
          <div className="mt-4 p-3 bg-gray-100 rounded overflow-auto">
            <pre className="text-xs">{JSON.stringify(hashCheckResults, null, 2)}</pre>
          </div>
        )}
      </div>

      <div className="p-4 border border-gray-200 rounded mb-6">
        <h3 className="text-lg font-semibold mb-2">Supabase Auth User Tools</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <p className="mb-3 text-sm text-gray-600">
          Check if the user exists in the Supabase Auth database
        </p>
        <div className="flex space-x-2 mb-4">
          <button
            onClick={handleCheckAuthUser}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Check Auth User
          </button>

          <button
            onClick={handleSendPasswordReset}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Send Password Reset Email
          </button>
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="font-semibold text-gray-800 mb-2">Direct Password Update</h4>
          <p className="mb-3 text-sm text-gray-600">
            Update password directly using admin API (bypasses email reset)
          </p>
          <div className="flex items-end space-x-2 mb-3">
            <div className="flex-grow">
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleDirectPasswordUpdate}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Update Password (API)
              </button>
              <button
                onClick={handleSqlPasswordReset}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Reset Password (SQL)
              </button>
            </div>
          </div>
        </div>

        {authUserResults && (
          <div className="mt-4 p-3 bg-gray-100 rounded overflow-auto">
            <h4 className="font-semibold text-gray-800 mb-2">Auth User Check Results</h4>
            <pre className="text-xs">{JSON.stringify(authUserResults, null, 2)}</pre>
          </div>
        )}

        {resetPasswordResults && (
          <div className={`mt-4 p-3 ${resetPasswordResults.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded`}>
            <h4 className={`font-semibold ${resetPasswordResults.success ? 'text-green-800' : 'text-yellow-800'} mb-2`}>
              {resetPasswordResults.success ? 'Password Reset Email' : 'Password Reset Issue'}
            </h4>

            {resetPasswordResults.message && (
              <p className="mb-2">{resetPasswordResults.message}</p>
            )}

            {resetPasswordResults.suggestion && (
              <p className="mb-2 text-yellow-700">{resetPasswordResults.suggestion}</p>
            )}

            {resetPasswordResults.alternativeMethod && resetPasswordResults.instructions && (
              <div className="mt-3 p-2 bg-white rounded">
                <h5 className="font-medium text-gray-800 mb-1">Alternative Method:</h5>
                <ul className="list-disc pl-5 text-sm">
                  {resetPasswordResults.instructions.map((instruction: string, index: number) => (
                    <li key={index} className="mb-1">{instruction}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3">
              <details>
                <summary className="cursor-pointer text-xs text-gray-500">View full response</summary>
                <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(resetPasswordResults, null, 2)}</pre>
              </details>
            </div>
          </div>
        )}

        {directPasswordResults && (
          <div className={`mt-4 p-3 ${directPasswordResults.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded`}>
            <h4 className={`font-semibold ${directPasswordResults.success ? 'text-green-800' : 'text-yellow-800'} mb-2`}>
              {directPasswordResults.success ? 'Password Updated (API)' : 'Password Update Issue (API)'}
            </h4>

            {directPasswordResults.message && (
              <p className="mb-2">{directPasswordResults.message}</p>
            )}

            {directPasswordResults.suggestion && (
              <p className="mb-2 text-yellow-700">{directPasswordResults.suggestion}</p>
            )}

            <div className="mt-3">
              <details>
                <summary className="cursor-pointer text-xs text-gray-500">View full response</summary>
                <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(directPasswordResults, null, 2)}</pre>
              </details>
            </div>
          </div>
        )}

        {sqlPasswordResults && (
          <div className={`mt-4 p-3 ${sqlPasswordResults.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded`}>
            <h4 className={`font-semibold ${sqlPasswordResults.success ? 'text-green-800' : 'text-yellow-800'} mb-2`}>
              {sqlPasswordResults.success ? 'Password Reset (SQL)' : 'Password Reset Issue (SQL)'}
            </h4>

            {sqlPasswordResults.message && (
              <p className="mb-2">{sqlPasswordResults.message}</p>
            )}

            {sqlPasswordResults.suggestion && (
              <p className="mb-2 text-yellow-700">{sqlPasswordResults.suggestion}</p>
            )}

            <div className="mt-3">
              <details>
                <summary className="cursor-pointer text-xs text-gray-500">View full response</summary>
                <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(sqlPasswordResults, null, 2)}</pre>
              </details>
            </div>
          </div>
        )}

        {supabaseLoginResults && (
          <div className={`mt-4 p-3 ${supabaseLoginResults.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded`}>
            <h4 className={`font-semibold ${supabaseLoginResults.success ? 'text-green-800' : 'text-yellow-800'} mb-2`}>
              {supabaseLoginResults.success ? 'Supabase Auth Login Successful' : 'Supabase Auth Login Failed'}
            </h4>

            {supabaseLoginResults.message && (
              <p className="mb-2">{supabaseLoginResults.message}</p>
            )}

            {supabaseLoginResults.error && (
              <p className="mb-2 text-red-700">Error: {supabaseLoginResults.error.message}</p>
            )}

            <div className="mt-3">
              <details>
                <summary className="cursor-pointer text-xs text-gray-500">View full response</summary>
                <pre className="mt-2 text-xs overflow-auto">{JSON.stringify(supabaseLoginResults, null, 2)}</pre>
              </details>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border border-gray-200 rounded">
        <h3 className="text-lg font-semibold mb-2">Update Password Hash</h3>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded"
          />
        </div>
        <p className="mb-3 text-sm text-gray-600">
          This will update the user's password hash to match the hash for "123456"
        </p>
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <strong>Note:</strong> This only works for custom auth users in the public.users table.
          For Supabase Auth users (in auth.users), you need to reset the password through the Supabase dashboard.
        </div>
        <button
          onClick={handleUpdatePasswordHash}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Update Password Hash
        </button>

        {updateResults && (
          <div className="mt-4 p-3 bg-gray-100 rounded overflow-auto">
            <pre className="text-xs">{JSON.stringify(updateResults, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestLoginDebug;

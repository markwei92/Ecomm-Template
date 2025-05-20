import React from 'react';
import PasswordDebugTool from '../components/PasswordDebugTool';

const PasswordDebugPage = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Password Requirements Debug</h1>
      
      <div className="mb-6">
        <p className="mb-4">
          This page helps diagnose issues with password requirements and login.
        </p>
        
        <div className="p-4 border border-yellow-200 bg-yellow-50 rounded mb-6">
          <h2 className="text-lg font-semibold mb-2 text-yellow-800">Important Note</h2>
          <p>
            There's a mismatch between the password requirements in the sign-up form and Supabase's own requirements:
          </p>
          <ul className="list-disc pl-5 mt-2">
            <li><strong>Sign-up form:</strong> 8+ characters with uppercase, lowercase, and numbers</li>
            <li><strong>Supabase:</strong> 6+ characters with no complexity requirements</li>
          </ul>
          <p className="mt-2">
            This means test users created programmatically can use simple passwords like "123456", but users created through the application must use complex passwords.
          </p>
        </div>
      </div>
      
      <PasswordDebugTool />
      
      <div className="mt-8 p-4 border border-gray-200 rounded">
        <h2 className="text-lg font-semibold mb-2">Troubleshooting Tips</h2>
        <ul className="list-disc pl-5">
          <li>If you created your account through the sign-up page, make sure you're using the complex password you created</li>
          <li>If you're using a test account created programmatically, try the simple password (e.g., "123456")</li>
          <li>Check for any typos in your email or password</li>
          <li>Make sure your account has been confirmed (check your email)</li>
        </ul>
      </div>
    </div>
  );
};

export default PasswordDebugPage;

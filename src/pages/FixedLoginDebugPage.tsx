import React from 'react';
import FixedLoginTest from '../components/FixedLoginTest';

const FixedLoginDebugPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Fixed Login Debug Page</h1>
      <p className="mb-6 text-gray-600">
        This page uses a completely new authentication implementation that creates a fresh Supabase client for each login attempt.
        This should fix the "Database error querying schema" issue.
      </p>
      
      <FixedLoginTest />
    </div>
  );
};

export default FixedLoginDebugPage;

import React from 'react';
import { ReviewDebug } from '../components/ReviewDebug';

const ReviewDebugPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Review System Debug</h1>
        <ReviewDebug />
      </div>
    </div>
  );
};

export default ReviewDebugPage;

import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-4 min-h-[200px]">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-200 rounded-full"></div>
        <div className="w-12 h-12 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
      </div>
    </div>
  );
}
import React from 'react';

const LoadingSpinner = ({ text = "Loading", fullPage = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      {/* Spinner */}
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 border-4 border-border rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
      
      {/* Loading Text */}
      <div className="text-center">
        <p className="text-lg font-semibold text-foreground mb-1">{text}</p>
        <p className="text-sm text-muted-foreground">Please wait...</p>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;

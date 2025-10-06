'use client';

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class WebpackErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('[WEBPACK-ERROR-BOUNDARY] Caught error:', error);
    
    // Check if it's a webpack factory error
    if (error.message.includes('Cannot read properties of undefined (reading \'call\')')) {
      console.error('[WEBPACK-ERROR-BOUNDARY] Detected webpack factory error, attempting recovery...');
      
      // Try to clear caches
      if (typeof window !== 'undefined') {
        try {
          localStorage.clear();
          sessionStorage.clear();
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            });
          }
        } catch (e) {
          console.warn('[WEBPACK-ERROR-BOUNDARY] Cache clearing failed:', e);
        }
      }
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[WEBPACK-ERROR-BOUNDARY] Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-900 flex items-center justify-center p-4">
          <div className="bg-red-800 border border-red-600 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-white text-xl font-bold mb-4">
              ⚠️ Development Error Detected
            </h2>
            <p className="text-red-200 mb-4">
              A webpack module loading error occurred. This is likely due to development environment issues.
            </p>
            <button
              onClick={() => {
                // Force reload
                window.location.reload();
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium"
            >
              Reload Page
            </button>
            <details className="mt-4">
              <summary className="text-red-300 cursor-pointer">Error Details</summary>
              <pre className="text-xs text-red-100 mt-2 bg-red-900 p-2 rounded overflow-auto">
                {this.state.error?.stack || this.state.error?.message}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
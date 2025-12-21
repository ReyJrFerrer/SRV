/**
 * Map Error Boundary
 * Catches and handles errors in map components gracefully
 */

import React, { Component, ReactNode } from 'react';
import { forceClearAndReload } from '../../utils/cacheManager';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MapErrorBoundary] Map component error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Check if it's a Google Maps API error
    const isGoogleMapsError = 
      error.message?.includes('google') ||
      error.message?.includes('maps') ||
      error.message?.includes('Geocoder') ||
      error.message?.includes('DirectionsService');

    if (isGoogleMapsError) {
      console.error('[MapErrorBoundary] Detected Google Maps API error');
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleClearCache = async () => {
    await forceClearAndReload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex h-full w-full items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              Map Loading Error
            </h2>
            
            <p className="mb-4 text-sm text-gray-600">
              {this.state.error?.message || 'Something went wrong with the map.'}
            </p>
            
            <p className="mb-6 text-xs text-gray-500">
              This may be due to network issues or cached data. Try refreshing or clearing your cache.
            </p>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleRetry}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Try Again
              </button>
              
              <button
                onClick={this.handleClearCache}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Clear Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;

/**
 * Root entry point for the AI-enhanced Excel Add-in web application
 * Implements React 18 concurrent features, Redux store, Office.js integration,
 * and comprehensive error handling with performance monitoring
 * @version 1.0.0
 */

import React, { StrictMode } from 'react'; // v18.2.0
import { createRoot } from 'react-dom/client'; // v18.2.0
import { Provider } from 'react-redux'; // v8.0.5
import { initializeIcons } from '@fluentui/react'; // v8.0.0
import { ApplicationInsights } from '@microsoft/applicationinsights-web'; // v2.8.0
import { ErrorBoundary } from 'react-error-boundary'; // v4.0.0
import * as Office from '@microsoft/office-js'; // v1.1.0

import App from './App';
import { store } from './store';
import { getToken } from './utils/auth.utils';
import { PERFORMANCE_THRESHOLDS } from './constants/excel.constants';

// Initialize Application Insights for telemetry
const appInsights = new ApplicationInsights({
  config: {
    instrumentationKey: process.env.REACT_APP_APPINSIGHTS_KEY,
    enableAutoRouteTracking: true,
    enablePerformanceTracking: true,
    maxBatchSize: 250,
    maxBatchInterval: 5000,
    disableFetchTracking: false,
    enableCorsCorrelation: true,
    enableRequestHeaderTracking: true,
    enableResponseHeaderTracking: true
  }
});

// Global error handler for uncaught exceptions
const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
  appInsights.trackException({
    error,
    properties: {
      errorInfo: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    }
  });

  // Log error details for development
  if (process.env.NODE_ENV === 'development') {
    console.error('Application error:', error);
    console.error('Error info:', errorInfo);
  }
};

// Initialize Office.js with retry mechanism
const initializeOfficeJs = async (): Promise<void> => {
  let retryAttempts = 0;
  const maxRetries = PERFORMANCE_THRESHOLDS.MAX_RETRY_ATTEMPTS;

  while (retryAttempts < maxRetries) {
    try {
      await new Promise<void>((resolve, reject) => {
        Office.onReady((info) => {
          if (info.host === Office.HostType.Excel) {
            resolve();
          } else {
            reject(new Error('Invalid host application'));
          }
        });
      });
      return;
    } catch (error) {
      retryAttempts++;
      if (retryAttempts === maxRetries) {
        throw error;
      }
      await new Promise(resolve => 
        setTimeout(resolve, PERFORMANCE_THRESHOLDS.RETRY_DELAY_MS)
      );
    }
  }
};

// Initialize application with performance monitoring
const initializeApp = async (): Promise<void> => {
  const startTime = performance.now();

  try {
    // Initialize Fluent UI icons
    initializeIcons();

    // Initialize Application Insights
    appInsights.loadAppInsights();
    appInsights.trackPageView();

    // Initialize Office.js
    await initializeOfficeJs();

    // Set security headers
    if (process.env.NODE_ENV === 'production') {
      // Content Security Policy
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Content-Security-Policy';
      meta.content = `
        default-src 'self';
        script-src 'self' https://*.microsoft.com;
        style-src 'self' 'unsafe-inline' https://*.microsoft.com;
        img-src 'self' data: https://*.microsoft.com;
        connect-src 'self' https://*.microsoft.com https://*.azure.com;
      `;
      document.head.appendChild(meta);
    }

    // Get root element
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    // Create React 18 root with concurrent features
    const root = createRoot(rootElement);

    // Render application with error boundary and Redux provider
    root.render(
      <StrictMode>
        <ErrorBoundary
          FallbackComponent={({ error }) => (
            <div role="alert">
              <h2>Application Error</h2>
              <pre>{error.message}</pre>
            </div>
          )}
          onError={handleError}
        >
          <Provider store={store}>
            <App />
          </Provider>
        </ErrorBoundary>
      </StrictMode>
    );

    // Track initialization performance
    const endTime = performance.now();
    appInsights.trackMetric({
      name: 'AppInitialization',
      average: endTime - startTime
    });

  } catch (error) {
    appInsights.trackException({
      error: error as Error,
      severityLevel: 3,
      properties: {
        phase: 'initialization',
        timestamp: new Date().toISOString()
      }
    });
    throw error;
  }
};

// Start application initialization
initializeApp().catch(error => {
  console.error('Failed to initialize application:', error);
  appInsights.trackException({ error: error as Error });
});

// Enable hot module replacement for development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    initializeApp().catch(console.error);
  });
}
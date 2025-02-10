import React, { useEffect, useCallback, useRef } from 'react';
import { 
  Stack, 
  Spinner, 
  MessageBar, 
  MessageBarType, 
  Pivot, 
  PivotItem, 
  IStackStyles, 
  IStackTokens 
} from '@fluentui/react'; // ^8.0.0
import { Provider } from 'react-redux'; // ^8.0.5
import * as Office from '@microsoft/office-js'; // ^1.1.0

import FormulaAssistant from './pages/FormulaAssistant/FormulaAssistant';
import DataCleaning from './pages/DataCleaning/DataCleaning';
import VersionHistory from './pages/VersionHistory/VersionHistory';
import { useAuth } from './hooks/useAuth';

// Constants for task pane dimensions
const TASK_PANE_WIDTH = 350;
const MIN_HEIGHT = 400;

// Stack tokens for consistent spacing
const STACK_TOKENS: IStackTokens = {
  childrenGap: 10,
  padding: 10
};

// Stack styles for main container
const stackStyles: IStackStyles = {
  root: {
    width: TASK_PANE_WIDTH,
    minHeight: MIN_HEIGHT,
    backgroundColor: 'var(--background-color)',
    overflow: 'hidden'
  }
};

/**
 * Root component of the Excel Add-in
 * Implements main layout structure and authentication flow
 */
const App: React.FC = () => {
  // Authentication state management
  const { isAuthenticated, loading, error, login } = useAuth();
  const initializeRef = useRef<boolean>(false);

  /**
   * Initialize Office.js runtime and authentication
   */
  const initializeOffice = useCallback(async () => {
    try {
      await Office.onReady();
      if (!isAuthenticated) {
        await login();
      }
      initializeRef.current = true;
    } catch (error) {
      handleAuthError(error);
    }
  }, [isAuthenticated, login]);

  /**
   * Handle authentication errors with user feedback
   */
  const handleAuthError = (error: any): void => {
    console.error('Authentication error:', error);
    // Error will be displayed through useAuth error state
  };

  // Initialize Office.js and authentication on mount
  useEffect(() => {
    if (!initializeRef.current) {
      initializeOffice();
    }
  }, [initializeOffice]);

  // Render loading state
  if (loading) {
    return (
      <Stack styles={stackStyles} tokens={STACK_TOKENS}>
        <Spinner label="Initializing Excel Add-in..." />
      </Stack>
    );
  }

  // Render error state
  if (error) {
    return (
      <Stack styles={stackStyles} tokens={STACK_TOKENS}>
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={true}
          dismissButtonAriaLabel="Close"
        >
          {error}
        </MessageBar>
      </Stack>
    );
  }

  // Render authentication required state
  if (!isAuthenticated) {
    return (
      <Stack styles={stackStyles} tokens={STACK_TOKENS}>
        <MessageBar
          messageBarType={MessageBarType.warning}
          isMultiline={true}
        >
          Please sign in to use the Excel Add-in.
        </MessageBar>
      </Stack>
    );
  }

  // Render main application
  return (
    <Provider store={store}>
      <Stack
        styles={stackStyles}
        tokens={STACK_TOKENS}
        role="main"
        aria-label="Excel Add-in"
      >
        <Pivot
          aria-label="Navigation Menu"
          styles={{
            root: { width: '100%' }
          }}
        >
          <PivotItem
            headerText="Formula Assistant"
            itemKey="formula"
            headerButtonProps={{
              'aria-label': 'Formula Assistant tab',
              'data-cy': 'formula-tab'
            }}
          >
            <FormulaAssistant />
          </PivotItem>

          <PivotItem
            headerText="Data Cleaning"
            itemKey="cleaning"
            headerButtonProps={{
              'aria-label': 'Data Cleaning tab',
              'data-cy': 'cleaning-tab'
            }}
          >
            <DataCleaning />
          </PivotItem>

          <PivotItem
            headerText="Version History"
            itemKey="version"
            headerButtonProps={{
              'aria-label': 'Version History tab',
              'data-cy': 'version-tab'
            }}
          >
            <VersionHistory />
          </PivotItem>
        </Pivot>

        {/* Accessibility announcement region */}
        <div
          role="status"
          aria-live="polite"
          className="sr-only"
        />
      </Stack>
    </Provider>
  );
};

export default App;
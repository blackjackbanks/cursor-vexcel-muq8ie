/**
 * Root Redux store configuration for Excel Add-in
 * Implements centralized state management with performance optimizations
 * @version 1.0.0
 */

import { 
    configureStore, 
    combineReducers,
    getDefaultMiddleware,
    Middleware
} from '@reduxjs/toolkit'; // ^1.9.5
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage/session';

// Import feature reducers
import authReducer from './slices/authSlice';
import formulaReducer from './slices/formulaSlice';
import versionReducer from './slices/versionSlice';
import themeReducer from './slices/themeSlice';
import excelReducer from './slices/excelSlice';

// Performance monitoring middleware
const performanceMiddleware: Middleware = () => (next) => (action) => {
    const start = performance.now();
    const result = next(action);
    const end = performance.now();
    
    // Log actions taking longer than 100ms
    if (end - start > 100) {
        console.warn(`Slow action ${action.type}: ${end - start}ms`);
    }
    
    return result;
};

// Root reducer combining all feature slices
const rootReducer = combineReducers({
    auth: authReducer,
    formula: formulaReducer,
    version: versionReducer,
    theme: themeReducer,
    excel: excelReducer
});

// Redux persist configuration
const persistConfig = {
    key: 'root',
    version: 1,
    storage: storage,
    whitelist: ['auth', 'theme'], // Only persist these reducers
    blacklist: ['formula', 'excel'], // Never persist these reducers
    throttle: 1000 // Throttle state persistence
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store with performance optimizations
export const store = configureStore({
    reducer: persistedReducer,
    middleware: getDefaultMiddleware({
        // Optimize serialization checks
        serializableCheck: {
            ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
            warnAfter: 128
        },
        // Optimize immutability checks
        immutableCheck: { warnAfter: 128 },
        // Thunk middleware configuration
        thunk: {
            extraArgument: undefined
        }
    }).concat(performanceMiddleware),
    devTools: process.env.NODE_ENV !== 'production',
    // Preloaded state if needed
    preloadedState: undefined,
    // Enhance store with additional capabilities
    enhancers: (defaultEnhancers) => defaultEnhancers
});

// Create persistor
export const persistor = persistStore(store);

// Setup RTK Query listeners
setupListeners(store.dispatch);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Type-safe hooks
export type AppStore = typeof store;

// Enable hot module replacement for reducers
if (process.env.NODE_ENV !== 'production' && module.hot) {
    module.hot.accept('./slices/authSlice', () => store.replaceReducer(persistedReducer));
}

export default store;
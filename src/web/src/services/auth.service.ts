/**
 * @fileoverview Enhanced Authentication Service for Excel Add-in
 * Implements secure Microsoft Identity authentication with advanced token management
 * @version 1.0.0
 */

import { 
    PublicClientApplication, 
    AuthenticationResult, 
    InteractionRequiredAuthError,
    AccountInfo
} from '@azure/msal-browser'; // v2.32.0
import axios, { AxiosInstance } from 'axios'; // v1.4.0
import axiosRetry from 'axios-retry'; // v3.5.0
import { TokenService } from '@microsoft/token-service'; // v1.0.0

import { IUser, IAuthResponse, AuthErrorCode, IAuthError } from '../interfaces/auth.interface';
import { 
    msalConfig, 
    loginRequest, 
    apiConfig, 
    tokenConfig,
    rolePermissions 
} from '../config/auth.config';
import { 
    AUTH_ERROR_CODES, 
    AUTH_TOKEN_CONFIG 
} from '../constants/auth.constants';

/**
 * Enhanced service class for handling secure authentication operations
 * Implements OAuth 2.0 + JWT based authentication with advanced security features
 */
export class AuthService {
    private readonly msalInstance: PublicClientApplication;
    private readonly tokenService: TokenService;
    private readonly axiosInstance: AxiosInstance;
    private isRefreshing: boolean = false;
    private refreshSubscribers: Array<(token: string) => void> = [];
    private readonly securityContext: Map<string, any> = new Map();

    /**
     * Initializes the AuthService with enhanced security configuration
     * @param tokenService - Injected TokenService for secure token management
     */
    constructor(tokenService: TokenService) {
        this.msalInstance = new PublicClientApplication(msalConfig);
        this.tokenService = tokenService;
        
        // Configure axios instance with security headers and retry logic
        this.axiosInstance = axios.create({
            baseURL: apiConfig.baseUrl,
            timeout: apiConfig.timeout,
            headers: tokenConfig.securityHeaders
        });

        // Configure axios retry mechanism with exponential backoff
        axiosRetry(this.axiosInstance, {
            retries: apiConfig.retryConfig.maxRetries,
            retryDelay: (retryCount) => {
                return Math.min(
                    apiConfig.retryConfig.baseDelay * Math.pow(2, retryCount),
                    apiConfig.retryConfig.maxDelay
                );
            },
            retryCondition: (error) => {
                return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                    error.response?.status === 401;
            }
        });

        // Initialize security event listeners
        this.initializeSecurityListeners();
    }

    /**
     * Handles secure user login through Microsoft Identity
     * @returns Promise<IAuthResponse> Authentication response with token and user info
     * @throws {AuthError} When authentication fails
     */
    public async login(): Promise<IAuthResponse> {
        try {
            // Validate current session state
            await this.validateSessionState();

            // Perform Microsoft Identity authentication
            const authResult = await this.msalInstance.loginPopup(loginRequest);
            
            if (!authResult) {
                throw this.createAuthError(
                    AUTH_ERROR_CODES.INVALID_CREDENTIALS,
                    'Authentication failed'
                );
            }

            // Get access token and validate with backend
            const accessToken = await this.getAccessTokenSilent(authResult.account);
            const response = await this.validateTokenWithBackend(accessToken);

            // Encrypt and store token securely
            const encryptedToken = await this.tokenService.encryptToken(response.token);
            sessionStorage.setItem(AUTH_TOKEN_CONFIG.STORAGE_KEY, encryptedToken);

            // Initialize session monitoring
            this.initializeSessionMonitoring(response.user);

            return response;
        } catch (error) {
            console.error('Authentication error:', error);
            throw this.handleAuthError(error);
        }
    }

    /**
     * Handles secure user logout with session cleanup
     * @returns Promise<void>
     */
    public async logout(): Promise<void> {
        try {
            // Clear sensitive session data
            sessionStorage.removeItem(AUTH_TOKEN_CONFIG.STORAGE_KEY);
            this.securityContext.clear();
            
            // Perform backend logout
            await this.axiosInstance.post(apiConfig.endpoints.logout);
            
            // Complete MSAL logout
            await this.msalInstance.logout({
                onRedirectNavigate: () => false
            });
        } catch (error) {
            console.error('Logout error:', error);
            throw this.handleAuthError(error);
        }
    }

    /**
     * Enhanced token refresh with queue management
     * @returns Promise<string> New encrypted JWT token
     * @throws {AuthError} When token refresh fails
     */
    public async refreshToken(): Promise<string> {
        try {
            if (this.isRefreshing) {
                return new Promise((resolve) => {
                    this.refreshSubscribers.push(resolve);
                });
            }

            this.isRefreshing = true;
            const currentAccount = this.msalInstance.getAllAccounts()[0];
            
            if (!currentAccount) {
                throw this.createAuthError(
                    AUTH_ERROR_CODES.SESSION_EXPIRED,
                    'No active session found'
                );
            }

            const silentRequest = {
                ...loginRequest,
                account: currentAccount
            };

            const authResult = await this.msalInstance.acquireTokenSilent(silentRequest);
            const response = await this.validateTokenWithBackend(authResult.accessToken);
            
            // Encrypt new token
            const encryptedToken = await this.tokenService.encryptToken(response.token);
            sessionStorage.setItem(AUTH_TOKEN_CONFIG.STORAGE_KEY, encryptedToken);

            // Notify subscribers
            this.refreshSubscribers.forEach(callback => callback(response.token));
            this.refreshSubscribers = [];

            return response.token;
        } catch (error) {
            console.error('Token refresh error:', error);
            throw this.handleAuthError(error);
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     * Retrieves current authenticated user with security validation
     * @returns Promise<IUser | null> Validated current user information
     */
    public async getCurrentUser(): Promise<IUser | null> {
        try {
            const encryptedToken = sessionStorage.getItem(AUTH_TOKEN_CONFIG.STORAGE_KEY);
            if (!encryptedToken) {
                return null;
            }

            const token = await this.tokenService.decryptToken(encryptedToken);
            const response = await this.axiosInstance.get(apiConfig.endpoints.validate, {
                headers: { Authorization: `Bearer ${token}` }
            });

            return response.data.user;
        } catch (error) {
            console.error('Get current user error:', error);
            return null;
        }
    }

    /**
     * Initializes security event listeners for session monitoring
     * @private
     */
    private initializeSecurityListeners(): void {
        window.addEventListener('storage', async (event) => {
            if (event.key === AUTH_TOKEN_CONFIG.STORAGE_KEY && !event.newValue) {
                await this.logout();
            }
        });

        // Monitor for suspicious activity
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.validateSessionState();
            }
        });
    }

    /**
     * Validates the current session state
     * @private
     * @throws {AuthError} When session validation fails
     */
    private async validateSessionState(): Promise<void> {
        const accounts = this.msalInstance.getAllAccounts();
        if (accounts.length > 1) {
            await this.logout();
            throw this.createAuthError(
                AUTH_ERROR_CODES.INVALID_TOKEN,
                'Multiple accounts detected'
            );
        }
    }

    /**
     * Creates a standardized auth error
     * @private
     * @param code - Error code from AUTH_ERROR_CODES
     * @param message - Error message
     * @returns IAuthError
     */
    private createAuthError(code: string, message: string): IAuthError {
        return {
            code: code as AuthErrorCode,
            message,
            timestamp: new Date(),
            details: {}
        };
    }

    /**
     * Handles authentication errors with proper error mapping
     * @private
     * @param error - Caught error
     * @returns IAuthError
     */
    private handleAuthError(error: any): IAuthError {
        if (error.response?.status === 401) {
            return this.createAuthError(
                AUTH_ERROR_CODES.UNAUTHORIZED,
                'Unauthorized access'
            );
        }
        return this.createAuthError(
            AUTH_ERROR_CODES.INVALID_CREDENTIALS,
            error.message || 'Authentication failed'
        );
    }

    /**
     * Acquires access token silently
     * @private
     * @param account - Account information
     * @returns Promise<string> Access token
     */
    private async getAccessTokenSilent(account: AccountInfo): Promise<string> {
        try {
            const silentRequest = {
                ...loginRequest,
                account
            };
            const authResult = await this.msalInstance.acquireTokenSilent(silentRequest);
            return authResult.accessToken;
        } catch (error) {
            if (error instanceof InteractionRequiredAuthError) {
                const interactiveResult = await this.msalInstance.acquireTokenPopup(loginRequest);
                return interactiveResult.accessToken;
            }
            throw error;
        }
    }

    /**
     * Validates token with backend service
     * @private
     * @param token - Access token to validate
     * @returns Promise<IAuthResponse>
     */
    private async validateTokenWithBackend(token: string): Promise<IAuthResponse> {
        const response = await this.axiosInstance.post(
            apiConfig.endpoints.validate,
            { token },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    }

    /**
     * Initializes session monitoring for the authenticated user
     * @private
     * @param user - Authenticated user information
     */
    private initializeSessionMonitoring(user: IUser): void {
        this.securityContext.set('userId', user.id);
        this.securityContext.set('lastActivity', new Date());
        
        // Set up session activity monitoring
        setInterval(() => {
            const lastActivity = this.securityContext.get('lastActivity') as Date;
            if (Date.now() - lastActivity.getTime() > AUTH_TOKEN_CONFIG.REFRESH_THRESHOLD * 1000) {
                this.logout();
            }
        }, 60000); // Check every minute
    }
}
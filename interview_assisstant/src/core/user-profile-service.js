/**
 * User Profile Service for Interview Assistant Plugin
 * Handles fetching user profile configurations from the backend API
 * Read-only service - no edit capabilities in the plugin
 */
import { backendUrlApiUserConfig } from './environment.js';

class UserProfileService {
    constructor() {
        this.baseUrl = backendUrlApiUserConfig;
        this.pendingRequests = new Map();
        this.profileCache = null;
        this.settingsCache = null;
        this.cacheExpiry = null;
        this.cacheTTL = 5 * 60 * 1000; // 5 minutes
        this.isInitialized = false;
        
        // Automatically load cache from storage when service is created
        this.autoLoadCache();
    }

    /**
     * Automatically load cache from storage when service is created
     * @returns {Promise<void>}
     */
    async autoLoadCache() {
        try {
            console.log('Auto-loading cache from storage...');
            await this.loadCacheFromStorage();
            
            // If cache is stale or empty, prefetch in background
            if (!this.isInitialized || 
                (this.cacheExpiry && Date.now() >= this.cacheExpiry)) {
                console.log('Cache stale or empty, prefetching in background...');
                // Don't await this - let it run in background
                this.prefetchProfiles().catch(error => {
                    console.error('Background prefetch failed:', error);
                });
            } else {
                console.log('Using cached data from storage');
            }
        } catch (error) {
            console.error('Error auto-loading cache:', error);
        }
    }

    /**
     * Save cache to chrome storage
     * @returns {Promise<void>}
     */
    async saveCacheToStorage() {
        try {
            // Get the current selected profile ID from storage
            const selectedProfileResult = await new Promise((resolve) => {
                chrome.storage.local.get(['selectedUserProfileId'], resolve);
            });
            
            const cacheData = {
                profileCache: this.profileCache,
                settingsCache: this.settingsCache,
                cacheExpiry: this.cacheExpiry,
                isInitialized: this.isInitialized,
                selectedUserProfileId: selectedProfileResult.selectedUserProfileId
            };
            
            await new Promise((resolve) => {
                chrome.storage.local.set({ 'userProfileCache': cacheData }, resolve);
            });
            
            console.log('Cache saved to chrome storage with profile ID:', selectedProfileResult.selectedUserProfileId);
        } catch (error) {
            console.error('Error saving cache to storage:', error);
        }
    }

    /**
     * Load cache from chrome storage
     * @returns {Promise<void>}
     */
    async loadCacheFromStorage() {
        try {
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['userProfileCache'], resolve);
            });
            
            const cacheData = result.userProfileCache;
            if (cacheData) {
                this.profileCache = cacheData.profileCache;
                this.settingsCache = cacheData.settingsCache;
                this.cacheExpiry = cacheData.cacheExpiry;
                this.isInitialized = cacheData.isInitialized;
                
                // Restore selected profile ID if it exists in cache
                if (cacheData.selectedUserProfileId) {
                    await new Promise((resolve) => {
                        chrome.storage.local.set({ 'selectedUserProfileId': cacheData.selectedUserProfileId }, resolve);
                    });
                    console.log('Selected profile ID restored from cache:', cacheData.selectedUserProfileId);
                }
                
                console.log('Cache loaded from chrome storage');
                console.log('Profiles cached:', this.profileCache ? this.profileCache.length : 0);
                console.log('Settings cached:', this.settingsCache ? 'Yes' : 'No');
            }
        } catch (error) {
            console.error('Error loading cache from storage:', error);
        }
    }

    /**
     * Get user configuration including profiles
     * @returns {Promise<Object>} User configuration with profiles
     */
    async getUserConfig() {
        console.log('getUserConfig called');
        
        // Check if we have cached settings
        if (this.settingsCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
            console.log('Returning cached user config');
            return this.settingsCache;
        }
        
        const userId = await this.getCurrentUserCognitoId();
        console.log('User ID:', userId);
        const endpoint = `/${userId}/config`;
        console.log('Making API request to endpoint:', endpoint);
        
        const userConfig = await this.makeRequest(endpoint);
        
        // Cache the settings
        this.settingsCache = userConfig;
        this.cacheExpiry = Date.now() + this.cacheTTL;
        
        // Save to chrome storage
        await this.saveCacheToStorage();
        
        return userConfig;
    }

    /**
     * Get current user's Cognito ID from QIKAID_PLUGIN_QA_TOKENS
     * @returns {Promise<string|null>} User's Cognito ID
     */
    async getCurrentUserCognitoId() {
        try {
            console.log('getCurrentUserCognitoId called');
            const { QIKAID_PLUGIN_QA_TOKENS } = await chrome.storage.local.get("QIKAID_PLUGIN_QA_TOKENS");
            console.log('QIKAID_PLUGIN_QA_TOKENS from chrome.storage:', QIKAID_PLUGIN_QA_TOKENS);
            if (QIKAID_PLUGIN_QA_TOKENS) {
                console.log('Parsed tokens:', QIKAID_PLUGIN_QA_TOKENS);
                const userId = QIKAID_PLUGIN_QA_TOKENS.userId || null;
                console.log('Extracted userId:', userId);
                return userId;
            }
            console.log('No tokens found in chrome.storage');
            return null;
        } catch (error) {
            console.error('Error getting user ID from QIKAID_PLUGIN_QA_TOKENS:', error);
            return null;
        }
    }

    /**
     * Get user information from QIKAID_PLUGIN_QA_TOKENS
     * @returns {Promise<Object|null>} User information
     */
    async getUserInfo() {
        try {
            const { QIKAID_PLUGIN_QA_TOKENS } = await chrome.storage.local.get("QIKAID_PLUGIN_QA_TOKENS");
            if (QIKAID_PLUGIN_QA_TOKENS) {
                return QIKAID_PLUGIN_QA_TOKENS;
            }
            return null;
        } catch (error) {
            console.error('Error getting user info from QIKAID_PLUGIN_QA_TOKENS:', error);
            return null;
        }
    }

    /**
     * Get authentication token from QIKAID_PLUGIN_QA_TOKENS
     * @returns {Promise<string|null>} Auth token
     */
    async getAuthToken() {
        try {
            const { QIKAID_PLUGIN_QA_TOKENS } = await chrome.storage.local.get("QIKAID_PLUGIN_QA_TOKENS");
            if (QIKAID_PLUGIN_QA_TOKENS) {
                return QIKAID_PLUGIN_QA_TOKENS.access_token || null;
            }
            return null;
        } catch (error) {
            console.error('Error getting auth token from QIKAID_PLUGIN_QA_TOKENS:', error);
            return null;
        }
    }

    /**
     * Make HTTP request with deduplication
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async makeRequest(endpoint, options = {}) {
        const token = await this.getAuthToken();
        
        if (!token) {
            throw new Error('No access token found. Please login again.');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const requestKey = `${options.method || 'GET'}:${url}`;
        
        // Check if there's already a pending request for this endpoint
        if (this.pendingRequests.has(requestKey)) {
            console.log('Deduplicating request:', requestKey);
            return this.pendingRequests.get(requestKey);
        }
        
        // Create the request promise
        const requestPromise = this.executeRequest(url, options);
        
        // Store the pending request
        this.pendingRequests.set(requestKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            // Remove the request from pending requests
            this.pendingRequests.delete(requestKey);
        }
    }

    /**
     * Execute the actual HTTP request
     * @param {string} url - Full URL
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response data
     */
    async executeRequest(url, options = {}) {
        const token = await this.getAuthToken();
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Access-Control-Request-Method': 'GET',
                ...options.headers,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Unauthorized. Please login again.');
            }
            if (response.status === 403) {
                throw new Error('Forbidden. You do not have permission to access this resource.');
            }
            if (response.status === 404) {
                throw new Error('User configuration not found.');
            }
            
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        try {
            return await response.json();
        } catch (error) {
            throw new Error('Failed to parse response as JSON');
        }
    }

    /**
     * Get user profiles for the current user
     * @returns {Promise<Array>} Array of user profiles
     */
    async getUserProfiles() {
        try {
            console.log('getUserProfiles called');
            const config = await this.getUserConfig();
            console.log('User config received:', config);
            const profiles = config.profiles || [];
            console.log('Profiles extracted:', profiles);
            return profiles;
        } catch (error) {
            console.error('Error fetching user profiles:', error);
            return [];
        }
    }

    /**
     * Get a specific user profile by ID
     * @param {string} profileId - Profile ID
     * @returns {Promise<Object|null>} User profile or null if not found
     */
    async getUserProfile(profileId) {
        try {
            const profiles = await this.getUserProfiles();
            return profiles.find(profile => profile.userProfileId === profileId) || null;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    /**
     * Get the first available user profile (fallback)
     * @returns {Promise<Object|null>} First user profile or null if none exist
     */
    async getDefaultUserProfile() {
        try {
            const profiles = await this.getUserProfiles();
            return profiles.length > 0 ? profiles[0] : null;
        } catch (error) {
            console.error('Error fetching default user profile:', error);
            return null;
        }
    }

    /**
     * Extract profile name from UUID_ProfileName format and replace underscores with spaces
     * @param {string} fullName - Full profile name with UUID prefix
     * @returns {string} Clean profile name
     */
    extractProfileName(fullName) {
        if (!fullName) return '';
        const parts = fullName.split('_');
        const profileName = parts.length > 1 ? parts.slice(1).join('_') : fullName;
        return profileName.replace(/_/g, ' ');
    }

    /**
     * Get formatted profile names for display
     * @returns {Promise<Array>} Array of profiles with formatted names
     */
    async getFormattedUserProfiles() {
        try {
            console.log('getFormattedUserProfiles called');
            const profiles = await this.getUserProfiles();
            console.log('Raw profiles from getUserProfiles:', profiles);
            const formattedProfiles = profiles.map(profile => ({
                ...profile,
                displayName: this.extractProfileName(profile.userProfileName)
            }));
            console.log('Formatted profiles:', formattedProfiles);
            return formattedProfiles;
        } catch (error) {
            console.error('Error fetching formatted user profiles:', error);
            return [];
        }
    }

    /**
     * Prefetch profiles and settings on extension startup
     * @returns {Promise<void>}
     */
    async prefetchProfiles() {
        try {
            console.log('Prefetching user profiles and settings...');
            
            // Prefetch both profiles and settings
            const [profiles, userConfig] = await Promise.all([
                this.getFormattedUserProfiles(),
                this.getUserConfig()
            ]);
            
            this.profileCache = profiles;
            this.settingsCache = userConfig;
            this.cacheExpiry = Date.now() + this.cacheTTL;
            this.isInitialized = true;
            
            // Save to chrome storage
            await this.saveCacheToStorage();
            
            console.log('Profiles prefetched and cached:', profiles.length, 'profiles');
            console.log('Settings prefetched and cached:', userConfig ? 'Yes' : 'No');
        } catch (error) {
            console.error('Error prefetching profiles and settings:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Get cached profiles or fetch if cache is stale
     * @returns {Promise<Array>} Array of profiles with formatted names
     */
    async getCachedProfiles() {
        // If cache is valid, return cached data
        if (this.profileCache && this.cacheExpiry && this.cacheExpiry > Date.now()) {
            console.log('Returning cached profiles:', this.profileCache.length, 'profiles');
            return this.profileCache;
        }

        // Cache is stale or doesn't exist, fetch fresh data
        console.log('Cache is stale or empty, fetching fresh profiles...');
        try {
            const profiles = await this.getFormattedUserProfiles();
            this.profileCache = profiles;
            this.cacheExpiry = Date.now() + this.cacheTTL;
            return profiles;
        } catch (error) {
            console.error('Error fetching fresh profiles:', error);
            // Return stale cache if available, otherwise empty array
            return this.profileCache || [];
        }
    }

    /**
     * Refresh profiles and settings in background (non-blocking)
     * @returns {Promise<void>}
     */
    async refreshInBackground() {
        try {
            console.log('Refreshing profiles and settings in background...');
            
            // Refresh both profiles and settings
            const [profiles, userConfig] = await Promise.all([
                this.getFormattedUserProfiles(),
                this.getUserConfig()
            ]);
            
            this.profileCache = profiles;
            this.settingsCache = userConfig;
            this.cacheExpiry = Date.now() + this.cacheTTL;
            
            // Save to chrome storage
            await this.saveCacheToStorage();
            
            console.log('Background refresh completed:', profiles.length, 'profiles');
            console.log('Settings refreshed:', userConfig ? 'Yes' : 'No');
        } catch (error) {
            console.error('Error in background refresh:', error);
        }
    }

    /**
     * Get cached settings or fetch if cache is stale
     * @returns {Promise<Object|null>} User settings or null if not available
     */
    async getCachedSettings() {
        try {
            if (this.settingsCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
                console.log('Returning cached settings');
                return this.settingsCache;
            }
            
            console.log('Cache stale or empty, fetching fresh settings...');
            const userConfig = await this.getUserConfig();
            return userConfig;
        } catch (error) {
            console.error('Error fetching cached settings:', error);
            // Return stale cache if available, otherwise null
            return this.settingsCache || null;
        }
    }

    /**
     * Check if profiles are initialized
     * @returns {boolean}
     */
    isProfilesInitialized() {
        return this.isInitialized;
    }
}

// Export singleton instance
const userProfileService = new UserProfileService();
export default userProfileService;
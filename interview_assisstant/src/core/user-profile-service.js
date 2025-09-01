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
    }

    /**
     * Get user configuration including profiles
     * @returns {Promise<Object>} User configuration with profiles
     */
    async getUserConfig() {
        console.log('getUserConfig called');
        const userId = await this.getCurrentUserCognitoId();
        console.log('User ID:', userId);
        const endpoint = `/${userId}/config`;
        console.log('Making API request to endpoint:', endpoint);
        return this.makeRequest(endpoint);
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
}

// Export singleton instance
const userProfileService = new UserProfileService();
export default userProfileService;
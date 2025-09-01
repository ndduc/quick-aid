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
        const endpoint = `/${this.getCurrentUserCognitoId()}/config`;
        return this.makeRequest(endpoint);
    }

    /**
     * Get current user's Cognito ID from QIKAID_PLUGIN_QA_TOKENS
     * @returns {string|null} User's Cognito ID
     */
    getCurrentUserCognitoId() {
        try {
            const tokens = localStorage.getItem('QIKAID_PLUGIN_QA_TOKENS');
            if (tokens) {
                const parsedTokens = JSON.parse(tokens);
                return parsedTokens.userId || null;
            }
            return null;
        } catch (error) {
            console.error('Error getting user ID from QIKAID_PLUGIN_QA_TOKENS:', error);
            return null;
        }
    }

    /**
     * Get user information from QIKAID_PLUGIN_QA_TOKENS
     * @returns {Object|null} User information
     */
    getUserInfo() {
        try {
            const tokens = localStorage.getItem('QIKAID_PLUGIN_QA_TOKENS');
            if (tokens) {
                return JSON.parse(tokens);
            }
            return null;
        } catch (error) {
            console.error('Error getting user info from QIKAID_PLUGIN_QA_TOKENS:', error);
            return null;
        }
    }

    /**
     * Get authentication token from QIKAID_PLUGIN_QA_TOKENS
     * @returns {string|null} Auth token
     */
    getAuthToken() {
        try {
            const tokens = localStorage.getItem('QIKAID_PLUGIN_QA_TOKENS');
            if (tokens) {
                const parsedTokens = JSON.parse(tokens);
                return parsedTokens.accessToken || parsedTokens.token || null;
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
        const token = this.getAuthToken();
        
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
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`,
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
            const config = await this.getUserConfig();
            return config.profiles || [];
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
            const profiles = await this.getUserProfiles();
            return profiles.map(profile => ({
                ...profile,
                displayName: this.extractProfileName(profile.userProfileName)
            }));
        } catch (error) {
            console.error('Error fetching formatted user profiles:', error);
            return [];
        }
    }
}

// Export singleton instance
const userProfileService = new UserProfileService();
export default userProfileService;
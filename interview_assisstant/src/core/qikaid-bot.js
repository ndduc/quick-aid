// Qikaid Bot Service - Handles interview payload generation using user profile data
import userProfileService from './user-profile-service.js';

// Qikaid Backend API Service - Handles all GPT interactions through backend
const QIKAID_API_BASE_URL = "http://localhost:8083/api/v1/openai";




// ============================================================================
// API CONFIGURATION
// ============================================================================

function getApiHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

async function getAuthToken() {
  try {
    const { QIKAID_PLUGIN_QA_TOKENS } = await chrome.storage.local.get("QIKAID_PLUGIN_QA_TOKENS");
    if (QIKAID_PLUGIN_QA_TOKENS && QIKAID_PLUGIN_QA_TOKENS.access_token) {
      return QIKAID_PLUGIN_QA_TOKENS.access_token;
    }
    return null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// ============================================================================
// PROMPT GENERATION FUNCTIONS USING USER PROFILE DATA
// ============================================================================

/**
 * Generate interview payload using user profile data from config UI
 * @returns {Promise<Array>} Messages array with system and user prompts
 */
export async function generateInterviewPayload() {
  try {
    // Get the selected profile from chrome storage
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['selectedUserProfileId'], resolve);
    });
    
    const selectedProfileId = result.selectedUserProfileId;
    
    if (!selectedProfileId) {
      console.log('No profile selected, using default payload');
      return getDefaultPayload();
    }
    
    // Get the selected profile data
    const profile = await userProfileService.getUserProfile(selectedProfileId);
    
    if (!profile) {
      console.log('Selected profile not found, using default payload');
      return getDefaultPayload();
    }
    
    console.log('Generating payload using profile:', profile.displayName);
    
    // Generate payload using profile data
    return [
      {
        role: "system",
        content: profile.botRole || "You are a helpful interview assistant."
      },
      {
        role: "user",
        content: `User Info: ${profile.userInfo || 'No user info provided'}\n\nPurpose: ${profile.purpose || 'No purpose specified'}`
      }
    ];
    
  } catch (error) {
    console.error('Error generating interview payload:', error);
    return getDefaultPayload();
  }
}

/**
 * Generate interview payload for screenshot mode using user profile data
 * @returns {Promise<Array>} Messages array with system and user prompts
 */
export async function generateInterviewPayloadForScreenshotMode() {
  try {
    // Get the selected profile from chrome storage
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['selectedUserProfileId'], resolve);
    });
    
    const selectedProfileId = result.selectedUserProfileId;
    
    if (!selectedProfileId) {
      console.log('No profile selected for screenshot mode, using default payload');
      return getDefaultScreenshotPayload();
    }
    
    // Get the selected profile data
    const profile = await userProfileService.getUserProfile(selectedProfileId);
    
    if (!profile) {
      console.log('Selected profile not found for screenshot mode, using default payload');
      return getDefaultScreenshotPayload();
    }
    
    console.log('Generating screenshot payload using profile:', profile.displayName);
    
    // Generate payload using profile data
    return [
      {
        role: "system",
        content: profile.botRole || "You are a helpful interview assistant."
      },
      {
        role: "user",
        content: `User Info: ${profile.userInfo || 'No user info provided'}\n\nPurpose: ${profile.purpose || 'No purpose specified'}`
      }
    ];
    
  } catch (error) {
    console.error('Error generating screenshot payload:', error);
    return getDefaultScreenshotPayload();
  }
}

/**
 * Get default payload when no profile is selected
 * @returns {Array} Default messages array
 */
function getDefaultPayload() {
  return [
    {
      role: "system",
      content: "You are a helpful interview assistant."
    },
    {
      role: "user",
      content: "Please help me with interview preparation."
    }
  ];
}

/**
 * Get default screenshot payload when no profile is selected
 * @returns {Array} Default messages array for screenshot mode
 */
function getDefaultScreenshotPayload() {
  return [
    {
      role: "system",
      content: "You are a helpful interview assistant."
    },
    {
      role: "user",
      content: "Please help me with interview preparation."
    }
  ];
}

// ============================================================================
// CORE API FUNCTIONS
// ============================================================================

export async function fetchGPTResponse(question, messages) {
  try {
    // Get auth token
    const authToken = await getAuthToken();
    if (!authToken) {
      throw new Error("No authentication token found");
    }

    // Add user question to messages
    const updatedMessages = [...messages, { role: "user", content: question }];
    
    // Prepare API payload for backend
    const payload = {
      messages: updatedMessages,
      question: question
    };

    // Make API call to backend
    const response = await fetch(`${QIKAID_API_BASE_URL}/ask`, {
      method: "POST",
      headers: {
        ...getApiHeaders(),
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data?.reply || "No response from API";
    
    return reply;
  } catch (error) {
    console.error("Error fetching GPT response:", error);
    return `Error: ${error.message}`;
  }
}

export async function sendImageToGPT(imageDataUrl, messagesScreenshotMode) {
  try {
    // Get auth token
    const authToken = await getAuthToken();
    if (!authToken) {
      throw new Error("No authentication token found");
    }

    const base64 = imageDataUrl.split(",")[1];
    let imageDataUrlBase64 = `data:image/png;base64,${base64}`;

    // Prepare API payload for backend
    const payload = {
      messages: messagesScreenshotMode,
      imageDataUrl: imageDataUrlBase64, // Send the full data URL (data:image/png;base64,...)
      screenshotMode: true,
      maxTokens: 8000,

    };

    // Make API call to backend
    const response = await fetch(`${QIKAID_API_BASE_URL}/vision`, {
      method: "POST",
      headers: {
        ...getApiHeaders(),
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data?.reply || "No response from API";
    
    return reply;
  } catch (error) {
    console.error("Error sending image to GPT:", error);
    return `Error: ${error.message}`;
  }
}

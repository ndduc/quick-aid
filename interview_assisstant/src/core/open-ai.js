// OpenAI API Service - Handles all GPT interactions
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

const MODEL_MAPPING = {
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-5": "gpt-5",
  "gpt-5o": "gpt-5o",
  "gpt-5o-mini": "gpt-5o-mini"
};

function getModelName(aiModel) {
  // If it's a known GPT model, use it directly
  if (MODEL_MAPPING[aiModel]) {
    return MODEL_MAPPING[aiModel];
  }
  
  // If it contains "gpt-5", use GPT-5
  if (aiModel.includes("gpt-5")) {
    return "gpt-5";
  }
  
  // If it contains "gpt-4", use GPT-4o (default)
  if (aiModel.includes("gpt-4")) {
    return "gpt-4o";
  }
  
  // Default fallback to GPT-4o
  return "gpt-4o";
}

// ============================================================================
// PROMPT GENERATION FUNCTIONS USING USER PROFILE DATA
// ============================================================================

/**
 * Generate interview payload using user profile data from extension storage
 * @returns {Promise<Array>} Messages array with system and user prompts
 */
export async function generateInterviewPayload(jobRole, specialty, extraPrompt) {
  try {
    // Get the selected profile from chrome storage cache
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['userProfileCache'], resolve);
    });
    
    const cacheData = result.userProfileCache;
    const selectedProfileId = cacheData ? cacheData.selectedUserProfileId : null;
    console.log('Selected profile ID from cache:', selectedProfileId);
    if (!selectedProfileId) {
      console.log('No profile selected, using default payload');
      return getDefaultPayload(jobRole, specialty, extraPrompt);
    }
    
    // Get the selected profile data from chrome storage
    const profileResult = await new Promise((resolve) => {
      chrome.storage.local.get(['userProfileCache'], resolve);
    });
    
    const profileCacheData = profileResult.userProfileCache;
    if (!profileCacheData || !profileCacheData.profileCache) {
      console.log('No profile cache found, using default payload');
      return getDefaultPayload(jobRole, specialty, extraPrompt);
    }
    
    // Find the selected profile
    const profile = profileCacheData.profileCache.find(p => p.userProfileId === selectedProfileId);
    
    if (!profile) {
      console.log('Selected profile not found in cache, using default payload');
      return getDefaultPayload(jobRole, specialty, extraPrompt);
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
    return getDefaultPayload(jobRole, specialty, extraPrompt);
  }
}

/**
 * Generate interview payload for screenshot mode using user profile data
 * @returns {Promise<Array>} Messages array with system and user prompts
 */
export async function generateInterviewPayloadForScreenshotMode(jobRole, specialty, extraPrompt) {
  try {
    // Get the selected profile from chrome storage cache
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['userProfileCache'], resolve);
    });
    
    const cacheData = result.userProfileCache;
    const selectedProfileId = cacheData ? cacheData.selectedUserProfileId : null;
    
    if (!selectedProfileId) {
      console.log('No profile selected for screenshot mode, using default payload');
      return getDefaultScreenshotPayload(jobRole, specialty, extraPrompt);
    }
    
    // Get the selected profile data from chrome storage
    const profileResult = await new Promise((resolve) => {
      chrome.storage.local.get(['userProfileCache'], resolve);
    });
    
    const screenshotCacheData = profileResult.userProfileCache;
    if (!screenshotCacheData || !screenshotCacheData.profileCache) {
      console.log('No profile cache found for screenshot mode, using default payload');
      return getDefaultScreenshotPayload(jobRole, specialty, extraPrompt);
    }
    
    // Find the selected profile
    const profile = screenshotCacheData.profileCache.find(p => p.userProfileId === selectedProfileId);
    
    if (!profile) {
      console.log('Selected profile not found in cache for screenshot mode, using default payload');
      return getDefaultScreenshotPayload(jobRole, specialty, extraPrompt);
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
    return getDefaultScreenshotPayload(jobRole, specialty, extraPrompt);
  }
}

/**
 * Get default payload when no profile is selected
 * @returns {Array} Default messages array
 */
function getDefaultPayload(jobRole, specialty, extraPrompt) {
  return [
    {
      role: "system",
      content: `You are an experienced ${jobRole} helping someone prepare for a job interview. 
      Answer questions clearly and concisely. Specialize in ${specialty}.
      ${extraPrompt}`
    }
  ];
}

/**
 * Get default screenshot payload when no profile is selected
 * @returns {Array} Default messages array for screenshot mode
 */
function getDefaultScreenshotPayload(jobRole, specialty, extraPrompt) {
  return [
    {
      role: "system",
      content: `You are an experienced ${jobRole} helping someone prepare for a job interview. 
      Completed the coding challenge. Specialize in ${specialty}.
      ${extraPrompt}`
    }
  ];
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

async function getApiConfig(apiKey, aiModel, maxTokens = 4000) {
  // Get user settings from cache
  let userSettings = null;
  try {
    const result = await chrome.storage.local.get(['userProfileCache']);
    if (result.userProfileCache && result.userProfileCache.settingsCache) {
      userSettings = result.userProfileCache.settingsCache.settings;
    }
  } catch (error) {
    console.warn('Could not load user settings for hyperparameters:', error);
  }

  return {
    temperature: userSettings?.defaultTemperature ?? 0.1,
    max_tokens: userSettings?.defaultMaxTokens ?? maxTokens,
    model: getModelName(aiModel),
    messages: [],
    top_p: userSettings?.defaultTopP ?? 0.9,
    // frequency_penalty: userSettings?.defaultTopK ?? 0.1, // Using defaultTopK as frequency_penalty fallback
    // presence_penalty: userSettings?.presencePenalty ?? 0.1,
  };
}

function getApiHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

// ============================================================================
// CORE API FUNCTIONS
// ============================================================================

export async function fetchGPTResponse(question, messages, apiKey, aiModel) {
  try {
    // Add user question to messages
    const updatedMessages = [...messages, { role: "user", content: question }];
    
    // Prepare API payload with higher token limit for detailed responses
    const apiConfig = await getApiConfig(apiKey, aiModel, 4000);
    const payload = {
      ...apiConfig,
      messages: updatedMessages,
    };

    // Make API call
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: getApiHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "No response from API";
    
    // Add assistant response to messages for context
    updatedMessages.push({ role: "assistant", content: reply });
    
    return reply;
  } catch (error) {
    console.error("Error fetching GPT response:", error);
    return `Error: ${error.message}`;
  }
}

export async function sendImageToGPT(imageDataUrl, messagesScreenshotMode, apiKey, aiModel) {
  try {
    // Extract base64 data from data URL
    const base64 = imageDataUrl.split(",")[1];
    
    // Prepare vision messages
    const visionMessages = [
      ...messagesScreenshotMode,
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${base64}` }
          }
        ]
      }
    ];

    // Prepare API payload for vision model with high token limit for detailed analysis
    const apiConfig = await getApiConfig(apiKey, aiModel, 8000);
    const payload = {
      ...apiConfig,
      messages: visionMessages,
    };

    // Make API call
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: getApiHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || "No response from API";
    
    return reply;
  } catch (error) {
    console.error("Error sending image to GPT:", error);
    return `Error: ${error.message}`;
  }
}

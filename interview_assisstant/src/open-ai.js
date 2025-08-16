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
// PROMPT GENERATION FUNCTIONS
// ============================================================================

export function generateInterviewPayload(jobRole, specialty, extraPrompt) {
  return [
    {
      role: "system",
      content: `You are an experienced ${jobRole} helping someone prepare for a job interview. 
      Answer questions clearly and concisely. Specialize in ${specialty}.
      ${extraPrompt}`
    }
  ];
}

export function generateInterviewPayloadForScreenshotMode(jobRole, specialty, extraPrompt) {
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

function getApiConfig(apiKey, aiModel, maxTokens = 4000) {
  return {
    temperature: 0.1,
    max_tokens: maxTokens,
    model: getModelName(aiModel),
    messages: [],
    top_p: 0.9,
    frequency_penalty: 0.1,
    presence_penalty: 0.1,
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
    const payload = {
      ...getApiConfig(apiKey, aiModel, 4000),
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
    const payload = {
      ...getApiConfig(apiKey, aiModel, 8000),
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

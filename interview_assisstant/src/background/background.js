import { backendUrlAuthRefresh } from '../core/environment.js';

let TOKENS = null;
let refreshTimer = null;
let authRefreshUrl = backendUrlAuthRefresh;

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg?.type === "QIKAID_PLUGIN_QA_TOKENS") {
    TOKENS = msg.payload;
    chrome.storage.local.set({ QIKAID_PLUGIN_QA_TOKENS: TOKENS });
    console.log("[QikAid] tokens cached:", {
      user: TOKENS.user_identifier,
      expIn: TOKENS.expires_in
    });
    
    // Set up automatic token refresh
    setupTokenRefresh();
    
    respond?.({ ok: true });
  } else if (msg?.type === "REFRESH_TOKEN_REQUEST") {
    // Handle token refresh request from websocket service or validator
    console.log("[QikAid] Token refresh requested");
    refreshToken().then(success => {
      if (success) {
        // Notify all content scripts about the token refresh
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              type: "TOKEN_REFRESHED",
              newAccessToken: TOKENS.access_token
            }).catch(() => {
              // Ignore errors for tabs that don't have content scripts
            });
          });
        });
      }
      respond?.({ success });
    });
    return true; // Keep message channel open for async response
  } else if (msg?.type === "LOCK_UI_AUTH_REQUIRED") {
    broadcastLockUI();
    respond?.({ ok: true });
  }
});

// Helper to load cached tokens
async function getTokens() {
  if (TOKENS) return TOKENS;
  const { QIKAID_PLUGIN_QA_TOKENS } = await chrome.storage.local.get("QIKAID_PLUGIN_QA_TOKENS");
  TOKENS = QIKAID_PLUGIN_QA_TOKENS || null;
  return TOKENS;
}

// Check if token is expired or will expire within 8 hours
function isTokenExpiringSoon(tokenTimestamp) {
  if (!tokenTimestamp) return true;
  
  const tokenTime = parseInt(tokenTimestamp);
  const currentTime = Date.now();
  const eightHoursInMs = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  
  // Check if token will expire within 8 hours
  return (currentTime - tokenTime) >= (24 * 60 * 60 * 1000 - eightHoursInMs); // Assuming 24h token lifetime
}

// Helper: Broadcast UI lock message
function broadcastLockUI() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: "LOCK_UI_AUTH_REQUIRED"
      }).catch(() => {});
    });
  });
}

// Refresh token using the refresh endpoint
async function refreshToken() {
  if (!TOKENS?.refresh_token || !TOKENS?.cognitoId) {
    console.warn("[QikAid] No refresh token or cognitoId available");
    broadcastLockUI();
    return false;
  }

  try {
    console.log("[QikAid] Refreshing token...");
    
    const response = await fetch(authRefreshUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: TOKENS.cognitoId,
        refreshToken: TOKENS.refresh_token
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
    }

    const newTokens = await response.json();
    
    // Update tokens with new values
    TOKENS = {
      ...TOKENS,
      access_token: newTokens.access_token,
      token_timestamp: Date.now().toString(),
      refresh_token: newTokens.refresh_token || TOKENS.refresh_token // Keep old refresh token if not provided
    };

    // Save updated tokens
    await chrome.storage.local.set({ QIKAID_PLUGIN_QA_TOKENS: TOKENS });
    
    console.log("[QikAid] Token refreshed successfully");
    
    // Set up next refresh
    setupTokenRefresh();
    
    return true;
  } catch (error) {
    console.error("[QikAid] Token refresh failed:", error);
    broadcastLockUI();
    return false;
  }
}

// Set up automatic token refresh
function setupTokenRefresh() {
  // Clear existing timer
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  if (!TOKENS?.token_timestamp) {
    console.log("[QikAid] No token timestamp, skipping refresh setup");
    return;
  }

  // Check if token needs immediate refresh
  if (isTokenExpiringSoon(TOKENS.token_timestamp)) {
    console.log("[QikAid] Token expiring soon, refreshing immediately");
    refreshToken();
    return;
  }

  // Calculate time until 8 hours before expiration
  const tokenTime = parseInt(TOKENS.token_timestamp);
  const currentTime = Date.now();
  const eightHoursInMs = 8 * 60 * 60 * 1000;
  const timeUntilRefresh = (24 * 60 * 60 * 1000 - eightHoursInMs) - (currentTime - tokenTime);

  if (timeUntilRefresh > 0) {
    console.log(`[QikAid] Token refresh scheduled in ${Math.round(timeUntilRefresh / (60 * 60 * 1000))} hours`);
    
    refreshTimer = setTimeout(async () => {
      console.log("[QikAid] Scheduled token refresh triggered");
      await refreshToken();
    }, timeUntilRefresh);
  } else {
    // Token is already expiring soon, refresh immediately
    refreshToken();
  }
}

// Click the toolbar button to show/hide the UI
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Send message to content script to show UI
    const response = await chrome.tabs.sendMessage(tab.id, { 
      type: "SHOW_UI", 
      action: "toggle" 
    });
    
    if (response && response.success) {
      console.log("[QikAid] UI toggle message sent successfully");
    }
  } catch (error) {
    console.log("[QikAid] Content script not ready or error:", error);
    // Content script not available - user may need to refresh the page
  }
});

// Initialize token refresh on extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log("[QikAid] Extension startup - checking for existing tokens");
  const { QIKAID_PLUGIN_QA_TOKENS } = await chrome.storage.local.get("QIKAID_PLUGIN_QA_TOKENS");
  if (QIKAID_PLUGIN_QA_TOKENS) {
    TOKENS = QIKAID_PLUGIN_QA_TOKENS;
    setupTokenRefresh();
  }
});

// Initialize token refresh when extension is installed/enabled
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[QikAid] Extension installed - checking for existing tokens");
  const { QIKAID_PLUGIN_QA_TOKENS } = await chrome.storage.local.get("QIKAID_PLUGIN_QA_TOKENS");
  if (QIKAID_PLUGIN_QA_TOKENS) {
    TOKENS = QIKAID_PLUGIN_QA_TOKENS;
    setupTokenRefresh();
  }
});


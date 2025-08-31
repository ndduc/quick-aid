import { 
  fetchGPTResponse, sendImageToGPT,
  generateInterviewPayload, generateInterviewPayloadForScreenshotMode} from './open-ai.js';
import {
  getApiKey, getJobRole, 
  getJobSpecialy, getExtraInterviewPrompt, 
  getOpenAiModel, getWebSocketBackendUrl, saveWebSocketBackendUrl} from './config.js'
import {checkTranscript} from './transcribing-logic.js'
import {webSocketService} from './websocket-service.js'
import {autoInitializeMSTeams, getMSTeamsMonitoringStatus, testMSCaptionProcessing} from './transcribing-ms-team.js'
import {setupTeamsLiveCaptions} from './ms-find-live-captions.js'
import {createHeader, createContentArea, createOverlay, createResizer, createLeftResizer, createInputSection, createConfigBtn, createConfigModal, createDualContentLayout, createGPTContextMenu, CONTEXT_MENU_OPTIONS} from './ui.js'


let apiKey = getApiKey();

let lastLine = "";
const transcriptLog = new Set();

let aiModel = getOpenAiModel();
let jobRole = getJobRole();
let jobSpecialy = getJobSpecialy();
let extraInterviewPrompt = getExtraInterviewPrompt();

// Verify initial configuration
verifyConfiguration();

// Initialize WebSocket service and set up classification callback
setupWebSocketClassification();

// Initialize MS Teams monitoring if meeting is detected
setupMSTeamsMonitoring();


let isDragging = false, offsetX = 0, offsetY = 0;
let isMinimized = false;
let isConfigOpen = false;
let isResizing = false;
let isLeftResizing = false;


// === Overlay Container (shell) ===
const overlay = createOverlay();
document.body.appendChild(overlay);

const resizer = createResizer();
const leftResizer = createLeftResizer();
overlay.appendChild(resizer);
overlay.appendChild(leftResizer);
resizer.addEventListener("mousedown", (e) => {
  e.preventDefault();
  isResizing = true;
  document.body.style.userSelect = "none";
});

// Left resizer (bottom-left corner)
leftResizer.addEventListener("mousedown", (e) => {
  e.preventDefault();
  isResizing = true;
  isLeftResizing = true;
  document.body.style.userSelect = "none";
});

// Right resizer (bottom-right corner)
resizer.addEventListener("mousedown", (e) => {
  e.preventDefault();
  isResizing = true;
  isLeftResizing = false;
  document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;
  
  const rect = overlay.getBoundingClientRect();
  let newWidth, newHeight;
  
  if (isLeftResizing) {
    // Left resizing: adjust width from left edge and position
    const currentRight = rect.right;
    newWidth = currentRight - e.clientX;
    if (newWidth > 900) {
      overlay.style.width = `${newWidth}px`;
      overlay.style.left = `${e.clientX}px`;
    }
  } else {
    // Right resizing: adjust width from right edge
    newWidth = e.clientX - rect.left;
    if (newWidth > 900) {
      overlay.style.width = `${newWidth}px`;
    }
  }
  
  // Handle height for both cases
  newHeight = e.clientY - rect.top;
  if (newHeight > 200) {
    overlay.style.height = `${newHeight}px`;
  }
});

document.addEventListener("mouseup", () => {
  isResizing = false;
  document.body.style.userSelect = "";
});


// === Header with Minimize Button ===
const {header, minimizeBtn} = createHeader();
overlay.appendChild(header);

// Developer Feature Flag for Auto UI Management
const AUTO_UI_MANAGEMENT_ENABLED = false; // Set to false to always show UI

// Plugin UI behavior based on feature flag
if (AUTO_UI_MANAGEMENT_ENABLED) {
  // UI completely hidden by default - only shows during meetings
  overlay.style.display = "none";
  console.log("Auto UI Management ENABLED - UI hidden until meeting detected");
} else {
  // UI always visible (traditional behavior)
  overlay.style.display = "block";
  console.log("uto UI Management DISABLED - UI always visible");
}

// Add minimize functionality
minimizeBtn.addEventListener("click", () => {
  if (isMinimized) {
    // Restore the overlay
    overlay.style.height = "600px";
    overlay.style.width = "1200px";
    overlay.style.background = "white";
    overlay.style.border = "2px solid #ccc";
    overlay.style.borderRadius = "8px";
    overlay.style.boxShadow = "0 0 12px rgba(0,0,0,0.3)";
    contentContainer.style.display = "flex";
    inputSection.style.display = "flex";
    minimizeBtn.textContent = "–";
    minimizeBtn.title = "Minimize";
    isMinimized = false;
    
    // Restore overflow and scrollbars when maximized
    overlay.style.overflow = "auto";
    
    // Re-enable the global resize event listeners
    enableResizeFunctionality();
    
    // Reset header styling for restored state
    header.style.background = "#f5f5f5";
    header.style.borderRadius = "0";
    header.style.padding = "6px 10px";
    
    // Reset positioning for restored state
    overlay.style.right = "auto";
    overlay.style.left = "auto";
    overlay.style.top = "10px";
    
    // Remove extension popup styling
    removeExtensionPopup();
    
    // Disable vertical-only dragging and restore normal dragging
    disableVerticalOnlyDragging();
    
    // Show the minimize button again when restored
    minimizeBtn.style.display = "block";
  } 
  else {
    // Minimize to look like a warm yellow extension popup
    overlay.style.height = "50px";
    overlay.style.width = "80px";
    overlay.style.background = "#F9D77E";
    overlay.style.border = "1px solid #E6C25A";
    overlay.style.borderRadius = "8px";
    overlay.style.boxShadow = "0 4px 12px rgba(249, 215, 126, 0.3)";
    overlay.style.resize = "none";
    
    // Position to stick to the right side of the browser
    overlay.style.right = "20px";
    overlay.style.left = "auto";
    overlay.style.top = "100px"; // Default vertical position
    
    contentContainer.style.display = "none";
    inputSection.style.display = "none";
    minimizeBtn.textContent = "□";
    minimizeBtn.title = "Restore";
    isMinimized = true;
    
    // Completely disable resize functionality when minimized
    resizer.style.pointerEvents = "none";
    leftResizer.style.pointerEvents = "none";
    resizer.style.cursor = "default";
    leftResizer.style.cursor = "default";
    resizer.style.display = "none";
    leftResizer.style.display = "none";
    
    // Aggressively hide resize handles with CSS
    resizer.style.visibility = "hidden";
    leftResizer.style.visibility = "hidden";
    resizer.style.opacity = "0";
    leftResizer.style.opacity = "0";
    resizer.style.width = "0";
    leftResizer.style.width = "0";
    resizer.style.height = "0";
    leftResizer.style.height = "0";
    
    // Remove borders that might still be visible
    resizer.style.border = "none";
    leftResizer.style.border = "none";
    
    // Completely remove resize handles from DOM when minimized
    if (resizer.parentNode) {
      resizer.parentNode.removeChild(resizer);
    }
    if (leftResizer.parentNode) {
      leftResizer.parentNode.removeChild(leftResizer);
    }
    
    // Remove scrollbars and overflow when minimized
    overlay.style.overflow = "hidden";
    
    // Disable the global resize event listeners
    disableResizeFunctionality();
    
    // Update header styling for minimized state
    header.style.background = "#E6C25A";
    header.style.borderRadius = "8px 8px 0 0";
    header.style.padding = "8px 36px";
    
    // Create the extension popup appearance
    createExtensionPopup();
    
    // Enable vertical-only dragging for minimized state
    enableVerticalOnlyDragging();
    
    // Hide the minimize button when minimized
    minimizeBtn.style.display = "none";
  }
});

// === Scrollable Content Area ===
const {contentContainer, gptResponseArea, transcriptArea} = createDualContentLayout();
overlay.appendChild(contentContainer);

// Ensure resize functionality is initially enabled
resizer.style.pointerEvents = "auto";
leftResizer.style.pointerEvents = "auto";
resizer.style.cursor = "nw-resize";
leftResizer.style.cursor = "ne-resize";

// Left panel is now ready for GPT responses


// === Bottom Input Section ===
const {inputSection, input, askBtn, reconnectBtn, screenshotBtn, msTeamsTestBtn, statusBtn, clearDuplicatesBtn, modeStatusBtn} = createInputSection(submitCustomPrompt);
overlay.appendChild(inputSection);


askBtn.onclick = submitCustomPrompt;

reconnectBtn.onclick = async () => {
  try {
    appendToOverlay("🔄 Attempting to reconnect WebSocket...", true);
    
    // Check if WebSocket service is available
    if (webSocketService) {
      // Force disconnect if currently connected
      if (webSocketService.isConnected) {
        webSocketService.disconnect();
        appendToOverlay("🔌 Disconnected existing connection", true);
      }
      
      // Wait a moment then attempt to reconnect
      setTimeout(async () => {
        try {
          // Reset reconnection attempts for clean start
          webSocketService.reconnectAttempts = 0;
          
          // Attempt to connect
          webSocketService.connect();
          appendToOverlay("✅ WebSocket reconnection initiated!", true);
          
          // Update button appearance to show success
          reconnectBtn.style.background = "#28a745";
          reconnectBtn.textContent = "✅";
          setTimeout(() => {
            reconnectBtn.style.background = "#ffc107";
            reconnectBtn.textContent = "🔌";
          }, 2000);
          
        } catch (error) {
          console.error("WebSocket reconnection failed:", error);
          appendToOverlay("❌ WebSocket reconnection failed: " + error.message, true);
          
          // Update button appearance to show failure
          reconnectBtn.style.background = "#dc3545";
          reconnectBtn.textContent = "❌";
          setTimeout(() => {
            reconnectBtn.style.background = "#ffc107";
            reconnectBtn.textContent = "🔌";
          }, 2000);
        }
      }, 500);
      
    } else {
      appendToOverlay("❌ WebSocket service not available", true);
    }
  } catch (error) {
    console.error("Error during reconnection attempt:", error);
    appendToOverlay("❌ Reconnection error: " + error.message, true);
  }
};
msTeamsTestBtn.onclick = () => {
  testMSCaptionProcessing(appendToOverlay, updateLivePreview);
  
  // Also display in middle panel for immediate feedback
  const testText = "This is a test caption from Microsoft Teams";
  displayTranscriptInMiddlePanel(testText, "Test Speaker");
};

statusBtn.onclick = () => {
  checkWebSocketStatus();
};

clearDuplicatesBtn.onclick = () => {
  // Import and call the clear duplicates function
  import('./transcribing-ms-team.js').then(({ clearTranscriptDuplicates }) => {
    clearTranscriptDuplicates();
    appendToOverlay("🧹 Duplicates cleared from transcript and middle panel", true);
  }).catch(err => {
    console.error('Failed to import clearTranscriptDuplicates:', err);
    appendToOverlay("❌ Failed to clear duplicates", true);
  });
};

modeStatusBtn.onclick = () => {
  // Import and call the mode status function
  import('./transcribing-ms-team.js').then(({ displayTranscriptionModeStatus }) => {
    const statusText = displayTranscriptionModeStatus();
    appendToOverlay(statusText, true);
  }).catch(err => {
    console.error('Failed to import displayTranscriptionModeStatus:', err);
    appendToOverlay("❌ Failed to get mode status", true);
  });
};
// input.addEventListener("keydown", (e) => {
//   if (e.key === "Enter") submitCustomPrompt();
// });

// Removed duplicate line

// === SCREENSHOT Button Logic ===
inputSection.appendChild(screenshotBtn);

// === Minimize toggle logic ===
// minimizeBtn.onclick = () => {
//   isMinimized = !isMinimized;
//   contentArea.style.display = isMinimized ? "none" : "block";
//   minimizeBtn.textContent = isMinimized ? "+" : "–";
// };

// === Drag functionality ===
header.addEventListener("mousedown", (e) => {
  isDragging = true;
  const rect = overlay.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    overlay.style.left = `${e.clientX - offsetX}px`;
    overlay.style.top = `${e.clientY - offsetY}px`;
    overlay.style.right = "auto"; // remove fixed right positioning
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});


// === Check for New Transcript Lines ===
setInterval(() => checkTranscript(transcriptLog, appendToOverlay, updateLivePreview), 1000);

// === Right-click Context Menu for GPT ===
document.addEventListener("contextmenu", (e) => {
  const selection = window.getSelection().toString().trim();
  if (selection.length === 0) return;


  const options = CONTEXT_MENU_OPTIONS;


  const onOptionClick = async (prefix, label) => {
    const prompt = prefix + selection;
    appendToOverlay(`➡️ You: ${prompt}`, false); // User input goes to right panel
    appendToOverlay("AI Response: ...thinking", true); // GPT thinking goes to left panel
    const reply = await fetchGPTResponse(
      prompt, 
      generateInterviewPayload(
        jobRole, jobSpecialy, extraInterviewPrompt),
        apiKey,
        aiModel
    );
    document.querySelectorAll(".gpt-response").forEach((el) => {
      if (el.textContent === "AI Response: ...thinking") el.remove();
    });
    appendToOverlay(reply, true); // GPT response goes to left panel
    menu.remove();
  };

  const menu = createGPTContextMenu(e, options, onOptionClick);

  document.body.appendChild(menu);

  // Close menu on outside click
  setTimeout(() => {
    document.addEventListener("click", () => menu.remove(), { once: true });
  }, 10);

  e.preventDefault();
});

screenshotBtn.onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { mediaSource: "screen" }
    });
    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const bitmap = await imageCapture.grabFrame();

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    track.stop();

    const dataUrl = canvas.toDataURL("image/png");
    appendImageToOverlay(dataUrl);

    // Send to GPT
    appendToOverlay("🧠 GPT: ...analyzing image", true); // GPT thinking goes to left panel
    const reply = await sendImageToGPT(
      dataUrl, 
      generateInterviewPayloadForScreenshotMode(
      jobRole, jobSpecialy, 
      extraInterviewPrompt),
      apiKey,
      aiModel
    );
    document.querySelectorAll(".gpt-response").forEach((el) => {
      if (el.textContent === "🧠 GPT: ...analyzing image") el.remove();
    });
    appendToOverlay(reply, true); // GPT response goes to left panel
  } catch (err) {
    console.error("Screenshot failed:", err);
    appendToOverlay("⚠️ Failed to capture screenshot.");
  }
};

const configBtn = createConfigBtn();
header.appendChild(configBtn);

const {
   configModal, apiKeyInput, 
   saveConfigBtn,
   openaiModelInput, jobRoleInput, 
   specificInterviewInput, extraInteviewPromptInput, websocketUrlInput
  } = createConfigModal(apiKey, aiModel, jobRole, jobSpecialy, extraInterviewPrompt, getWebSocketBackendUrl());
document.body.appendChild(configModal);

configBtn.onclick = () => {
  isConfigOpen = !isConfigOpen;
  if (isConfigOpen) {
    // Refresh config values from localStorage when opening
    refreshConfigValues();
    configModal.style.display = "block";
  } else {
    configModal.style.display = "none";
  }
};

// Function to refresh configuration values from localStorage
function refreshConfigValues() {
  // Reload values from localStorage
  apiKey = getApiKey();
  aiModel = getOpenAiModel();
  jobRole = getJobRole();
  jobSpecialy = getJobSpecialy();
  extraInterviewPrompt = getExtraInterviewPrompt();
  
  // Update input fields with current values
  apiKeyInput.value = apiKey;
  openaiModelInput.value = aiModel;
  jobRoleInput.value = jobRole;
  specificInterviewInput.value = jobSpecialy;
  extraInteviewPromptInput.value = extraInterviewPrompt;
  websocketUrlInput.value = getWebSocketBackendUrl();
  
  console.log("Config refreshed:", { apiKey, aiModel, jobRole, jobSpecialy, extraInterviewPrompt });
}

// Function to verify configuration is properly loaded
function verifyConfiguration() {
  // console.log("=== Configuration Verification ===");
  // console.log("API Key:", apiKey ? "Set (" + apiKey.substring(0, 10) + "...)" : "Not set");
  // console.log("AI Model:", aiModel);
  // console.log("Job Role:", jobRole);
  // console.log("Job Specialty:", jobSpecialy);
  // console.log("Extra Prompt:", extraInterviewPrompt);
  // console.log("================================");
}

// Function to setup WebSocket classification handling
function setupWebSocketClassification() {
  // Set callback for when classification results are received
  webSocketService.setClassificationCallback((result) => {
    displayClassificationResult(result);
  });

  // Set callback for when meeting status changes
  webSocketService.setMeetingStatusCallback((isInMeeting, sessionId) => {
    displayMeetingStatus(isInMeeting, sessionId);
  });

  // Log WebSocket connection status
  console.log('WebSocket status:', webSocketService.getConnectionStatus());
}

// Function to setup MS Teams monitoring
function setupMSTeamsMonitoring() {
  // Try to auto-detect and initialize MS Teams monitoring
  const teamsInitialized = autoInitializeMSTeams(appendToOverlay, updateLivePreview);
  
  if (teamsInitialized) {
    
    // Log monitoring status
    const status = getMSTeamsMonitoringStatus();
    
    // Update status indicator
    updateMSTeamsStatus(true);
  } else {
    
    // Set up periodic detection for when user joins a Teams meeting
    setInterval(() => {
      if (!getMSTeamsMonitoringStatus().isMonitoring) {
        const detected = autoInitializeMSTeams(appendToOverlay, updateLivePreview);
        if (detected) {
          updateMSTeamsStatus(true);
        }
      }
    }, 10000); // Check every 10 seconds
    
    // Update status indicator every 5 seconds
    setInterval(() => {
      const status = getMSTeamsMonitoringStatus();
      updateMSTeamsStatus(status.isMonitoring);
    }, 5000);
    
    // Check WebSocket status and show offline transcript data every 10 seconds
    setInterval(() => {
      const wsStatus = webSocketService.getConnectionStatus();
      if (!wsStatus.isConnected) {
        // WebSocket is offline, show a status message in middle panel
        const blankPanel = document.getElementById('blank-panel');
        if (blankPanel && blankPanel.children.length === 0) {
          const offlineMsg = document.createElement('div');
          offlineMsg.style.cssText = `
            padding: 16px;
            margin: 16px;
            text-align: center;
            color: #6c757d;
            font-style: italic;
            background: #f8f9fa;
            border-radius: 8px;
            border: 2px dashed #dee2e6;
          `;
          offlineMsg.innerHTML = `
            <div style="font-size: 16px; margin-bottom: 8px;">🔌 WebSocket Offline</div>
            <div style="font-size: 12px;">Transcript data will appear here when connection is restored</div>
            <div style="font-size: 10px; margin-top: 8px;">Click 🔌 button to check status</div>
          `;
          blankPanel.appendChild(offlineMsg);
        }
      }
    }, 10000);
  }
}

// Function to update MS Teams status indicator
function updateMSTeamsStatus(isActive) {
  if (!msTeamsStatus) return;
  
  if (isActive) {
    msTeamsStatus.textContent = "🎯";
    msTeamsStatus.title = "MS Teams: Active & Monitoring";
    msTeamsStatus.style.color = "#28a745"; // Green
  } else {
    msTeamsStatus.textContent = "🎯";
    msTeamsStatus.title = "MS Teams: Not Detected";
    msTeamsStatus.style.color = "#6c757d"; // Gray
  }
}

// Function to display classification results in the middle panel
function displayClassificationResult(result) {
  const blankPanel = document.getElementById('blank-panel');
  if (!blankPanel) return;

  const { transcriptId, aiAnswer, classification, confidence, suggestions } = result;
  
  // Create classification result element
  const resultElement = document.createElement('div');
  resultElement.style.cssText = `
    padding: 8px;
    margin: 4px 0;
    border-left: 4px solid #007bff;
    background: #f8f9fa;
    border-radius: 4px;
    font-size: 12px;
  `;

  // Format confidence as percentage
  const confidencePercent = (confidence * 100).toFixed(1);
  
  // Create the result content
  resultElement.innerHTML = `
    <div style="font-weight: bold; color: #007bff; margin-bottom: 4px;">
      🏷️ ${classification} (${confidencePercent}%)
    </div>
    <div style="color: #666; margin-bottom: 4px; font-style: italic;">
      "${aiAnswer.length > 60 ? aiAnswer.substring(0, 60) + '...' : aiAnswer}"
    </div>
    ${suggestions && suggestions.length > 0 ? `
      <div style="margin-top: 4px;">
        <strong>Suggestions:</strong>
        <ul style="margin: 2px 0; padding-left: 16px;">
          ${suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
        </ul>
      </div>
    ` : ''}
    <div style="font-size: 10px; color: #999; margin-top: 4px;">
      ID: ${transcriptId}
    </div>
  `;

  // Add to the top of the blank panel
  blankPanel.insertBefore(resultElement, blankPanel.firstChild);
  
  // Limit the number of results to prevent overflow
  const maxResults = 20;
  while (blankPanel.children.length > maxResults) {
    blankPanel.removeChild(blankPanel.lastChild);
  }

  // Scroll to top to show latest result
  blankPanel.scrollTop = 0;
}

// Function to display transcript data in middle panel (fallback when WebSocket not connected)
function displayTranscriptInMiddlePanel(text, author = 'Unknown Speaker') {
  // Make function globally available for other modules
  window.displayTranscriptInMiddlePanel = displayTranscriptInMiddlePanel;
  const blankPanel = document.getElementById('blank-panel');
  if (!blankPanel) return;

  // Create transcript display element
  const transcriptElement = document.createElement('div');
  transcriptElement.style.cssText = `
    padding: 8px;
    margin: 4px 0;
    border-left: 4px solid #6c757d;
    background: #f8f9fa;
    border-radius: 4px;
    font-size: 12px;
  `;

  // Create the transcript content
  transcriptElement.innerHTML = `
    <div style="font-weight: bold; color: #6c757d; margin-bottom: 4px;">
      📝 Transcript (WebSocket Offline)
    </div>
    <div style="color: #666; margin-bottom: 4px; font-style: italic;">
      <strong>${author}:</strong> "${text.length > 60 ? text.substring(0, 60) + '...' : text}"
    </div>
    <div style="font-size: 10px; color: #999; margin-top: 4px;">
      Timestamp: ${new Date().toLocaleTimeString()}
    </div>
  `;

  // Add to the top of the blank panel
  blankPanel.insertBefore(transcriptElement, blankPanel.firstChild);
  
  // Limit the number of results to prevent overflow
  const maxResults = 20;
  while (blankPanel.children.length > maxResults) {
    blankPanel.removeChild(blankPanel.lastChild);
  }

  // Scroll to top to show latest result
  blankPanel.scrollTop = 0;
}

// Function to check WebSocket status and display comprehensive information
function checkWebSocketStatus() {
  const wsStatus = webSocketService.getConnectionStatus();
  
  const statusInfo = `
WebSocket Status:
Connection: ${wsStatus.isConnected ? 'Connected' : 'Disconnected'}
Ready State: ${wsStatus.readyState}
Reconnect Attempts: ${wsStatus.reconnectAttempts}

Meeting Status:
In Meeting: ${wsStatus.meetingStatus.isInMeeting ? 'Yes' : 'No'}
Session ID: ${wsStatus.meetingStatus.sessionId || 'None'}
  `.trim();
  
  appendToOverlay(statusInfo, true);
  
  // Also log to console for debugging
  console.log('🔌 WebSocket Status Check:', wsStatus);
}

// Function to display meeting status changes
function displayMeetingStatus(isInMeeting, sessionId = null) {
  const statusText = isInMeeting 
    ? `Teams Meeting Started - Session: ${sessionId?.substring(0, 8)}...`
    : '⏹Teams Meeting Ended - Session Closed';
    
  appendToOverlay(statusText, true);
  
  // Update status button if available
  if (statusBtn) {
    statusBtn.textContent = isInMeeting ? "🎯" : "⏹️";
    statusBtn.title = isInMeeting ? `Active Meeting - ${sessionId?.substring(0, 8)}...` : "No Active Meeting";
    statusBtn.style.background = isInMeeting ? "#28a745" : "#6c757d";
  }
  
  // Automatically show/hide plugin UI based on meeting status (if feature flag enabled)
  if (AUTO_UI_MANAGEMENT_ENABLED) {
    if (isInMeeting) {
      // Meeting started - show plugin UI
      overlay.style.display = "block";
      
      // Automatically setup live captions for the meeting
      setupTeamsLiveCaptions();
    } else {
      // Meeting ended - hide plugin UI completely
      overlay.style.display = "none";
    }
  } else {
    // Feature flag disabled - UI state unchanged
    console.log("Auto UI management disabled - UI state unchanged");
  }
}









saveConfigBtn.onclick = () => {
  try {
    // Save API Key
    const key = apiKeyInput.value.trim();
    if (key) {
      apiKey = key;
      localStorage.setItem("openaiApiKey", key);
    }

    // Save AI model
    const newAiModel = openaiModelInput.value.trim();
    if (newAiModel) {
      aiModel = newAiModel; // Update global variable
      localStorage.setItem("openaiModel", newAiModel);
    }

    // Save job role
    const newJobRole = jobRoleInput.value.trim();
    if (newJobRole) {
      jobRole = newJobRole; // Update global variable
      localStorage.setItem("jobRole", newJobRole);
    }

    // Save job specialty
    const newJobSpecialy = specificInterviewInput.value.trim();
    if (newJobSpecialy) {
      jobSpecialy = newJobSpecialy; // Update global variable
      localStorage.setItem("jobSpecialy", newJobSpecialy);
    }

    // Save extra interview prompt
    const newExtraInterviewPrompt = extraInteviewPromptInput.value.trim();
    if (newExtraInterviewPrompt) {
      extraInterviewPrompt = newExtraInterviewPrompt; // Update global variable
      localStorage.setItem("extraInterviewPrompt", newExtraInterviewPrompt);
    }

    // Save WebSocket backend URL
    const newWebSocketUrl = websocketUrlInput.value.trim();
    if (newWebSocketUrl) {
      saveWebSocketBackendUrl(newWebSocketUrl);
      // Update WebSocket service with new URL
      webSocketService.updateBackendUrl(newWebSocketUrl);
    }

    // Close config modal after saving
    isConfigOpen = false;
    configModal.style.display = "none";
    
    // Verify the new configuration
    verifyConfiguration();
    
    appendToOverlay("✅ Config saved and applied! Model: " + aiModel);
  } catch (e) {
    appendToOverlay("❌ Error saving config: " + e.message);
    console.error(e);
  }
};

// === Ask Button Logic ===
function submitCustomPrompt() {
  const value = "Briefly explain this and provide some basic use case (dont go to much into detail). Make it sound natural and appropriate for a software engineering interview: " + input.value.trim();
  if (!value) return;
  appendToOverlay(`➡️ You: ${value}`, false); // User input goes to right panel
  appendToOverlay("🧠 GPT: ...thinking", true); // GPT thinking goes to left panel
  input.value = "";
  fetchGPTResponse(value, generateInterviewPayload(
    jobRole, jobSpecialy, 
    extraInterviewPrompt),
    apiKey,
    aiModel
  ).then(reply => {
    document.querySelectorAll(".gpt-response").forEach((el) => {
      if (el.textContent === "🧠 GPT: ...thinking") el.remove();
    });
    appendToOverlay(reply, true); // GPT response goes to left panel
  });
}



function appendImageToOverlay(dataUrl) {
  const img = document.createElement("img");
  img.src = dataUrl;
  img.style.cssText = "max-width: 100%; margin: 8px 0; border: 1px solid #ccc;";
  gptResponseArea.appendChild(img);
  gptResponseArea.scrollTop = gptResponseArea.scrollHeight;
}




let livePreviewElement = null;
let livePreviewTimeout = null;
let lastLivePreviewText = '';

// function updateLivePreview(text) {
//   if (!livePreviewElement) {
//     livePreviewElement = document.createElement("div");
//     livePreviewElement.style.cssText = "margin-top: 10px; opacity: 0.6; font-style: italic;";
//     contentArea.appendChild(livePreviewElement);
//   }

//   livePreviewElement.textContent = text;
//   contentArea.scrollTop = contentArea.scrollHeight;
// }
function updateLivePreview(text) {
  // Check if this text is already present in the transcript area
  if (isDuplicateText(text)) {
    return;
  }

  if (!livePreviewElement) {
    livePreviewElement = document.createElement("div");
    livePreviewElement.style.cssText = `
      margin-top: 10px;
      opacity: 0.6;
      font-style: italic;
      color: #444;
    `;
  }

  // Clear any existing timeout
  if (livePreviewTimeout) {
    clearTimeout(livePreviewTimeout);
  }

  // Update the live preview text
  livePreviewElement.textContent = text;
  lastLivePreviewText = text;

  // Move it to the bottom of the transcript area (right panel)
  transcriptArea.appendChild(livePreviewElement);
  transcriptArea.scrollTop = transcriptArea.scrollHeight;

  // Set a new timeout to finalize the text after 5 seconds of inactivity
  livePreviewTimeout = setTimeout(() => {
    finalizeLivePreview();
  }, 5000); // 5 seconds
}

function finalizeLivePreview() {
  if (livePreviewElement && lastLivePreviewText.trim()) {
    
    // Create a finalized transcript entry
    const finalizedEntry = document.createElement("div");
    finalizedEntry.textContent = lastLivePreviewText;
    finalizedEntry.style.cssText = `
      margin-top: 10px;
      padding: 8px;
      background: #f8f9fa;
      border-left: 3px solid #28a745;
      border-radius: 4px;
      font-weight: normal;
      opacity: 1;
      font-style: normal;
    `;
    finalizedEntry.className = "transcript-line finalized-transcript";

    // Replace the live preview with the finalized entry
    if (livePreviewElement.parentNode) {
      livePreviewElement.parentNode.replaceChild(finalizedEntry, livePreviewElement);
    }

    // Send finalized text to WebSocket for processing
    try {
      console.log("WebSocket service available:", !!webSocketService);
      if (webSocketService) {
        console.log("WebSocket connection status:", webSocketService.getConnectionStatus());
        
        if (webSocketService.isConnected) {
          const transcriptId = Date.now().toString();
          const timestamp = new Date().toISOString();
          webSocketService.sendTranscriptForClassification(transcriptId, lastLivePreviewText, timestamp);
          console.log("Finalized idle text sent to WebSocket:", lastLivePreviewText.substring(0, 50) + "...");
        } else {
          console.warn("WebSocket not connected, attempting to send anyway (may be queued)");
          
          // Try to send anyway - the service might queue it
          const transcriptId = Date.now().toString();
          const timestamp = new Date().toISOString();
          webSocketService.sendTranscriptForClassification(transcriptId, lastLivePreviewText, timestamp);
          console.log("Finalized text queued for later transmission:", lastLivePreviewText.substring(0, 50) + "...");
        }
      } else {
        console.error("WebSocket service not available");
      }
    } catch (error) {
      console.error("Error sending finalized text to WebSocket:", error);
    }

    // Reset the live preview
    livePreviewElement = null;
    lastLivePreviewText = '';
    
    // Scroll to bottom to show the finalized text
    transcriptArea.scrollTop = transcriptArea.scrollHeight;
  }
}

// Check if text is already present in the transcript area
function isDuplicateText(text) {
  if (!text || !text.trim()) return false;
  
  const transcriptLines = transcriptArea.querySelectorAll('.transcript-line, .finalized-transcript');
  
  for (const line of transcriptLines) {
    const lineText = line.textContent.trim();
    // Check for exact match or if the new text is contained within existing text
    if (lineText === text.trim() || lineText.includes(text.trim()) || text.trim().includes(lineText)) {
      return true;
    }
  }
  
  return false;
}

function appendToOverlay(text, isGPT = false) {
  // GPT responses go to left panel, transcript goes to right panel
  const targetArea = isGPT ? gptResponseArea : transcriptArea;
  
  // Check for duplicates only for transcript text (not GPT responses)
  if (!isGPT && isDuplicateText(text)) {
    return;
  }
  
  
  const isAtBottom =
    targetArea.scrollHeight - targetArea.scrollTop <= targetArea.clientHeight + 20;

  const p = document.createElement("div");
  p.textContent = isGPT ? `AI Response: ${text}` : text;
  p.style.marginBottom = "8px";
  p.style.cursor = "text";
  p.style.userSelect = "text";
  p.style.webkitUserSelect = "text";
  p.className = isGPT ? "gpt-response" : "transcript-line";

  targetArea.appendChild(p);

  // Only scroll to bottom if user hasn't scrolled up
  if (isAtBottom) {
    targetArea.scrollTop = targetArea.scrollHeight;
  }
}

// Function to create the extension popup appearance (like the blue popup in the screenshot)
function createExtensionPopup() {
  // Remove existing popup styling if any
  removeExtensionPopup();
  
  // Create popup content container
  const popupContainer = document.createElement("div");
  popupContainer.id = "extension-popup";
  popupContainer.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    padding: 0 12px;
  `;
  
  // Create left side with just the QuickAid icon
  const leftSide = document.createElement("div");
  leftSide.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  `;
  
  // Create QuickAid icon using the actual image
  const quickAidIcon = document.createElement("img");
  
  // Get the correct extension URL for the image
  let iconSrc = "";
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      iconSrc = chrome.runtime.getURL("assets/QuickAid Icon.png");
    } else {
      // Fallback for development or when chrome API is not available
      iconSrc = "assets/QuickAid Icon.png";
    }
  } catch (error) {
    console.log("Chrome API not available, using fallback path:", error);
    iconSrc = "assets/QuickAid Icon.png";
  }
  
  quickAidIcon.src = iconSrc;
  quickAidIcon.title = "QuickAid";
  quickAidIcon.style.cssText = `
    width: 32px;
    height: 32px;
    object-fit: contain;
    filter: brightness(0) invert(1); /* Make the icon white */
  `;
  
  // Debug logging
  console.log("QuickAid icon source:", iconSrc);
  console.log("Chrome runtime available:", typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL);
  
  // Add error handling for the image
  quickAidIcon.onerror = () => {
    console.error("Failed to load QuickAid icon:", iconSrc);
    // Fallback to text icon if image fails to load
    quickAidIcon.style.display = "none";
    const fallbackIcon = document.createElement("div");
    fallbackIcon.innerHTML = "⚡";
    fallbackIcon.style.cssText = `
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      cursor: pointer;
      transition: transform 0.2s ease;
    `;
    
    // Add click handler to the fallback icon to restore the interface
    fallbackIcon.addEventListener("click", () => {
      // Trigger the minimize button click to restore
      minimizeBtn.click();
    });
    
    // Add hover effects to the fallback icon
    fallbackIcon.addEventListener("mouseenter", () => {
      fallbackIcon.style.transform = "scale(1.1)";
    });
    
    fallbackIcon.addEventListener("mouseleave", () => {
      fallbackIcon.style.transform = "scale(1)";
    });
    
    quickAidIcon.parentNode.insertBefore(fallbackIcon, quickAidIcon);
  };
  
  // Add success logging
  quickAidIcon.onload = () => {
    console.log("QuickAid icon loaded successfully:", iconSrc);
  };
  
  // Assemble the popup
  leftSide.appendChild(quickAidIcon);
  
  popupContainer.appendChild(leftSide);
  
  // Add click handler to the QuickAid icon to restore the interface
  quickAidIcon.addEventListener("click", () => {
    // Trigger the minimize button click to restore
    minimizeBtn.click();
  });
  
  // Make the icon look clickable
  quickAidIcon.style.cursor = "pointer";
  quickAidIcon.style.transition = "transform 0.2s ease";
  
  // Add hover effects
  quickAidIcon.addEventListener("mouseenter", () => {
    quickAidIcon.style.transform = "scale(1.1)";
  });
  
  quickAidIcon.addEventListener("mouseleave", () => {
    quickAidIcon.style.transform = "scale(1)";
  });
  
  // Add the popup to the header
  header.appendChild(popupContainer);
  
  // Create X close button
  const closeButton = document.createElement("div");
  closeButton.innerHTML = "×";
  closeButton.style.cssText = `
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(242, 83, 88, 255);
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    user-select: none;
    transition: all 0.2s ease;
  `;
  
  // Add hover effects to close button
  closeButton.addEventListener("mouseenter", () => {
    // closeButton.style.color = "rgba(255, 255, 255, 1)";
    closeButton.style.transform = "translateY(-50%) scale(1.1)";
  });
  
  closeButton.addEventListener("mouseleave", () => {
    // closeButton.style.color = "rgba(255, 255, 255, 0.8)";
    closeButton.style.transform = "translateY(-50%) scale(1)";
  });
  
  // Add click handler for close button - hide entire UI
  closeButton.addEventListener("click", () => {
    // Hide the entire overlay but keep background logic running
    overlay.style.display = "none";
    
    // Set a flag to indicate UI is hidden
    window.isUIHidden = true;
    
    console.log("UI hidden - background logic continues running");
  });
  
  // Create simple vertical line on the left side
  const verticalLine = document.createElement("div");
  verticalLine.style.cssText = `
    position: absolute;
    left: 24px;
    top: 50%;
    transform: translateY(-50%);
    width: 2px;
    height: 60px;
    background:rgb(255, 227, 149);
    border-radius: 1px;
  `;
  
  // Add close button and vertical line to the popup container
  popupContainer.appendChild(closeButton);
  popupContainer.appendChild(verticalLine);
  
  // Hide the original title and buttons when minimized
  const titleContainer = header.querySelector("div");
  if (titleContainer) titleContainer.style.display = "none";
  
  const msTeamsStatus = document.getElementById("ms-teams-status");
  if (msTeamsStatus) msTeamsStatus.style.display = "none";
  
  const configBtnInHeader = header.querySelector("button[title*='Configure']");
  if (configBtnInHeader) configBtnInHeader.style.display = "none";
}

// Function to remove extension popup styling
function removeExtensionPopup() {
  const popupContainer = document.getElementById("extension-popup");
  if (popupContainer) {
    popupContainer.remove();
  }
  
  // Restore original header elements
  const titleContainer = header.querySelector("div");
  if (titleContainer) titleContainer.style.display = "flex";
  
  const msTeamsStatus = document.getElementById("ms-teams-status");
  if (msTeamsStatus) msTeamsStatus.style.display = "block";
  
  const configBtnInHeader = header.querySelector("button[title*='Configure']");
  if (configBtnInHeader) configBtnInHeader.style.display = "block";
}

// Function to enable vertical-only dragging for minimized state
function enableVerticalOnlyDragging() {
  // Store original drag event listeners
  if (!window.originalDragHandlers) {
    window.originalDragHandlers = {
      mousedown: header.onmousedown,
      mousemove: document.onmousemove,
      mouseup: document.onmouseup
    };
  }
  
  // Completely remove original drag functionality
  header.onmousedown = null;
  document.onmousemove = null;
  document.onmouseup = null;
  
  // Add vertical-only drag functionality
  let isVerticalDragging = false;
  let startY = 0;
  let startTop = 0;
  
  header.onmousedown = (e) => {
    isVerticalDragging = true;
    startY = e.clientY;
    startTop = parseInt(overlay.style.top) || 100;
    document.body.style.userSelect = "none";
    e.preventDefault();
  };
  
  document.onmousemove = (e) => {
    if (!isVerticalDragging) return;
    
    const deltaY = e.clientY - startY;
    const newTop = Math.max(0, Math.min(window.innerHeight - 50, startTop + deltaY));
    
    // Force the popup to stay on the right side
    overlay.style.top = `${newTop}px`;
    overlay.style.right = "20px";
    overlay.style.left = "auto";
  };
  
  document.onmouseup = () => {
    isVerticalDragging = false;
    document.body.style.userSelect = "";
    
    // Ensure it's still positioned correctly after dragging
    overlay.style.right = "20px";
    overlay.style.left = "auto";
  };
  
  // Set up a periodic check to ensure the popup stays on the right side
  if (window.positionCheckInterval) {
    clearInterval(window.positionCheckInterval);
  }
  
  window.positionCheckInterval = setInterval(() => {
    if (isMinimized) {
      overlay.style.right = "20px";
      overlay.style.left = "auto";
    }
  }, 100); // Check every 100ms
}

// Function to disable vertical-only dragging and restore normal dragging
function disableVerticalOnlyDragging() {
  // Restore original drag functionality
  if (window.originalDragHandlers) {
    header.onmousedown = window.originalDragHandlers.mousedown;
    document.onmousemove = window.originalDragHandlers.mousemove;
    document.onmouseup = window.originalDragHandlers.mouseup;
    
    // Clear stored handlers
    delete window.originalDragHandlers;
  }
  
  // Clear the position check interval
  if (window.positionCheckInterval) {
    clearInterval(window.positionCheckInterval);
    delete window.positionCheckInterval;
  }
}

// Function to disable resize functionality
function disableResizeFunctionality() {
  // Store original resize event listeners if not already stored
  if (!window.originalResizeHandlers) {
    window.originalResizeHandlers = {
      resizerMousedown: resizer.onmousedown,
      leftResizerMousedown: leftResizer.onmousedown,
      documentMousemove: document.onmousemove,
      documentMouseup: document.onmouseup
    };
  }
  
  // Remove all resize event listeners
  resizer.onmousedown = null;
  leftResizer.onmousedown = null;
  
  // Also disable the global resize event listeners
  if (window.isResizing !== undefined) {
    window.isResizing = false;
  }
  if (window.isLeftResizing !== undefined) {
    window.isLeftResizing = false;
  }
  
  // Completely remove resize handles from DOM when minimized
  if (resizer.parentNode) {
    resizer.parentNode.removeChild(resizer);
  }
  if (leftResizer.parentNode) {
    leftResizer.parentNode.removeChild(leftResizer);
  }
}

// Function to enable resize functionality
function enableResizeFunctionality() {
  // Recreate resize handles if they were removed
  if (!resizer.parentNode) {
    overlay.appendChild(resizer);
    // Restore original styles
    resizer.style.cssText = `
      width: 14px;
      height: 14px;
      background: transparent;
      border-right: 2px solid #aaa;
      border-bottom: 2px solid #aaa;
      position: absolute;
      right: 0;
      bottom: 0;
      cursor: se-resize;
    `;
  }
  if (!leftResizer.parentNode) {
    overlay.appendChild(leftResizer);
    // Restore original styles
    leftResizer.style.cssText = `
      width: 14px;
      height: 14px;
      background: transparent;
      border-left: 2px solid #aaa;
      border-bottom: 2px solid #aaa;
      position: absolute;
      left: 0;
      bottom: 0;
      cursor: sw-resize;
    `;
  }
  
  // Restore original resize event listeners
  if (window.originalResizeHandlers) {
    resizer.onmousedown = window.originalResizeHandlers.resizerMousedown;
    leftResizer.onmousedown = window.originalResizeHandlers.leftResizerMousedown;
    
    // Clear stored handlers
    delete window.originalResizeHandlers;
  }
}

// Function to show the UI again (called when extension icon is clicked)
function showUI() {
  if (window.isUIHidden) {
    // Show the overlay again
    overlay.style.display = "block";
    
    // Reset the hidden flag
    window.isUIHidden = false;
    
    console.log("UI restored from extension icon click");
  }
}

// Make the function globally available for background script communication
window.showUI = showUI;

// Listen for messages from background script to show/hide UI
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SHOW_UI") {
    if (message.action === "toggle") {
      if (window.isUIHidden) {
        // Show the UI
        showUI();
        sendResponse({ success: true, action: "shown" });
      } else {
        // Hide the UI (if not already hidden)
        overlay.style.display = "none";
        window.isUIHidden = true;
        sendResponse({ success: true, action: "hidden" });
      }
    }
    return true; // Keep the message channel open for async response
  }
});

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
const AUTO_UI_MANAGEMENT_ENABLED = true; // Set to false to always show UI

// Plugin UI behavior based on feature flag
if (AUTO_UI_MANAGEMENT_ENABLED) {
  // UI completely hidden by default - only shows during meetings
  overlay.style.display = "none";
  console.log("🎯 Interview Assistant started - Auto UI Management ENABLED - UI hidden until meeting detected");
} else {
  // UI always visible (traditional behavior)
  overlay.style.display = "block";
  console.log("🎯 Interview Assistant started - Auto UI Management DISABLED - UI always visible");
}

// Add minimize functionality
minimizeBtn.addEventListener("click", () => {
  if (isMinimized) {
    // Restore the overlay
    overlay.style.height = "600px";
    overlay.style.width = "1200px";
    contentContainer.style.display = "flex";
    inputSection.style.display = "flex";
    minimizeBtn.textContent = "–";
    minimizeBtn.title = "Minimize";
    isMinimized = false;
    
    // Re-enable resize functionality
    resizer.style.pointerEvents = "auto";
    leftResizer.style.pointerEvents = "auto";
    resizer.style.cursor = "nw-resize";
    leftResizer.style.cursor = "ne-resize";
    
    console.log("🔍 Interview Assistant restored");
  } else {
    // Minimize the overlay
    overlay.style.height = "40px";
    overlay.style.width = "300px";
    contentContainer.style.display = "none";
    inputSection.style.display = "none";
    minimizeBtn.textContent = "□";
    minimizeBtn.title = "Restore";
    isMinimized = true;
    
    // Disable resize functionality when minimized
    resizer.style.pointerEvents = "none";
    leftResizer.style.pointerEvents = "none";
    resizer.style.cursor = "default";
    leftResizer.style.cursor = "default";
    
    console.log("🔍 Interview Assistant minimized");
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
const {inputSection, input, askBtn, screenshotBtn, msTeamsTestBtn, statusBtn, clearDuplicatesBtn, modeStatusBtn} = createInputSection(submitCustomPrompt);
overlay.appendChild(inputSection);


askBtn.onclick = submitCustomPrompt;
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
    appendToOverlay("🧠 GPT: ...thinking", true); // GPT thinking goes to left panel
    const reply = await fetchGPTResponse(
      prompt, 
      generateInterviewPayload(
        jobRole, jobSpecialy, extraInterviewPrompt),
        apiKey,
        aiModel
    );
    document.querySelectorAll(".gpt-response").forEach((el) => {
      if (el.textContent === "🧠 GPT: ...thinking") el.remove();
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
  console.log("=== Configuration Verification ===");
  console.log("API Key:", apiKey ? "Set (" + apiKey.substring(0, 10) + "...)" : "Not set");
  console.log("AI Model:", aiModel);
  console.log("Job Role:", jobRole);
  console.log("Job Specialty:", jobSpecialy);
  console.log("Extra Prompt:", extraInterviewPrompt);
  console.log("================================");
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
  console.log('🔌 WebSocket status:', webSocketService.getConnectionStatus());
}

// Function to setup MS Teams monitoring
function setupMSTeamsMonitoring() {
  // Try to auto-detect and initialize MS Teams monitoring
  const teamsInitialized = autoInitializeMSTeams(appendToOverlay, updateLivePreview);
  
  if (teamsInitialized) {
    console.log('🎯 MS Teams monitoring initialized successfully');
    
    // Log monitoring status
    const status = getMSTeamsMonitoringStatus();
    console.log('📊 MS Teams monitoring status:', status);
    
    // Update status indicator
    updateMSTeamsStatus(true);
  } else {
    console.log('ℹ️ MS Teams meeting not detected - monitoring will start when meeting is detected');
    
    // Set up periodic detection for when user joins a Teams meeting
    setInterval(() => {
      if (!getMSTeamsMonitoringStatus().isMonitoring) {
        const detected = autoInitializeMSTeams(appendToOverlay, updateLivePreview);
        if (detected) {
          console.log('🎯 MS Teams meeting detected and monitoring started');
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
🔌 WebSocket Status:
📡 Connection: ${wsStatus.isConnected ? '✅ Connected' : '❌ Disconnected'}
🔄 Ready State: ${wsStatus.readyState}
🔄 Reconnect Attempts: ${wsStatus.reconnectAttempts}

🎯 Meeting Status:
📅 In Meeting: ${wsStatus.meetingStatus.isInMeeting ? '✅ Yes' : '❌ No'}
🆔 Session ID: ${wsStatus.meetingStatus.sessionId || 'None'}
  `.trim();
  
  appendToOverlay(statusInfo, true);
  
  // Also log to console for debugging
  console.log('🔌 WebSocket Status Check:', wsStatus);
}

// Function to display meeting status changes
function displayMeetingStatus(isInMeeting, sessionId = null) {
  const statusText = isInMeeting 
    ? `🎯 Teams Meeting Started - Session: ${sessionId?.substring(0, 8)}...`
    : '⏹️ Teams Meeting Ended - Session Closed';
    
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
      console.log("🎯 Plugin UI shown for meeting");
      
      // Automatically setup live captions for the meeting
      setupTeamsLiveCaptions();
    } else {
      // Meeting ended - hide plugin UI completely
      overlay.style.display = "none";
      console.log("⏹️ Plugin UI hidden after meeting");
    }
  } else {
    // Feature flag disabled - UI state unchanged
    console.log("🚫 Auto UI management disabled - UI state unchanged");
  }
}

// Function to automatically setup MS Teams live captions
function setupTeamsLiveCaptions() {
  console.log("🎯 Setting up MS Teams live captions...");
  console.log("🔍 Looking for Teams UI elements...");
  
  // Wait 5 seconds for Teams UI to fully load and stabilize
  console.log("⏱️ Waiting 5 seconds for Teams UI to fully load...");
  setTimeout(() => {
    try {
      // Step 1: Find and hover over the "..." More button
      console.log("🔍 Step 1: Finding More button...");
      const moreButton = findMoreButton();
      if (moreButton) {
        console.log("✅ Found More button, clicking to open menu...");
        console.log("📍 More button details:", {
          id: moreButton.id,
          'data-inp': moreButton.getAttribute('data-inp'),
          text: moreButton.textContent?.trim(),
          ariaLabel: moreButton.getAttribute('aria-label')
        });
        
        // Click the More button to open the menu
        moreButton.click();
        
        // Step 2: Wait for menu to appear and find "Language and speech"
        setTimeout(() => {
          console.log("🔍 Step 2: Looking for Language and speech menu...");
          const languageSpeechMenu = findLanguageSpeechMenu();
          if (languageSpeechMenu) {
            console.log("✅ Found Language and speech menu, hovering...");
            console.log("📍 Language menu details:", {
              id: languageSpeechMenu.id,
              'data-inp': languageSpeechMenu.getAttribute('data-inp'),
              text: languageSpeechMenu.textContent?.trim()
            });
            
            // Log all available menu items for debugging
            console.log("🔍 All available menu items:", Array.from(document.querySelectorAll('[role="menuitem"]')).map(item => ({
              text: item.textContent?.trim(),
              'data-inp': item.getAttribute('data-inp'),
              id: item.id
            })));
            
            languageSpeechMenu.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            
            // Step 3: Wait for submenu and click on "Language and Speech"
            setTimeout(() => {
              console.log("🔍 Step 3: Looking for Language and Speech text to click...");
              const languageSpeechItem = findLanguageSpeechText();
              if (languageSpeechItem) {
                console.log("✅ Found Language and Speech text, hovering over it...");
                console.log("📍 Language and Speech item details:", {
                  id: languageSpeechItem.id,
                  'data-inp': languageSpeechItem.getAttribute('data-inp'),
                  text: languageSpeechItem.textContent?.trim()
                });
                
                // Click on the Language and Speech item to open submenu
                languageSpeechItem.click();
                console.log("🎯 Clicked on Language and Speech - submenu should now be open!");
                
                // Step 4: Wait for submenu and find "Show Live Captions" to click
                setTimeout(() => {
                  console.log("🔍 Step 4: Looking for Show Live Captions option to click...");
                  const liveCaptionsOption = findShowLiveCaptionsOption();
                  if (liveCaptionsOption) {
                    console.log("✅ Found Show Live Captions option, clicking to enable...");
                    console.log("📍 Live Captions option details:", {
                      id: liveCaptionsOption.id,
                      'data-inp': liveCaptionsOption.getAttribute('data-inp'),
                      text: liveCaptionsOption.textContent?.trim(),
                      ariaChecked: liveCaptionsOption.getAttribute('aria-checked')
                    });
                    
                    // Click on the Show Live Captions option to enable it
                    liveCaptionsOption.click();
                    console.log("🎯 Live captions enabled successfully!");
                  } else {
                    console.log("⚠️ Show Live Captions option not found");
                    console.log("🔍 Available submenu items:", Array.from(document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]')).map(item => ({
                      text: item.textContent?.trim(),
                      role: item.getAttribute('role'),
                      'data-inp': item.getAttribute('data-inp')
                    })));
                  }
                }, 500); // Wait for submenu to appear
              } else {
                console.log("⚠️ Language and Speech text not found");
                console.log("🔍 Available menu items:", Array.from(document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]')).map(item => ({
                  text: item.textContent?.trim(),
                  role: item.getAttribute('role'),
                  'data-inp': item.getAttribute('data-inp')
                })));
              }
            }, 500); // Wait for submenu to appear
          } else {
            console.log("⚠️ Language and speech menu not found");
            console.log("🔍 Available menu items:", Array.from(document.querySelectorAll('[role="menuitem"]')).map(item => ({
              text: item.textContent?.trim(),
              'data-inp': item.getAttribute('data-inp')
            })));
          }
        }, 500); // Wait for main menu to appear
      } else {
        console.log("⚠️ More button not found");
      }
    } catch (error) {
      console.error("❌ Error setting up live captions:", error);
    }
  }, 5000); // Wait 5 seconds for Teams UI to load
}

// Helper function to find the "..." More button
function findMoreButton() {
  // Primary method: Look for the exact data attribute from MS Teams
  const moreButton = document.querySelector('[data-inp="callingButtons-showMoreBtn"]');
  if (moreButton) {
    console.log("✅ Found More button using exact data attribute");
    return moreButton;
  }
  
  // Fallback method: Look for buttons with "More" text or similar
  const buttons = document.querySelectorAll('button, [role="button"]');
  for (const button of buttons) {
    const text = button.textContent?.toLowerCase() || '';
    if (text.includes('more') || text.includes('...') || button.title?.toLowerCase().includes('more')) {
      console.log("✅ Found More button using text fallback");
      return button;
    }
  }
  
  // Additional fallback: Look for elements with data attributes that might indicate the more button
  const fallbackMoreButton = document.querySelector('[data-inp*="more"], [data-inp*="showMore"]');
  if (fallbackMoreButton) {
    console.log("✅ Found More button using fallback data attribute");
    return fallbackMoreButton;
  }
  
  console.log("⚠️ More button not found using any method");
  return null;
}

// Helper function to find "Language and speech" menu item
function findLanguageSpeechMenu() {
  // Primary method: Look for exact text content "Language and speech"
  const menuItems = document.querySelectorAll('[role="menuitem"]');
  for (const item of menuItems) {
    const text = item.textContent?.trim() || '';
    if (text === "Language and speech") {
      console.log("✅ Found Language and speech using exact text match");
      return item;
    }
  }
  
  // Fallback method: Look for menu items with "Language and speech" text (case-insensitive)
  for (const item of menuItems) {
    const text = item.textContent?.toLowerCase() || '';
    if (text.includes('language') && text.includes('speech')) {
      console.log("✅ Found Language and speech using partial text match");
      return item;
    }
  }
  
  // Additional fallback: Look for elements with specific data attributes
  const languageMenu = document.querySelector('[data-inp="LanguageSpeechMenuControl-id"]');
  if (languageMenu) {
    console.log("✅ Found Language and speech using data attribute");
    return languageMenu;
  }
  
  console.log("⚠️ Language and speech menu not found using any method");
  return null;
}

// Helper function to find "Language and Speech" text and click on it
function findLanguageSpeechText() {
  // Look for menu items with "Language and Speech" text
  const menuItems = document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]');
  for (const item of menuItems) {
    const text = item.textContent?.trim() || '';
    if (text === "Language and Speech" || text === "Language and speech") {
      console.log("✅ Found Language and Speech text, ready to click");
      return item;
    }
  }
  
  // Fallback: Look for partial text match
  for (const item of menuItems) {
    const text = item.textContent?.toLowerCase() || '';
    if (text.includes('language') && text.includes('speech')) {
      console.log("✅ Found Language and Speech text using partial match, ready to click");
      return item;
    }
  }
  
  console.log("⚠️ Language and Speech text not found");
  return null;
}

// Helper function to find "Show Live Captions" option
function findShowLiveCaptionsOption() {
  // Look for menu items with "Show Live Captions" text
  const menuItems = document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]');
  for (const item of menuItems) {
    const text = item.textContent?.trim() || '';
    if (text === "Show Live Captions" || text === "Show live captions") {
      console.log("✅ Found Show Live Captions using exact text match");
      return item;
    }
  }
  
  // Fallback: Look for partial text match
  for (const item of menuItems) {
    const text = item.textContent?.toLowerCase() || '';
    if (text.includes('live') && text.includes('caption')) {
      console.log("✅ Found Show Live Captions using partial text match");
      return item;
    }
  }
  
  // Additional fallback: Look for checkboxes that might be unchecked
  const checkboxes = document.querySelectorAll('[role="menuitemcheckbox"]');
  for (const checkbox of checkboxes) {
    const text = checkbox.textContent?.toLowerCase() || '';
    if (text.includes('live') && text.includes('caption') && checkbox.getAttribute('aria-checked') === 'false') {
      console.log("✅ Found Show Live Captions checkbox using aria-checked state");
      return checkbox;
    }
  }
  
  console.log("⚠️ Show Live Captions option not found");
  return null;
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
      console.log("AI Model saved:", newAiModel, "Current aiModel variable:", aiModel);
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
  console.log("Making API call with model:", aiModel, "API Key:", apiKey ? "Set" : "Not set");
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
    console.log("🔄 Duplicate text detected in live preview, skipping:", text.substring(0, 50) + "...");
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
    console.log("🔄 Starting finalization of idle text:", lastLivePreviewText.substring(0, 50) + "...");
    
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
      console.log("🔍 WebSocket service available:", !!webSocketService);
      if (webSocketService) {
        console.log("🔍 WebSocket connection status:", webSocketService.getConnectionStatus());
        
        if (webSocketService.isConnected) {
          const transcriptId = Date.now().toString();
          const timestamp = new Date().toISOString();
          webSocketService.sendTranscriptForClassification(transcriptId, lastLivePreviewText, timestamp);
          console.log("📤 Finalized idle text sent to WebSocket:", lastLivePreviewText.substring(0, 50) + "...");
        } else {
          console.warn("⚠️ WebSocket not connected, attempting to send anyway (may be queued)");
          
          // Try to send anyway - the service might queue it
          const transcriptId = Date.now().toString();
          const timestamp = new Date().toISOString();
          webSocketService.sendTranscriptForClassification(transcriptId, lastLivePreviewText, timestamp);
          console.log("📤 Finalized text queued for later transmission:", lastLivePreviewText.substring(0, 50) + "...");
        }
      } else {
        console.error("❌ WebSocket service not available");
      }
    } catch (error) {
      console.error("❌ Error sending finalized text to WebSocket:", error);
    }

    // Reset the live preview
    livePreviewElement = null;
    lastLivePreviewText = '';
    
    // Scroll to bottom to show the finalized text
    transcriptArea.scrollTop = transcriptArea.scrollHeight;
    
    console.log("✅ Live preview finalized after 5 seconds of inactivity");
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
    console.log("🔄 Duplicate text detected in transcript, skipping:", text.substring(0, 50) + "...");
    return;
  }
  
  // Debug: log which panel we're using
  console.log(`appendToOverlay: isGPT=${isGPT}, targetArea=`, targetArea.id, `text=`, text.substring(0, 50));
  
  const isAtBottom =
    targetArea.scrollHeight - targetArea.scrollTop <= targetArea.clientHeight + 20;

  const p = document.createElement("div");
  p.textContent = isGPT ? `🧠 GPT: ${text}` : text;
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

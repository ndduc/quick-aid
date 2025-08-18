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
import {createHeader, createContentArea, createOverlay, createResizer, createInputSection, createConfigBtn, createConfigModal, createDualContentLayout, createGPTContextMenu, CONTEXT_MENU_OPTIONS} from './ui.js'

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


// === Overlay Container (shell) ===
const overlay = createOverlay();
document.body.appendChild(overlay);

const resizer = createResizer();
overlay.appendChild(resizer);
resizer.addEventListener("mousedown", (e) => {
  e.preventDefault();
  isResizing = true;
  document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;
  const rect = overlay.getBoundingClientRect();
  const newWidth = e.clientX - rect.left;
  const newHeight = e.clientY - rect.top;
  if (newWidth > 900) overlay.style.width = `${newWidth}px`;    // min width for three content areas
  if (newHeight > 200) overlay.style.height = `${newHeight}px`;  // min height
});

document.addEventListener("mouseup", () => {
  isResizing = false;
  document.body.style.userSelect = "";
});


// === Header with Minimize Button ===
const {header, minimizeBtn} = createHeader();
overlay.appendChild(header);

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
    console.log("🔍 Interview Assistant minimized");
  }
});

// === Scrollable Content Area ===
const {contentContainer, gptResponseArea, transcriptArea} = createDualContentLayout();
overlay.appendChild(contentContainer);

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

  const { transcriptId, text, classification, confidence, suggestions } = result;
  
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
      "${text.length > 60 ? text.substring(0, 60) + '...' : text}"
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

// Function to check and display WebSocket status
function checkWebSocketStatus() {
  const status = webSocketService.getConnectionStatus();
  const blankPanel = document.getElementById('blank-panel');
  if (!blankPanel) return;

  // Create status display element
  const statusElement = document.createElement('div');
  statusElement.style.cssText = `
    padding: 8px;
    margin: 4px 0;
    border-left: 4px solid ${status.isConnected ? '#28a745' : '#dc3545'};
    background: #f8f9fa;
    border-radius: 4px;
    font-size: 12px;
  `;

  // Create the status content
  const queuedMessages = webSocketService.messageQueue ? webSocketService.messageQueue.length : 0;
  statusElement.innerHTML = `
    <div style="font-weight: bold; color: ${status.isConnected ? '#28a745' : '#dc3545'}; margin-bottom: 4px;">
      🔌 WebSocket Status: ${status.isConnected ? 'Connected' : 'Disconnected'}
    </div>
    <div style="color: #666; margin-bottom: 4px;">
      <strong>Ready State:</strong> ${status.readyState}
    </div>
    <div style="color: #666; margin-bottom: 4px;">
      <strong>Reconnect Attempts:</strong> ${status.reconnectAttempts}
    </div>
    <div style="color: #666; margin-bottom: 4px;">
      <strong>Queued Messages:</strong> ${queuedMessages}
    </div>
    <div style="font-size: 10px; color: #999; margin-top: 4px;">
      Checked: ${new Date().toLocaleTimeString()}
    </div>
  `;

  // Add to the top of the blank panel
  blankPanel.insertBefore(statusElement, blankPanel.firstChild);
  
  // Limit the number of results to prevent overflow
  const maxResults = 20;
  while (blankPanel.children.length > maxResults) {
    blankPanel.removeChild(blankPanel.lastChild);
  }

  // Scroll to top to show latest result
  blankPanel.scrollTop = 0;

  console.log('🔌 WebSocket Status Check:', status);
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

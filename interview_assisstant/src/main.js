import { 
  fetchGPTResponse, sendImageToGPT,
  generateInterviewPayload, generateInterviewPayloadForScreenshotMode} from './open-ai.js';
import {
  getApiKey, getJobRole, 
  getJobSpecialy, getExtraInterviewPrompt, 
  getOpenAiModel, getWebSocketBackendUrl, saveWebSocketBackendUrl} from './config.js'
import {checkTranscript} from './transcribing-logic.js'
import {webSocketService} from './websocket-service.js'
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
const {header} = createHeader();
overlay.appendChild(header);

// === Scrollable Content Area ===
const {contentContainer, gptResponseArea, transcriptArea} = createDualContentLayout();
overlay.appendChild(contentContainer);

// Left panel is now ready for GPT responses


// === Bottom Input Section ===
const {inputSection, input, askBtn, screenshotBtn} = createInputSection(submitCustomPrompt);
overlay.appendChild(inputSection);
askBtn.onclick = submitCustomPrompt;
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
  if (!livePreviewElement) {
    livePreviewElement = document.createElement("div");
    livePreviewElement.style.cssText = `
      margin-top: 10px;
      opacity: 0.6;
      font-style: italic;
      color: #444;
    `;
  }

  livePreviewElement.textContent = text;

  // Move it to the bottom of the transcript area (right panel)
  transcriptArea.appendChild(livePreviewElement);
  transcriptArea.scrollTop = transcriptArea.scrollHeight;
}

function appendToOverlay(text, isGPT = false) {
  // GPT responses go to left panel, transcript goes to right panel
  const targetArea = isGPT ? gptResponseArea : transcriptArea;
  
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

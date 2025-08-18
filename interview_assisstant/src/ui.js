export function createOverlay() {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 1200px;
    height: 600px;
    resize: both;
    overflow: auto;
    background: white;
    color: black;
    font-size: 14px;
    padding: 0;
    border: 2px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 0 12px rgba(0,0,0,0.3);
    z-index: 999999;
    font-family: sans-serif;
  `;
  overlay.id = "gpt-assistant-overlay";
  return overlay;
}

export function createResizer() {
  const resizer = document.createElement("div");
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
  return resizer;
}

export function createLeftResizer() {
  const leftResizer = document.createElement("div");
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
  return leftResizer;
}

export function createHeader() {
  const header = document.createElement("div");
  header.style.cssText = `
    background: #f5f5f5;
    padding: 6px 10px;
    font-weight: bold;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    user-select: none;
  `;
  header.textContent = "QuikAid";

  const msTeamsStatus = document.createElement("span");
  msTeamsStatus.id = "ms-teams-status";
  msTeamsStatus.textContent = "🎯";
  msTeamsStatus.title = "MS Teams: Not Detected";
  msTeamsStatus.style.cssText = `
    margin-left: auto;
    font-size: 14px;
    cursor: help;
    visibility: hidden;
  `;
  header.appendChild(msTeamsStatus);

  const minimizeBtn = document.createElement("button");
  minimizeBtn.textContent = "–";
  minimizeBtn.title = "Minimize";
  minimizeBtn.style.cssText = `
    font-size: 16px;
    padding: 0 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #666;
    margin-left: 8px;
  `;
  header.appendChild(minimizeBtn);

  return {header, minimizeBtn};
}


export function createContentArea() {
  const contentArea = document.createElement("div");
      // max-height: 420px;
  contentArea.style.cssText = `
    overflow-y: auto;
    padding: 8px;
    white-space: pre-wrap;
    user-select: text;
    -webkit-user-select: text;
    flex: 1;
  `;
  contentArea.id = "content-area-id";
  return contentArea;

}

export function createInputSection(submitCustomPrompt) {
  const inputSection = document.createElement("div");
  inputSection.style.cssText = `
    display: flex;
    padding: 8px;
    border-top: 1px solid #ccc;
    background: #fafafa;
  `;
  
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Ask something...";
  input.style.cssText = `
    flex: 1;
    padding: 6px 8px;
    font-size: 13px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-right: 6px;
  `;
  
  const askBtn = document.createElement("button");
  askBtn.textContent = "Ask";
  askBtn.style.cssText = `
    padding: 6px 12px;
    font-size: 13px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  
  const screenshotBtn = document.createElement("button");
  screenshotBtn.textContent = "📷";
  screenshotBtn.title = "Take Screenshot";
  screenshotBtn.style.cssText = `
    padding: 6px 8px;
    font-size: 16px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 8px;
  `;

  const msTeamsTestBtn = document.createElement("button");
  msTeamsTestBtn.textContent = "🎯";
  msTeamsTestBtn.title = "Test MS Teams Caption";
  msTeamsTestBtn.style.cssText = `
    padding: 6px 8px;
    font-size: 16px;
    background: #6f42c1;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: none;
  `;

  const statusBtn = document.createElement("button");
  statusBtn.textContent = "🔌";
  statusBtn.title = "Check WebSocket Status";
  statusBtn.style.cssText = `
    padding: 6px 8px;
    font-size: 16px;
    background: #17a2b8;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: none;
  `;

  const clearDuplicatesBtn = document.createElement("button");
  clearDuplicatesBtn.textContent = "🧹";
  clearDuplicatesBtn.title = "Clear Duplicates";
  clearDuplicatesBtn.style.cssText = `
    padding: 6px 8px;
    font-size: 16px;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: none;
  `;

  const modeStatusBtn = document.createElement("button");
  modeStatusBtn.textContent = "🔄";
  modeStatusBtn.title = "Show Transcription Mode Status";
  modeStatusBtn.style.cssText = `
    padding: 6px 8px;
    font-size: 16px;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    display: none;
  `;

  inputSection.appendChild(input);
  inputSection.appendChild(askBtn);
  inputSection.appendChild(screenshotBtn);
  inputSection.appendChild(msTeamsTestBtn);
  inputSection.appendChild(statusBtn);
  inputSection.appendChild(clearDuplicatesBtn);
  inputSection.appendChild(modeStatusBtn);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitCustomPrompt();
  });


  return {inputSection, input, askBtn, screenshotBtn, msTeamsTestBtn, statusBtn, clearDuplicatesBtn, modeStatusBtn}
} 



export function createConfigBtn() {
  const configBtn = document.createElement("button");
  configBtn.textContent = "⚙️";
  configBtn.title = "Configure Prompt Context";
  configBtn.style.cssText = `
    font-size: 16px;
    padding: 0 8px;
    background: transparent;
    border: none;
    cursor: pointer;
  `;
  return configBtn;
}

//  CONFIGURATION MODAL (MODEL - DIALOG)
export function createConfigModal(apiKey, aiModel, jobRole, jobSpecialy, extraInterviewPrompt, websocketBackendUrl) {
  const configModal = document.createElement("div");
  configModal.style.cssText = `
    display: none;
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    width: 400px;
    max-height: 80vh;
    background: #fff;
    border: 1px solid #ccc;
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 0 12px rgba(0, 0, 0, 0.3);
    z-index: 1000001;
    overflow-y: auto;
    cursor: move;
  `;
  let offsetX = 0, offsetY = 0, isDragging = false;
  configModal.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - configModal.offsetLeft;
    offsetY = e.clientY - configModal.offsetTop;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      configModal.style.left = `${e.clientX - offsetX}px`;
      configModal.style.top = `${e.clientY - offsetY}px`;
      configModal.style.right = 'auto'; // disable 'right' so left works
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
  });

  const textareaLabel = document.createElement("label");
  textareaLabel.textContent = "Messages JSON:";
  textareaLabel.style.cssText = `display: block; font-weight: bold; margin: 10px 0 4px 0;`;

  const textarea = document.createElement("textarea");
  textarea.rows = 12;
  textarea.style.cssText = `
    width: 100%;
    font-size: 12px;
    font-family: monospace;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    resize: vertical;
    box-sizing: border-box;
    margin-bottom: 10px;
  `;

  const saveConfigBtn = document.createElement("button");
  saveConfigBtn.textContent = "Save";
  saveConfigBtn.style.cssText = `
    display: block;
    margin-left: auto;
    background: #007bff;
    color: white;
    padding: 6px 14px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
  `;

  const apiKeyLabel = document.createElement("label");
  apiKeyLabel.textContent = "API Key:";
  apiKeyLabel.style.cssText = `display: block; font-weight: bold; margin-bottom: 4px;`;

  const apiKeyInput = document.createElement("input");
  apiKeyInput.type = "text";
  apiKeyInput.placeholder = "API Key";
  apiKeyInput.style.cssText = `
    width: 100%;
    margin-bottom: 10px;
    font-size: 13px;
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  `;

  const modelLabel = document.createElement("label");
  modelLabel.textContent = "AI Model:";
  modelLabel.style.cssText = `display: block; font-weight: bold; margin-bottom: 4px;`;

  const openaiModelInput = document.createElement("select");
  openaiModelInput.style.cssText = `
    width: 100%;
    margin-bottom: 10px;
    font-size: 13px;
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  `;
  
  // Add model options
  const models = ["gpt-4o", "gpt-4o-mini", "gpt-5", "gpt-5o", "gpt-5o-mini"];
  models.forEach(model => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    openaiModelInput.appendChild(option);
  });

  const jobRoleLabel = document.createElement("label");
  jobRoleLabel.textContent = "Job Role:";
  jobRoleLabel.style.cssText = `display: block; font-weight: bold; margin-bottom: 4px;`;

  const jobRoleInput = document.createElement("input");
  jobRoleInput.type = "text";
  jobRoleInput.placeholder = "Job Role";
  jobRoleInput.style.cssText = `
    width: 100%;
    margin-bottom: 10px;
    font-size: 13px;
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  `;

  const specificInterviewLabel = document.createElement("label");
  specificInterviewLabel.textContent = "Job Specialty Interview Prompt:";
  specificInterviewLabel.style.cssText = `display: block; font-weight: bold; margin-bottom: 4px;`;

  const specificInterviewInput = document.createElement("input");
  specificInterviewInput.type = "text";
  specificInterviewInput.placeholder = "Specific Interview";
  specificInterviewInput.style.cssText = `
    width: 100%;
    margin-bottom: 10px;
    font-size: 13px;  
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  `;

  const extraInteviewPromptLabel = document.createElement("label");
  extraInteviewPromptLabel.textContent = "Extra Interview Prompt:";
  extraInteviewPromptLabel.style.cssText = `display: block; font-weight: bold; margin-bottom: 4px;`;

  const extraInteviewPromptInput = document.createElement("input");
  extraInteviewPromptInput.type = "text";
  extraInteviewPromptInput.placeholder = "Extra Interview Prompt";
  extraInteviewPromptInput.style.cssText = `
    width: 100%;
    margin-bottom: 10px;
    font-size: 13px;    
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  `;

  const websocketUrlLabel = document.createElement("label");
  websocketUrlLabel.textContent = "WebSocket Backend URL:";
  websocketUrlLabel.style.cssText = `display: block; font-weight: bold; margin-bottom: 4px;`;

  const websocketUrlInput = document.createElement("input");
  websocketUrlInput.type = "text";
  websocketUrlInput.placeholder = "ws://localhost:8080/ws/transcript";
  websocketUrlInput.style.cssText = `
    width: 100%;
    margin-bottom: 10px;
    font-size: 13px;    
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  `;

  const closeButton = document.createElement("span");
  closeButton.innerHTML = "&times;";
  closeButton.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    line-height: 24px;
    text-align: center;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    border-radius: 4px;
    color: #666;
  `;

  closeButton.addEventListener("mouseover", () => closeButton.style.color = "#000");
  closeButton.addEventListener("mouseout", () => closeButton.style.color = "#999");
  closeButton.addEventListener("click", () => {
    configModal.style.display = "none";
  });

  const resizer = document.createElement("div");
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
  
  let isResizing = false;

  configModal.appendChild(resizer);
  let startX, startY, startWidth, startHeight;

  resizer.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(configModal).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(configModal).height, 10);
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (isResizing) {
      const newWidth = startWidth + (e.clientX - startX);
      const newHeight = startHeight + (e.clientY - startY);
      configModal.style.width = `${newWidth}px`;
      configModal.style.height = `${newHeight}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.userSelect = "";
    }
  });


  apiKeyInput.value = apiKey;
  configModal.appendChild(closeButton);

  configModal.appendChild(apiKeyLabel);
  configModal.appendChild(apiKeyInput);



  // Set the selected model
  openaiModelInput.value = aiModel;
  configModal.appendChild(modelLabel);
  configModal.appendChild(openaiModelInput);

  jobRoleInput.value = jobRole;
  configModal.appendChild(jobRoleLabel);
  configModal.appendChild(jobRoleInput);

  specificInterviewInput.value = jobSpecialy;
  configModal.appendChild(specificInterviewLabel);
  configModal.appendChild(specificInterviewInput);

  extraInteviewPromptInput.value = extraInterviewPrompt;
  configModal.appendChild(extraInteviewPromptLabel);
  configModal.appendChild(extraInteviewPromptInput);

  websocketUrlInput.value = websocketBackendUrl || "ws://localhost:8080/ws/transcript";
  configModal.appendChild(websocketUrlLabel);
  configModal.appendChild(websocketUrlInput);

  // configModal.appendChild(textareaLabel);
  // configModal.appendChild(textarea);

  configModal.appendChild(saveConfigBtn);
  return {configModal, apiKeyInput,
    saveConfigBtn,  openaiModelInput, 
    jobRoleInput, specificInterviewInput,
     extraInteviewPromptInput, websocketUrlInput} 
}

export function createDualContentLayout() {
  // Create a container for the three content areas
  const contentContainer = document.createElement("div");
  contentContainer.style.cssText = `
    display: flex;
    gap: 0px;
    height: calc(100% - 120px);
    padding: 8px;
    position: relative;
  `;

  // Left content area for GPT responses
  const gptResponseArea = createContentArea();
  gptResponseArea.style.cssText += `
    background: #f8f9fa;
  `;
  gptResponseArea.id = "gpt-response-area";

  // Middle blank panel (do nothing with it)
  const blankPanel = createContentArea();
  blankPanel.style.cssText += `
    background: #f0f0f0;
  `;
  blankPanel.id = "blank-panel";

  // Right content area for transcript only
  const transcriptArea = createContentArea();
  transcriptArea.style.cssText += `
    background: #fafafa;
  `;
  transcriptArea.id = "transcript-area";

  // Add labels for each area
  const gptLabel = document.createElement("div");
  gptLabel.textContent = "AI Responses";
  gptLabel.style.cssText = `
    font-weight: bold;
    margin-bottom: 8px;
    color: #333;
    text-align: center;
    padding: 4px;
    background: #d1ecf1;
    border-radius: 4px;
  `;

  const blankLabel = document.createElement("div");
  blankLabel.textContent = "Real-time Question Classification";
  blankLabel.style.cssText = `
    font-weight: bold;
    margin-bottom: 8px;
    color: #333;
    text-align: center;
    padding: 4px;
    background: #e2e3e5;
    border-radius: 4px;
  `;

  const transcriptLabel = document.createElement("div");
  transcriptLabel.textContent = "Live Transcript";
  transcriptLabel.style.cssText = `
    font-weight: bold;
    margin-bottom: 8px;
    color: #333;
    text-align: center;
    padding: 4px;
    background: #e9ecef;
    border-radius: 4px;
  `;

  // Create wrapper divs for each area with labels
  const gptWrapper = document.createElement("div");
  gptWrapper.style.cssText = "flex: 1; display: flex; flex-direction: column; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; min-width: 200px;";
  gptWrapper.appendChild(gptLabel);
  gptWrapper.appendChild(gptResponseArea);

  const blankWrapper = document.createElement("div");
  blankWrapper.style.cssText = "flex: 1; display: flex; flex-direction: column; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; min-width: 200px;";
  blankWrapper.appendChild(blankLabel);
  blankWrapper.appendChild(blankPanel);

  const transcriptWrapper = document.createElement("div");
  transcriptWrapper.style.cssText = "flex: 1; display: flex; flex-direction: column; border: 1px solid #ddd; border-radius: 6px; overflow: hidden; min-width: 200px;";
  transcriptWrapper.appendChild(transcriptLabel);
  transcriptWrapper.appendChild(transcriptArea);

  // Create resize handles
  const resizeHandle1 = createResizeHandle();
  const resizeHandle2 = createResizeHandle();

  // Add resize functionality
  setupResizeHandle(resizeHandle1, gptWrapper, blankWrapper);
  setupResizeHandle(resizeHandle2, blankWrapper, transcriptWrapper);

  contentContainer.appendChild(gptWrapper);
  contentContainer.appendChild(resizeHandle1);
  contentContainer.appendChild(blankWrapper);
  contentContainer.appendChild(resizeHandle2);
  contentContainer.appendChild(transcriptWrapper);

  return {
    contentContainer,
    gptResponseArea,
    transcriptArea
  };
}

// Create a resize handle element
function createResizeHandle() {
  const handle = document.createElement("div");
  handle.style.cssText = `
    width: 6px;
    background: #ddd;
    cursor: col-resize;
    border-radius: 3px;
    margin: 0 2px;
    position: relative;
    transition: background-color 0.2s;
  `;
  
  handle.addEventListener("mouseenter", () => {
    handle.style.background = "#999";
  });
  
  handle.addEventListener("mouseleave", () => {
    handle.style.background = "#ddd";
  });
  
  return handle;
}

// Setup resize functionality between two panels
function setupResizeHandle(handle, leftPanel, rightPanel) {
  let isResizing = false;
  let startX = 0;
  let startLeftWidth = 0;
  let startRightWidth = 0;

  handle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startLeftWidth = leftPanel.offsetWidth;
    startRightWidth = rightPanel.offsetWidth;
    
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newLeftWidth = Math.max(200, startLeftWidth + deltaX);
    const newRightWidth = Math.max(200, startRightWidth - deltaX);
    
    leftPanel.style.flex = `0 0 ${newLeftWidth}px`;
    rightPanel.style.flex = `0 0 ${newRightWidth}px`;
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  });
}

export function createGPTContextMenu(e, options, onOptionClick) {
  const menu = document.createElement("div");
  menu.style.cssText = `
    position: fixed;
    top: ${e.pageY}px;
    left: ${e.pageX}px;
    background: #fefefe;
    border: 1px solid #ccc;
    padding: 4px;
    font-size: 13px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 1000000;
  `;

  options.forEach(({ label, prefix }) => {
    const item = document.createElement("div");
    item.textContent = label;
    item.style.cssText = `
      padding: 6px 8px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
    `;
    item.onmouseenter = () => item.style.background = "#eee";
    item.onmouseleave = () => item.style.background = "transparent";
    item.onclick = () => onOptionClick(prefix, label);
    menu.appendChild(item);
  });

  return menu;
}

export const CONTEXT_MENU_OPTIONS = [
  { label: "💬 Ask GPT about this", prefix: "" },
  {
    label: "📘 Explain briefly (interview-friendly)",
    prefix: "Briefly explain this in a way that's clear and friendly for a software engineering interview conversation: ",
  },
  {
    label: "🛠️ Real-world use case (interview-friendly)",
    prefix: "Give a real-world use case, explained in a clear and conversational way suitable for a software engineering interview: ",
  },
  {
    label: "🧩 Explain + Use Case (interview-friendly)",
    prefix: "Briefly explain this and provide some basic use case (dont go to much into detail). Make it sound natural and appropriate for a software engineering interview: ",
  },
];



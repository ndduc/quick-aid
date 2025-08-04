export function createOverlay() {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    width: 400px;
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
  header.textContent = "Interview Assistant";

  // const minimizeBtn = document.createElement("button");
  // minimizeBtn.textContent = "–";
  // minimizeBtn.style.cssText = `
  //   font-size: 16px;
  //   padding: 0 8px;
  //   background: transparent;
  //   border: none;
  //   cursor: pointer;
  // `;
  // header.appendChild(minimizeBtn);

  return {header};
}


export function createContentArea() {
  const contentArea = document.createElement("div");
      // max-height: 420px;
  contentArea.style.cssText = `
    overflow-y: auto;
    padding: 10px;
    white-space: pre-wrap;
    user-select: text;
    -webkit-user-select: text;
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
  `;

  inputSection.appendChild(input);
  inputSection.appendChild(askBtn);
  inputSection.appendChild(screenshotBtn);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitCustomPrompt();
  });


  return {inputSection, input, askBtn, screenshotBtn}
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
export function createConfigModal(apiKey, aiModel, jobRole, jobSpecialy, extraInterviewPrompt) {
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

  const openaiModelInput = document.createElement("input");
  openaiModelInput.type = "text";
  openaiModelInput.placeholder = "AI Model";
  openaiModelInput.style.cssText = `
    width: 100%;
    margin-bottom: 10px;
    font-size: 13px;
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  `;

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

  // configModal.appendChild(textareaLabel);
  // configModal.appendChild(textarea);

  configModal.appendChild(saveConfigBtn);
  return {configModal, apiKeyInput,
    saveConfigBtn,  openaiModelInput, 
    jobRoleInput, specificInterviewInput,
     extraInteviewPromptInput} 
}



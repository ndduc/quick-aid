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
    background: rgba(255, 255, 255,0.7);
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
    background: rgba(245, 245, 245,0.7);
    padding: 6px 10px;
    font-weight: bold;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    user-select: none;
  `;
  // Create title container with version
  const titleContainer = document.createElement("div");
  titleContainer.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;
  
  const title = document.createElement("span");
  title.textContent = "QuikAid";
  title.style.cssText = `
    font-weight: bold;
  `;
  
  const version = document.createElement("span");
  version.style.cssText = `
    font-size: 10px;
    color: #6c757d;
    font-family: monospace;
    font-weight: normal;
  `;
  
  // Get version from manifest
  let buildVersion = "v1.0.0"; // fallback
  try {
    // Try to get version from manifest
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
      const manifest = chrome.runtime.getManifest();
      buildVersion = `v${manifest.version}`;
    }
  } catch (error) {
    console.log("Could not read manifest version, using fallback:", error);
  }
  
  version.textContent = buildVersion;
  
  titleContainer.appendChild(title);
  titleContainer.appendChild(version);
  header.appendChild(titleContainer);

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
    background: rgba(250, 250, 250,0.7);
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
  
  const reconnectBtn = document.createElement("button");
  reconnectBtn.textContent = "🔌";
  reconnectBtn.title = "Reconnect WebSocket";
  reconnectBtn.style.cssText = `
    padding: 6px 8px;
    font-size: 16px;
    background: #ffc107;
    color: #212529;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 6px;
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

  inputSection.appendChild(input);
  inputSection.appendChild(askBtn);
  inputSection.appendChild(reconnectBtn);
  inputSection.appendChild(screenshotBtn);
  inputSection.appendChild(statusBtn);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitCustomPrompt();
  });


  return {inputSection, input, askBtn, reconnectBtn, screenshotBtn, statusBtn}
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
export function createConfigModal(apiKey, userProfileService) {
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

  // configModal.appendChild(apiKeyLabel);
  // configModal.appendChild(apiKeyInput);







  // User Settings Section
  const settingsSection = document.createElement("div");
  settingsSection.style.cssText = `
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
  `;

  const settingsDisclaimer = document.createElement("div");
  settingsDisclaimer.textContent = "⚠️ Prompt setting must be edit from app.qikaid.com";
  settingsDisclaimer.style.cssText = `
    display: block; 
    font-size: 11px; 
    color: #dc3545; 
    background: #f8d7da; 
    border: 1px solid #f5c6cb; 
    border-radius: 4px; 
    padding: 6px 8px; 
    margin-bottom: 8px;
    font-weight: 500;
  `;

  const settingsTitle = document.createElement("div");
  settingsTitle.textContent = "Prompt Setting";
  settingsTitle.style.cssText = `
    display: block; 
    font-weight: bold; 
    font-size: 14px; 
    color: #333; 
    margin-bottom: 8px; 
    padding: 8px 0; 
    border-bottom: 1px solid #ddd;
  `;

  const settingsLabel = document.createElement("label");
  settingsLabel.textContent = "User Settings:";
  settingsLabel.style.cssText = `display: block; font-weight: bold; margin-bottom: 8px;`;

  const settingsDetails = document.createElement("div");
  settingsDetails.style.cssText = `
    background: rgba(248, 249, 250,0.7);
    border: 1px solid #e9ecef;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  `;

  const loadUserSettings = async () => {
    try {
      const userConfig = await userProfileService.getCachedSettings();
      if (userConfig && userConfig.settings) {
        const settings = userConfig.settings;
        settingsDetails.innerHTML = `
          <div style="margin-bottom: 8px;">
            <label for="default-temperature-setting" style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 11px; color: #666;">Temperature:</label>
            <input id="default-temperature-setting" readonly style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px; background: #fff; color: #000;" value="${settings.defaultTemperature || 'Not set'}">
          </div>
          <div style="margin-bottom: 8px;">
            <label for="default-max-tokens-setting" style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 11px; color: #666;">Max Tokens:</label>
            <input id="default-max-tokens-setting" readonly style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px; background: #fff; color: #000;" value="${settings.defaultMaxTokens || 'Not set'}">
          </div>
          <div style="margin-bottom: 8px;">
            <label for="default-top-p-setting" style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 11px; color: #666;">Top P:</label>
            <input id="default-top-p-setting" readonly style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px; background: #fff; color: #000;" value="${settings.defaultTopP || 'Not set'}">
          </div>
          <div style="margin-bottom: 8px;">
            <label for="default-top-k-setting" style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 11px; color: #666;">Top K:</label>
            <input id="default-top-k-setting" readonly style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px; background: #fff; color: #000;" value="${settings.defaultTopK || 'Not set'}">
          </div>
          <div style="margin-bottom: 8px;">
            <label for="presence-penalty-setting" style="display: block; font-weight: bold; margin-bottom: 2px; font-size: 11px; color: #666;">Presence Penalty:</label>
            <input id="presence-penalty-setting" readonly style="width: 100%; padding: 4px; border: 1px solid #ccc; border-radius: 3px; font-size: 11px; background: #fff; color: #000;" value="${settings.presencePenalty || 'Not set'}">
          </div>
  
        `;
      } else {
        settingsDetails.innerHTML = `
          <div style="text-align: center; color: #666; font-size: 12px; padding: 20px;">
            No user settings found
          </div>
        `;
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      settingsDetails.innerHTML = `
        <div style="text-align: center; color: #dc3545; font-size: 12px; padding: 20px;">
          Error loading user settings
        </div>
      `;
    }
  };

  settingsSection.appendChild(settingsDisclaimer);
  settingsSection.appendChild(settingsTitle);
  settingsSection.appendChild(settingsLabel);
  settingsSection.appendChild(settingsDetails);
  configModal.appendChild(settingsSection);

  // User Profile Section
  const profileSection = document.createElement("div");
  profileSection.style.cssText = `
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #eee;
  `;

  const profileTitle = document.createElement("div");
  profileTitle.textContent = "Prompt Profile";
  profileTitle.style.cssText = `
    display: block; 
    font-weight: bold; 
    font-size: 14px; 
    color: #333; 
    margin-bottom: 8px; 
    padding: 8px 0; 
    border-bottom: 1px solid #ddd;
  `;

  const profileLabel = document.createElement("label");
  profileLabel.textContent = "User Profile:";
  profileLabel.style.cssText = `display: block; font-weight: bold; margin-bottom: 4px;`;

  // Create container for dropdown and refresh button
  const profileContainer = document.createElement("div");
  profileContainer.style.cssText = `
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  `;

  const profileSelect = document.createElement("select");
  profileSelect.style.cssText = `
    flex: 1;
    font-size: 13px;
    padding: 6px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  `;

  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "🔄";
  refreshBtn.title = "Refresh Profiles";
  refreshBtn.style.cssText = `
    padding: 6px 10px;
    font-size: 13px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: rgba(248, 249, 250,0.7);
    cursor: pointer;
    min-width: 40px;
  `;

  // Add hover effect
  refreshBtn.addEventListener("mouseenter", () => {
    refreshBtn.style.background = "rgba(233, 236, 239,0.7)";
  });
  refreshBtn.addEventListener("mouseleave", () => {
    refreshBtn.style.background = "rgba(248, 249, 250,0.7)";
  });

  // Add click handler for refresh
  refreshBtn.addEventListener("click", async () => {
    try {
      refreshBtn.textContent = "⏳";
      refreshBtn.disabled = true;
      console.log("Manual refresh triggered");
      
      // Force refresh profiles
      await userProfileService.refreshInBackground();
      
      // Reload the dropdown
      await loadUserProfiles();
      
      refreshBtn.textContent = "🔄";
      refreshBtn.disabled = false;
      console.log("Manual refresh completed");
    } catch (error) {
      console.error("Error during manual refresh:", error);
      refreshBtn.textContent = "❌";
      setTimeout(() => {
        refreshBtn.textContent = "🔄";
        refreshBtn.disabled = false;
      }, 2000);
    }
  });

  profileContainer.appendChild(profileSelect);
  profileContainer.appendChild(refreshBtn);

  const profileDetails = document.createElement("div");
  profileDetails.id = "profile-details";
  profileDetails.style.cssText = `
    margin-top: 10px;
    padding: 10px;
    background: rgba(248, 249, 250,0.7);
    border: 1px solid #e9ecef;
    border-radius: 4px;
    font-size: 12px;
    display: none;
  `;

  // Function to load and display profiles
  const loadUserProfiles = async () => {
    try {
      console.log("loadUserProfiles called");
      if (!userProfileService) {
        console.log("User profile service not available");
        return;
      }

      console.log("Getting cached profiles...");
      const profiles = await userProfileService.getCachedProfiles();
      console.log("Received profiles:", profiles);
      
      // Clear existing options
      profileSelect.innerHTML = '<option value="">Select a profile...</option>';
      
      if (profiles.length === 0) {
        const option = document.createElement("option");
        option.value = "";
        option.textContent = "No profiles available";
        option.disabled = true;
        profileSelect.appendChild(option);
        return;
      }

      // Add profile options
      profiles.forEach((profile, index) => {
        const option = document.createElement("option");
        option.value = profile.userProfileId;
        option.textContent = profile.displayName;
        profileSelect.appendChild(option);
      });

      // Restore previously selected profile or select first profile by default
      if (profiles.length > 0) {
        chrome.storage.local.get(['selectedUserProfileId'], (result) => {
          const savedProfileId = result.selectedUserProfileId;
          let selectedProfile = null;
          
          if (savedProfileId) {
            // Try to find the saved profile
            selectedProfile = profiles.find(p => p.userProfileId === savedProfileId);
            if (selectedProfile) {
              profileSelect.value = savedProfileId;
              displayProfileDetails(selectedProfile);
              console.log('Restored previously selected profile from chrome storage:', selectedProfile.displayName);
            } else {
              console.log('Previously selected profile not found, selecting first profile');
              selectedProfile = profiles[0];
              profileSelect.value = profiles[0].userProfileId;
              displayProfileDetails(profiles[0]);
            }
          } else {
            // No saved profile, select first one
            selectedProfile = profiles[0];
            profileSelect.value = profiles[0].userProfileId;
            displayProfileDetails(profiles[0]);
            console.log('No previously selected profile, selecting first profile');
          }
        });
      }
    } catch (error) {
      console.error("Error loading user profiles:", error);
      profileSelect.innerHTML = '<option value="">Error loading profiles</option>';
    }
  };

  // Function to display profile details
  const displayProfileDetails = (profile) => {
    if (!profile) {
      profileDetails.style.display = "none";
      return;
    }

    const createdDate = new Date(profile.createdAt).toLocaleDateString();
    const updatedDate = new Date(profile.updatedAt).toLocaleDateString();

    profileDetails.innerHTML = `
      <div style="margin-bottom: 12px;">
        <label for="user-info-textarea" style="display: block; font-weight: bold; margin-bottom: 4px; font-size: 12px; color: black;">User Info:</label>
        <textarea id="user-info-textarea" readonly style="width: 100%; height: 60px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; resize: none; background: rgba(248, 249, 250,0.7); color: #000;">${profile.userInfo || 'Not specified'}</textarea>
      </div>
      <div style="margin-bottom: 12px;">
        <label for="purpose-textarea" style="display: block; font-weight: bold; margin-bottom: 4px; font-size: 12px; color: black;">Purpose:</label>
        <textarea id="purpose-textarea" readonly style="width: 100%; height: 60px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; resize: none; background: rgba(248, 249, 250,0.7); color: #000;">${profile.purpose || 'Not specified'}</textarea>
      </div>
      <div style="margin-bottom: 12px;">
        <label for="bot-role-textarea" style="display: block; font-weight: bold; margin-bottom: 4px; font-size: 12px; color: black;">Bot Role:</label>
        <textarea id="bot-role-textarea" readonly style="width: 100%; height: 60px; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; resize: none; background: rgba(248, 249, 250,0.7); color: #000;">${profile.botRole || 'Not specified'}</textarea>
      </div>
    `;
    profileDetails.style.display = "block";
  };

  // Event listener for profile selection
  profileSelect.addEventListener("change", async (e) => {
    const selectedProfileId = e.target.value;
    
    // Save selected profile to chrome storage
    if (selectedProfileId) {
      chrome.storage.local.set({ 'selectedUserProfileId': selectedProfileId }, () => {
        console.log('Saved selected profile ID to chrome storage:', selectedProfileId);
      });
    } else {
      chrome.storage.local.remove(['selectedUserProfileId'], () => {
        console.log('Cleared selected profile ID from chrome storage');
      });
    }
    
    if (!selectedProfileId) {
      profileDetails.style.display = "none";
      return;
    }

    try {
      const profile = await userProfileService.getUserProfile(selectedProfileId);
      displayProfileDetails(profile);
    } catch (error) {
      console.error("Error loading profile details:", error);
    }
  });

  profileSection.appendChild(profileTitle);
  profileSection.appendChild(profileLabel);
  profileSection.appendChild(profileContainer);
  profileSection.appendChild(profileDetails);

  // configModal.appendChild(textareaLabel);
  // configModal.appendChild(textarea);

  configModal.appendChild(profileSection);
  configModal.appendChild(saveConfigBtn);

  // Store functions for external access
  configModal.loadUserProfiles = loadUserProfiles;
  configModal.loadUserSettings = loadUserSettings;
  return {configModal, apiKeyInput, saveConfigBtn} 
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
    background: rgba(248, 249, 250,0.7);
  `;
  gptResponseArea.id = "gpt-response-area";

  // Middle blank panel (do nothing with it)
  const blankPanel = createContentArea();
  blankPanel.style.cssText += `
    background: rgba(240, 240, 240,0.7);
  `;
  blankPanel.id = "blank-panel";

  // Right content area for transcript only
  const transcriptArea = createContentArea();
  transcriptArea.style.cssText += `
    background: rgba(250, 250, 250,0.7);
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
    background: rgba(209, 236, 241,0.7);
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
    background: rgba(226, 227, 229,0.7);
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
    background: rgba(233, 236, 239,0.7);
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
    background: rgba(221, 221, 221,0.7);
    cursor: col-resize;
    border-radius: 3px;
    margin: 0 2px;
    position: relative;
    transition: background-color 0.2s;
  `;
  
  handle.addEventListener("mouseenter", () => {
    handle.style.background = "rgba(153, 153, 153,0.7)";
  });
  
  handle.addEventListener("mouseleave", () => {
    handle.style.background = "rgba(221, 221, 221,0.7)";
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
    background: rgba(254, 254, 254,0.7);
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
    item.onmouseenter = () => item.style.background = "rgba(238, 238, 238,0.7)";
    item.onmouseleave = () => item.style.background = "transparent";
    item.onclick = () => onOptionClick(prefix, label);
    menu.appendChild(item);
  });

  return menu;
}

export const CONTEXT_MENU_OPTIONS = [
  { label: "💬 Ask GPT about this", prefix: "" },
  // {
  //   label: "📘 Explain briefly (interview-friendly)",
  //   prefix: "Briefly explain this in a way that's clear and friendly for a software engineering interview conversation: ",
  // },
  // {
  //   label: "🛠️ Real-world use case (interview-friendly)",
  //   prefix: "Give a real-world use case, explained in a clear and conversational way suitable for a software engineering interview: ",
  // },
  // {
  //   label: "🧩 Explain + Use Case (interview-friendly)",
  //   prefix: "Briefly explain this and provide some basic use case (dont go to much into detail). Make it sound natural and appropriate for a software engineering interview: ",
  // },
];

export function createLockModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.45);
    z-index: 1000000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  const box = document.createElement('div');
  box.style.cssText = `
    background: rgba(255, 255, 255,0.7);
    border-radius: 12px;
    box-shadow: 0 4px 32px rgba(0,0,0,0.18);
    padding: 40px 32px;
    max-width: 400px;
    text-align: center;
    font-family: inherit;
  `;
  
  // Create button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: center;
    align-items: center;
  `;
  
  // Login button
  const loginBtn = document.createElement('a');
  loginBtn.href = "https://app.qikaid.com";
  loginBtn.target = "_blank";
  loginBtn.textContent = "Go to QikAid Login";
  loginBtn.style.cssText = `
    display: inline-block;
    padding: 12px 28px;
    background: rgba(0, 120, 212,0.7);
    color: #fff;
    border-radius: 6px;
    text-decoration: none;
    font-size: 16px;
    font-weight: 600;
  `;
  
  // Sync button
  const syncBtn = document.createElement('button');
  syncBtn.innerHTML = '🔄';
  syncBtn.title = 'Sync & Validate Token';
  syncBtn.style.cssText = `
    padding: 12px;
    background: rgba(40, 167, 69,0.7);
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    min-width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Add click handler for sync button
  syncBtn.addEventListener('click', async () => {
    syncBtn.innerHTML = '⏳';
    syncBtn.style.background = 'rgba(108, 117, 125,0.7)';
    syncBtn.disabled = true;
    
    try {
      // Request token validation/refresh from background
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "REFRESH_TOKEN_REQUEST" }, resolve);
      });
      
      if (response && response.success) {
        // Success - close modal and unlock UI
        if (modal.parentNode) modal.parentNode.removeChild(modal);
        // Trigger unlock (this will be handled by the token refresh success)
        setTimeout(() => {
          chrome.runtime.sendMessage({ type: "CHECK_TOKEN_STATUS" });
        }, 1000);
      } else {
        // Failed - reset button
        syncBtn.innerHTML = '🔄';
        syncBtn.style.background = 'rgba(40, 167, 69,0.7)';
        syncBtn.disabled = false;
        syncBtn.title = 'Sync failed - try again';
      }
    } catch (error) {
      console.error('Sync failed:', error);
      syncBtn.innerHTML = '❌';
      syncBtn.style.background = 'rgba(220, 53, 69,0.7)';
      syncBtn.disabled = false;
      syncBtn.title = 'Sync failed - try again';
      
      // Reset after 2 seconds
      setTimeout(() => {
        syncBtn.innerHTML = '🔄';
        syncBtn.style.background = 'rgba(40, 167, 69,0.7)';
        syncBtn.title = 'Sync & Validate Token';
      }, 2000);
    }
  });
  
  buttonContainer.appendChild(loginBtn);
  buttonContainer.appendChild(syncBtn);
  
  box.innerHTML = `
    <h2 style="margin-bottom: 18px; color: #222;">Authentication Required</h2>
    <p style="margin-bottom: 24px; color: #444;">Your session has expired or you are not logged in.<br>Please log in to continue using QikAid.</p>
  `;
  box.appendChild(buttonContainer);
  modal.appendChild(box);
  return modal;
}



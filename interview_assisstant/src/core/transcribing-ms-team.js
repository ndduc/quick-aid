// Microsoft Teams Transcript Extraction Service
// Extracts live captions from MS Teams meetings and sends them for classification
//
// ============================================================================
// MODE SWITCHING FEATURE
// ============================================================================
// This service supports two transcription modes:
//
// 1. OLD LIVE TRANSCRIBE MODE (useOldMode = true)
//    - Uses the original live transcribe functionality
//    - MS Teams monitoring is completely disabled
//    - All MS Teams functions return early with appropriate messages
//    - Useful when you want to fall back to the original system
//
// 2. MS TEAMS CAPTION MODE (useOldMode = false) [DEFAULT]
//    - Uses the new MS Teams caption extraction
//    - Full MS Teams monitoring and DOM observation
//    - Real-time caption processing and WebSocket integration
//
// ============================================================================
// HOW TO SWITCH MODES
// ============================================================================
//
// OPTION 1: Change the constant (requires restart)
//    Set USE_OLD_LIVE_TRANSCRIBE_MODE = true/false at the top of this file
//
// OPTION 2: Runtime override (immediate effect)
//    In browser console:
//    import('./transcribing-ms-team.js').then(({ setTranscriptionMode }) => {
//      setTranscriptionMode(true);  // true = OLD mode, false = MS Teams mode
//    });
//
// OPTION 3: Check current mode
//    Click the 🔄 button in the UI or use:
//    import('./transcribing-ms-team.js').then(({ getCurrentTranscriptionMode }) => {
//      console.log(getCurrentTranscriptionMode());
//    });
//
// OPTION 4: Reset to default
//    import('./transcribing-ms-team.js').then(({ resetToDefaultMode }) => {
//      resetToDefaultMode();
//    });
//
// ============================================================================

import { webSocketService } from './websocket-service.js';

// ============================================================================
// DEVELOPER CONFIGURATION
// ============================================================================
// Set this to true to use the old live transcribe mode instead of MS Teams mode
// Set this to false to use the new MS Teams caption extraction mode
const USE_OLD_LIVE_TRANSCRIBE_MODE = false; // 🔧 Developer setting

// ============================================================================
// STATE VARIABLES
// ============================================================================
let lastProcessedCaptions = new Set();
let captionCounter = 0;
let isMonitoring = false;
let monitoringInterval = null;

// Add the same variables as checkTranscript for consistency
let lastFinalizedIndex = null;
let currentLiveIndex = null;
let currentLiveText = "";

// ============================================================================
// MODE CONTROL FUNCTIONS
// ============================================================================
// Get current transcription mode
export function getTranscriptionMode() {
  return {
    isOldMode: USE_OLD_LIVE_TRANSCRIBE_MODE,
    isNewMode: !USE_OLD_LIVE_TRANSCRIBE_MODE,
    modeName: USE_OLD_LIVE_TRANSCRIBE_MODE ? 'Old Live Transcribe' : 'MS Teams Caption'
  };
}

// Check if we should use the old live transcribe mode
function shouldUseOldMode() {
  // Respect runtime override if set, otherwise use constant
  return runtimeModeOverride !== null ? runtimeModeOverride : USE_OLD_LIVE_TRANSCRIBE_MODE;
}

// ============================================================================
// RUNTIME MODE CONTROL (for developers)
// ============================================================================
// Note: This is a runtime override - the constant above is the default
let runtimeModeOverride = null;

// Set transcription mode at runtime (overrides the constant)
export function setTranscriptionMode(useOldMode) {
  if (typeof useOldMode === 'boolean') {
    runtimeModeOverride = useOldMode;
    console.log(`🔄 Transcription mode changed to: ${useOldMode ? 'OLD Live Transcribe' : 'MS Teams Caption'}`);
    
    // If switching to old mode, stop any active MS Teams monitoring
    if (useOldMode && isMonitoring) {
      stopMSTeamsMonitoring();
      stopDOMObserver();
    }
    
    return true;
  } else {
    console.error('❌ Invalid mode parameter. Use true for OLD mode, false for MS Teams mode');
    return false;
  }
}

// Get current runtime mode (respects both constant and runtime override)
export function getCurrentTranscriptionMode() {
  const effectiveMode = runtimeModeOverride !== null ? runtimeModeOverride : USE_OLD_LIVE_TRANSCRIBE_MODE;
  return {
    isOldMode: effectiveMode,
    isNewMode: !effectiveMode,
    modeName: effectiveMode ? 'Old Live Transcribe' : 'MS Teams Caption',
    isRuntimeOverride: runtimeModeOverride !== null,
    defaultMode: USE_OLD_LIVE_TRANSCRIBE_MODE
  };
}

// Reset to default mode (removes runtime override)
export function resetToDefaultMode() {
  runtimeModeOverride = null;
  console.log('🔄 Transcription mode reset to default:', USE_OLD_LIVE_TRANSCRIBE_MODE ? 'OLD Live Transcribe' : 'MS Teams Caption');
}

// Display current transcription mode status in the UI
export function displayTranscriptionModeStatus() {
  const mode = getCurrentTranscriptionMode();
  const statusText = `
🔄 Transcription Mode Status:
📝 Current Mode: ${mode.modeName}
⚙️  Runtime Override: ${mode.isRuntimeOverride ? 'Yes' : 'No'}
🔧 Default Setting: ${mode.defaultMode ? 'OLD Live Transcribe' : 'MS Teams Caption'}
🎯 MS Teams Monitoring: ${mode.isOldMode ? 'Disabled' : 'Enabled'}
  `.trim();
  
  console.log(statusText);
  return statusText;
}

// MS Teams caption selectors
const MS_TEAMS_SELECTORS = {
  // Main caption container - this is the avatar container that holds the caption
  CAPTION_CONTAINER: 'div[data-tid="closed-captions-v2-items-renderer"]',
  // Individual caption text elements
  CAPTION_TEXT: 'span[data-tid="closed-caption-text"]',
  // Author/speaker name
  AUTHOR_NAME: 'span[data-tid="author"]',
  // Caption message container - the full message wrapper
  MESSAGE_CONTAINER: '.fui-ChatMessageCompact',
  // Alternative: find captions within the chat message body
  MESSAGE_BODY: '.fui-ChatMessageCompact__body'
};

// Helper function to extract caption text (equivalent to textEl.innerText.trim())
function extractCaptionText(messageElement) {
  try {
    // Look for caption text within the message
    const captionTextElement = messageElement.querySelector(MS_TEAMS_SELECTORS.CAPTION_TEXT);
    if (captionTextElement) {
      return captionTextElement.textContent.trim();
    }
    
    // Fallback: try to find text in the message body
    const messageBody = messageElement.querySelector(MS_TEAMS_SELECTORS.MESSAGE_BODY);
    if (messageBody) {
      const textElements = messageBody.querySelectorAll('span');
      for (const element of textElements) {
        const text = element.textContent.trim();
        if (text && text.length > 0 && !element.hasAttribute('data-tid')) {
          return text;
        }
      }
    }
    
    return '';
  } catch (error) {
    console.error('❌ Error extracting caption text:', error);
    return '';
  }
}

// Helper function to extract author name
function extractAuthorName(messageElement) {
  try {
    // Look for author name within the message
    const authorElement = messageElement.querySelector(MS_TEAMS_SELECTORS.AUTHOR_NAME);
    if (authorElement) {
      return authorElement.textContent.trim();
    }
    
    // Fallback: try to find author in the message body
    const messageBody = messageElement.querySelector(MS_TEAMS_SELECTORS.MESSAGE_BODY);
    if (messageBody) {
      const authorElements = messageBody.querySelectorAll('span[data-tid="author"]');
      if (authorElements.length > 0) {
        return authorElements[0].textContent.trim();
      }
    }
    
    return 'Unknown Speaker';
  } catch (error) {
    console.error('❌ Error extracting author name:', error);
    return 'Unknown Speaker';
  }
}

// Start monitoring MS Teams captions
export function startMSTeamsMonitoring(appendToOverlay, updateLivePreview) {
  if (isMonitoring) {
    console.log('🔄 MS Teams monitoring already active');
    return;
  }

  // Check if we should use the old live transcribe mode
  if (shouldUseOldMode()) {
    console.log('🔄 Using OLD live transcribe mode (MS Teams monitoring disabled)');
    console.log('📝 To enable MS Teams mode, set USE_OLD_LIVE_TRANSCRIBE_MODE = false');
    return;
  }

  console.log('🎯 Starting MS Teams caption monitoring...');
  isMonitoring = true;

  // Check for captions every 500ms
  monitoringInterval = setInterval(() => {
    checkMSTeamsCaptions(appendToOverlay, updateLivePreview);
  }, 500);

  console.log('✅ MS Teams monitoring started');
}

// Stop monitoring MS Teams captions
export function stopMSTeamsMonitoring() {
  if (!isMonitoring) {
    console.log('🔄 MS Teams monitoring not active');
    return;
  }

  console.log('🛑 Stopping MS Teams caption monitoring...');
  isMonitoring = false;

  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }

  console.log('✅ MS Teams monitoring stopped');
}

// Check for new MS Teams captions - behaves exactly like checkTranscript
export function checkMSTeamsCaptions(appendToOverlay, updateLivePreview) {
  console.log("checkMSTeamsCaptions");
  
  try {
    // Find all MS Teams chat messages that contain captions
    const chatMessages = document.querySelectorAll(MS_TEAMS_SELECTORS.MESSAGE_CONTAINER);
    
    if (chatMessages.length === 0) {
      // No chat messages found - might not be in a Teams meeting
      return;
    }

    // Filter messages that have captions
    const messagesWithCaptions = Array.from(chatMessages).filter(message => {
      const hasCaption = message.querySelector(MS_TEAMS_SELECTORS.CAPTION_TEXT);
      const hasAuthor = message.querySelector(MS_TEAMS_SELECTORS.AUTHOR_NAME);
      return hasCaption && hasAuthor;
    });

    if (messagesWithCaptions.length === 0) {
      return;
    }

    // Create stable indexes based on message content, not timestamp
    const allCaptionIndexes = messagesWithCaptions.map((message, index) => {
      const text = extractCaptionText(message);
      const author = extractAuthorName(message);
      // Create a stable hash based on content
      return `ms_teams_${index}_${author}_${text}`.replace(/\s+/g, '_').substring(0, 50);
    });

    // Finalize previous caption when a new one appears (same logic as checkTranscript)
    if (allCaptionIndexes.length >= 2) {
      const prevIndex = allCaptionIndexes[allCaptionIndexes.length - 2];
      if (prevIndex && prevIndex !== lastFinalizedIndex) {
        const prevMessage = messagesWithCaptions[allCaptionIndexes.length - 2];
        const prevText = extractCaptionText(prevMessage);
        const prevAuthor = extractAuthorName(prevMessage);
        
        // Create a unique identifier for this specific caption
        const captionKey = `${prevAuthor} - ${prevText}`;
        
        if (prevText && prevAuthor && !lastProcessedCaptions.has(captionKey)) {
          lastProcessedCaptions.add(captionKey);
          lastFinalizedIndex = prevIndex;
          
          // Format as "Author - Text" as requested
          const formattedCaption = captionKey;
          
          // Display in transcript area (same as appendToOverlay)
          appendToOverlay(formattedCaption, false);
          
          // Send to WebSocket for classification (same as checkTranscript)
          const transcriptId = `ms_teams_${++captionCounter}_${Date.now()}`;
          const timestamp = new Date().toISOString();
          
          console.log(transcriptId + " " + formattedCaption + " " + timestamp);
          webSocketService.sendTranscriptForClassification(transcriptId, formattedCaption, timestamp);
          
          // Clean up old entries to prevent duplicates
          cleanupOldProcessedCaptions();
        }
      }
    }

    // Live preview for current (incomplete) caption (same logic as checkTranscript)
    const currentMessage = messagesWithCaptions[allCaptionIndexes.length - 1];
    const currentIndex = allCaptionIndexes[allCaptionIndexes.length - 1];
    
    if (!currentIndex || lastProcessedCaptions.has(currentIndex)) return;

    const currentText = extractCaptionText(currentMessage);
    const currentAuthor = extractAuthorName(currentMessage);
    
    if (!currentText || !currentAuthor) return;

    // Only update live preview if index or text has changed (same as checkTranscript)
    if (currentIndex !== currentLiveIndex || currentText !== currentLiveText) {
      currentLiveIndex = currentIndex;
      currentLiveText = currentText;
      
      // Format as "Author - Text" for live preview
      const formattedLiveCaption = `${currentAuthor} - ${currentText}`;
      
      updateLivePreview(formattedLiveCaption);
    }

  } catch (error) {
    console.error('❌ Error checking MS Teams captions:', error);
  }
}

// This function is no longer used - replaced with checkMSTeamsCaptions that behaves like checkTranscript
// Keeping for reference but not calling it
function processCaptionContainer(container, index, appendToOverlay, updateLivePreview) {
  console.log('⚠️ processCaptionContainer is deprecated - use checkMSTeamsCaptions instead');
}

// Alternative method: Monitor for new caption elements being added to DOM
export function startDOMObserver(appendToOverlay, updateLivePreview) {
  if (isMonitoring) {
    console.log('🔄 MS Teams DOM observer already active');
    return;
  }

  // Check if we should use the old live transcribe mode
  if (shouldUseOldMode()) {
    console.log('🔄 Using OLD live transcribe mode (MS Teams DOM observer disabled)');
    return;
  }

  console.log('👁️ Starting MS Teams DOM observer...');
  isMonitoring = true;

  // Create a MutationObserver to watch for new caption elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
                         // Check if the added node contains captions
             const captionElements = node.querySelectorAll && node.querySelectorAll(MS_TEAMS_SELECTORS.CAPTION_TEXT);
             const authorElements = node.querySelectorAll && node.querySelectorAll(MS_TEAMS_SELECTORS.AUTHOR_NAME);
             
             if ((captionElements && captionElements.length > 0) || (authorElements && authorElements.length > 0)) {
               console.log('🆕 New caption/author elements detected via DOM observer');
               // Process the new captions using the same logic as checkTranscript
               setTimeout(() => {
                 checkMSTeamsCaptions(appendToOverlay, updateLivePreview);
               }, 100); // Small delay to ensure DOM is fully updated
             }
          }
        });
      }
    });
  });

  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Store the observer for cleanup
  window.msTeamsObserver = observer;

  console.log('✅ MS Teams DOM observer started');
}

// Stop DOM observer
export function stopDOMObserver() {
  if (window.msTeamsObserver) {
    console.log('🛑 Stopping MS Teams DOM observer...');
    window.msTeamsObserver.disconnect();
    window.msTeamsObserver = null;
    isMonitoring = false;
    console.log('✅ MS Teams DOM observer stopped');
  }
}

// Get current monitoring status
export function getMSTeamsMonitoringStatus() {
  return {
    isMonitoring,
    captionCount: captionCounter,
    processedCaptions: lastProcessedCaptions.size,
    hasObserver: !!window.msTeamsObserver
  };
}

// Clear processed captions history
export function clearMSTeamsHistory() {
  lastProcessedCaptions.clear();
  captionCounter = 0;
  lastFinalizedIndex = null;
  currentLiveIndex = null;
  currentLiveText = "";
  console.log('🧹 MS Teams caption history cleared');
}

// Remove old processed captions to prevent memory issues
function cleanupOldProcessedCaptions() {
  if (lastProcessedCaptions.size > 100) {
    // Keep only the last 50 entries to prevent duplicates while maintaining recent history
    const entries = Array.from(lastProcessedCaptions);
    const recentEntries = entries.slice(-50);
    lastProcessedCaptions.clear();
    recentEntries.forEach(entry => lastProcessedCaptions.add(entry));
    console.log(`🧹 Cleaned up old processed captions, kept ${recentEntries.length} recent ones`);
  }
}

// Get current duplicate count for debugging
export function getDuplicateCount() {
  return {
    processedCaptions: lastProcessedCaptions.size,
    captionCounter: captionCounter,
    isMonitoring: isMonitoring
  };
}

// Clear duplicates from transcript area (useful for UI cleanup)
export function clearTranscriptDuplicates() {
  try {
    // Clear the transcript area to remove visual duplicates
    const transcriptArea = document.getElementById('transcript-area');
    if (transcriptArea) {
      transcriptArea.innerHTML = '';
      console.log('🧹 Cleared transcript area to remove duplicates');
    }
    
    // Also clear the middle panel if it exists
    const middlePanel = document.getElementById('blank-panel');
    if (middlePanel) {
      middlePanel.innerHTML = '';
      console.log('🧹 Cleared middle panel to remove duplicates');
    }
    
    // Clear the processed captions set to prevent future duplicates
    clearMSTeamsHistory();
    
    console.log('✅ All duplicates cleared from UI and memory');
  } catch (error) {
    console.error('❌ Error clearing transcript duplicates:', error);
  }
}

// Manual caption extraction (useful for testing)
export function extractCurrentMSCaptions() {
  try {
    const captions = [];
    const captionElements = document.querySelectorAll(MS_TEAMS_SELECTORS.CAPTION_TEXT);
    
    captionElements.forEach((element, index) => {
      const text = element.textContent.trim();
      if (text) {
        const authorElement = element.closest(MS_TEAMS_SELECTORS.MESSAGE_CONTAINER)?.querySelector(MS_TEAMS_SELECTORS.AUTHOR_NAME);
        const author = authorElement ? authorElement.textContent.trim() : 'Unknown Speaker';
        
        captions.push({
          index,
          text,
          author,
          timestamp: new Date().toISOString()
        });
      }
    });

    console.log(`📋 Found ${captions.length} current MS Teams captions:`, captions);
    return captions;

  } catch (error) {
    console.error('❌ Error extracting current MS Teams captions:', error);
    return [];
  }
}

// Test function to simulate caption processing - now matches checkTranscript behavior
export function testMSCaptionProcessing(appendToOverlay, updateLivePreview) {
  // Check if we should use the old live transcribe mode
  if (shouldUseOldMode()) {
    console.log('🧪 Using OLD live transcribe mode - MS Teams test disabled');
    console.log('📝 To test MS Teams mode, set USE_OLD_LIVE_TRANSCRIBE_MODE = false');
    return;
  }

  console.log('🧪 Testing MS Teams caption processing...');
  
  const testCaption = "This is a test caption from Microsoft Teams";
  const testAuthor = "Test Speaker";
  const transcriptId = `test_ms_teams_${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  // Simulate the same behavior as checkTranscript
  // 1. Display in transcript area (same as appendToOverlay) - using new format
  const formattedCaption = `${testAuthor} - ${testCaption}`;
  appendToOverlay(formattedCaption, false);
  
  // 2. Send to WebSocket for classification (same as checkTranscript)
  webSocketService.sendTranscriptForClassification(transcriptId, formattedCaption, timestamp);
  
  // 3. Also display in middle panel for immediate feedback
  if (typeof window.displayTranscriptInMiddlePanel === 'function') {
    window.displayTranscriptInMiddlePanel(testCaption, testAuthor);
  }
  
  // 4. Update live preview (same as checkTranscript) - using new format
  updateLivePreview(formattedCaption);
  
  console.log('✅ Test caption processed (matching checkTranscript behavior)');
  console.log('📝 Format: ' + formattedCaption);
}

// Auto-detect if we're in a Microsoft Teams meeting
export function detectMSTeamsMeeting() {
  try {
    // Check for Teams-specific elements
    const teamsIndicators = [
      'div[data-tid="closed-captions-v2-items-renderer"]',
      '.fui-ChatMessageCompact',
      'span[data-tid="closed-caption-text"]'
    ];

    const hasTeamsElements = teamsIndicators.some(selector => 
      document.querySelector(selector)
    );

    if (hasTeamsElements) {
      console.log('🎯 Microsoft Teams meeting detected');
      return true;
    } else {
      console.log('❌ Microsoft Teams meeting not detected');
      return false;
    }

  } catch (error) {
    console.error('❌ Error detecting MS Teams meeting:', error);
    return false;
  }
}

// Initialize MS Teams monitoring if meeting is detected
export function autoInitializeMSTeams(appendToOverlay, updateLivePreview) {
  // Check if we should use the old live transcribe mode
  if (shouldUseOldMode()) {
    console.log('🔄 Using OLD live transcribe mode - MS Teams auto-initialization disabled');
    console.log('📝 To enable MS Teams mode, set USE_OLD_LIVE_TRANSCRIBE_MODE = false');
    return false;
  }

  if (detectMSTeamsMeeting()) {
    console.log('🚀 Auto-initializing MS Teams monitoring...');
    startMSTeamsMonitoring(appendToOverlay, updateLivePreview);
    startDOMObserver(appendToOverlay, updateLivePreview);
    return true;
  }
  return false;
}

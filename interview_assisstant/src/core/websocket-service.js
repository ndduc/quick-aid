// WebSocket Service for Real-time Transcript Classification
// Connects to Java Spring Boot WebSocket endpoint via ngrok tunnel
import { getAccessToken, getCognitoId,
   getUserIdentifier, waitForAccessToken,
    waitForCognitoId, waitForUserIdentifier } from './token-store.js';

import { backendUrlComprehendWebSocket } from './environment.js';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 1000;
    this.reconnectDelay = 1000; // 1 second
    // this.backendUrl = 'wss://api.qikaid.com/comprehend/ws/transcript?access_token=';
    this.backendUrl = backendUrlComprehendWebSocket;
    this.messageQueue = [];
    this.onClassificationReceived = null;
    
    // Meeting detection
    this.isInMeeting = false;
    this.meetingDetectionInterval = null;
    this.currentSessionId = null;
    this.onMeetingStatusChange = null;
  }

  async init() {
    console.log('INIT GET ACCESS TOKEN');
    // get token (wait if not available yet)
    this.accessToken = await getAccessToken() || await waitForAccessToken(10000);
    this.cognitoId = await getCognitoId() || await waitForCognitoId(10000);
    this.userIdentifier = await getUserIdentifier() || await waitForUserIdentifier(10000);
    
    // Check if token needs refresh before connecting
    await this.checkAndRefreshToken();
    
    this.updateBackendUrlWithToken();
    this.connect();

    // Start meeting detection
    this.startMeetingDetection();

    // Set up token refresh monitoring
    this.setupTokenRefreshMonitoring();

    // return this; // so you can: const svc = await new WebSocketService().init()
  }

  // Check if token needs refresh and refresh if necessary
  async checkAndRefreshToken() {
    try {
      const { QIKAID_PLUGIN_QA_TOKENS } = await chrome.storage.local.get("QIKAID_PLUGIN_QA_TOKENS");
      if (!QIKAID_PLUGIN_QA_TOKENS?.token_timestamp) {
        console.log("[WebSocket] No token timestamp available");
        return;
      }

      const tokenTime = parseInt(QIKAID_PLUGIN_QA_TOKENS.token_timestamp);
      const currentTime = Date.now();
      const eightHoursInMs = 8 * 60 * 60 * 1000;
      
      // Check if token will expire within 8 hours (assuming 24h token lifetime)
      const isExpiringSoon = (currentTime - tokenTime) >= (24 * 60 * 60 * 1000 - eightHoursInMs);
      
      if (isExpiringSoon) {
        console.log("[WebSocket] Token expiring soon, requesting refresh from background script");
        // Request token refresh from background script
        chrome.runtime.sendMessage({ type: "REFRESH_TOKEN_REQUEST" });
        
        // Wait a bit for refresh to complete
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get updated token
        this.accessToken = await getAccessToken();
      }
    } catch (error) {
      console.error("[WebSocket] Error checking token refresh:", error);
    }
  }

  // Update backend URL with current token
  updateBackendUrlWithToken() {
    this.backendUrl = this.backendUrl
      + this.accessToken 
      + "&cognitoId=" + this.cognitoId 
      + "&userIdentifier=" + this.userIdentifier;
  }

  // Set up token refresh monitoring
  setupTokenRefreshMonitoring() {
    // Listen for token refresh notifications from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "TOKEN_REFRESHED") {
        console.log("[WebSocket] Token refreshed, updating connection");
        this.accessToken = message.newAccessToken;
        this.updateBackendUrlWithToken();
        
        // Reconnect with new token
        if (this.isConnected) {
          this.disconnect();
          setTimeout(() => this.connect(), 1000);
        }
      }
    });
  }

  // Start meeting detection service
  startMeetingDetection() {
    if (this.meetingDetectionInterval) {
      return; // Already running
    }

    
    // Check every 2 seconds for Teams meeting
    this.meetingDetectionInterval = setInterval(() => {
      this.checkTeamsMeeting();
    }, 2000);
  }

  // Check if we're in a Teams meeting
  checkTeamsMeeting() {
    const meetingIndicators = [
      'div[data-cid="call-screen-wrapper"]',
      'div[data-cid="meeting-page"]',
      'div[data-cid="meeting-container"]'
    ];

    const isInMeeting = meetingIndicators.some(selector => 
      document.querySelector(selector)
    );

    if (isInMeeting && !this.isInMeeting) {
      // Meeting started
      this.startMeetingSession();
    } else if (!isInMeeting && this.isInMeeting) {
      // Meeting ended
      this.endMeetingSession();
    }
  }

  // Start meeting session
  startMeetingSession() {
    this.isInMeeting = true;
    this.currentSessionId = `meeting_${Date.now()}`;
        
    // Ensure WebSocket is connected
    if (!this.isConnected) {
      this.connect();
    }
    
    // Send session start message
    this.sendSessionMessage('SESSION_START', {
      sessionId: this.currentSessionId,
      timestamp: new Date().toISOString()
    });
    
    // Notify status change
    if (this.onMeetingStatusChange) {
      this.onMeetingStatusChange(true, this.currentSessionId);
    }
  }

  // End meeting session
  endMeetingSession() {
    if (!this.isInMeeting) return;
        
    // Send custom meeting ended message
    this.sendCustomMessage('MEETING HAS ENDED');
    
    // Send session end message
    this.sendSessionMessage('SESSION_END', {
      sessionId: this.currentSessionId,
      timestamp: new Date().toISOString()
    });
    
    // Clear session state
    this.isInMeeting = false;
    this.currentSessionId = null;
    
    // Notify status change
    if (this.onMeetingStatusChange) {
      this.onMeetingStatusChange(false, null);
    }
    
    // Close WebSocket
    this.disconnect();
    
    // Clear all chat panels
    this.clearAllChatPanels();
  }

  // Clear all chat panels
  clearAllChatPanels() {
    
    // Clear transcript area (left panel)
    const transcriptArea = document.getElementById('transcript-area');
    if (transcriptArea) {
      transcriptArea.innerHTML = '';
    }
    
    // Clear middle panel (blank-panel)
    const middlePanel = document.getElementById('blank-panel');
    if (middlePanel) {
      middlePanel.innerHTML = '';
    }
    
    // Clear GPT response area (right panel)
    const gptResponseArea = document.getElementById('gpt-response-area');
    if (gptResponseArea) {
      gptResponseArea.innerHTML = '';
    }
    
  }

  // Send session messages
  sendSessionMessage(type, data) {
    const message = {
      type: type,
      ...data,
      source: 'interview-assistant'
    };

    if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  // Send custom messages
  sendCustomMessage(text) {
    const message = {
      type: 'CUSTOM_MESSAGE',
      text: text,
      timestamp: new Date().toISOString(),
      source: 'interview-assistant',
      sessionId: this.currentSessionId
    };

    if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  // Initialize WebSocket connection
  connect() {
    try {
      console.log(`Connecting to WebSocket backend: ${this.backendUrl}`);
      this.socket = new WebSocket(this.backendUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected to backend');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.processMessageQueue();
      };

      this.socket.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        this.isConnected = false;
        this.handleReconnection();
      };

      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.handleReconnection();
    }
  }

  // Handle incoming messages from backend
  handleIncomingMessage(data) {
    try {
      const message = JSON.parse(data);
      console.log('Received from backend:', message);

      if (message.type === 'CLASSIFICATION_RESULT') {
        this.handleClassificationResult(message);
      } else if (message.type === 'QUESTION') {
        this.handleQuestionMessage(message);
      } else if (message.type === 'ERROR') {
        console.error('Backend error:', message.error);
      } else {
        console.log('Unknown message type:', message.type);
      }

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  // Handle classification results
  handleClassificationResult(message) {
    const { transcriptId, aiAnswer, classification, confidence, suggestions } = message;

    if (this.onClassificationReceived) {
      this.onClassificationReceived({
        transcriptId,
        aiAnswer,
        classification,
        confidence,
        suggestions
      });
    }

    console.log(`Classification for "${aiAnswer?.substring(0, 50)}...":`, {
      classification,
      confidence: confidence ? `${(confidence * 100).toFixed(1)}%` : 'N/A',
      suggestions: suggestions?.length || 0
    });
  }

  // Handle question messages and immediately set to middle panel
  handleQuestionMessage(message) {
    const { aiAnswer, transcriptId, originalQuestion, speakerFLName} = message;
    
    // Immediately append the question text to the middle panel
    const middlePanel = document.getElementById('blank-panel');
    if (middlePanel) {
      const timestamp = new Date().toLocaleTimeString();
      const questionEntry = `[${timestamp} - ${speakerFLName}]\nQuestion: ${originalQuestion || 'No question provided'}\nAnswer: ${aiAnswer || 'No answer provided'}\n\n`;
      
      // Append new question to existing content
      middlePanel.textContent += questionEntry;
      
      // Auto-scroll to bottom to show latest question
      middlePanel.scrollTop = middlePanel.scrollHeight;
      
      console.log(`Question appended to middle panel: ${aiAnswer?.substring(0, 50)}...`);
    } else {
      console.warn('Middle panel (blank-panel) not found');
    }

    // Log the question message
    console.log(`Question received:`, {
      transcriptId,
      text: text?.substring(0, 50) + '...'
    });
  }

  // Send transcript text
  sendTranscriptForClassification(transcriptId, text, timestamp) {
    const message = {
      type: 'TRANSCRIPT_TEXT',
      transcriptId,
      text: text.trim(),
      timestamp,
      source: 'interview-assistant',
      sessionId: this.currentSessionId
    };

    if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      console.log(`Sent transcript: ${text.substring(0, 50)}...`);
    } else {
      this.messageQueue.push(message);
      console.log(`Queued transcript (not connected): ${text.substring(0, 50)}...`);
    }
  }

  // Process queued messages
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`Processing ${this.messageQueue.length} queued messages...`);
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
        console.log(`Sent queued message: ${message.text?.substring(0, 50) || 'session message'}...`);
      }
    }
  }

  // Reconnection logic
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'User requested disconnect');
      this.socket = null;
      this.isConnected = false;
      console.log('WebSocket disconnected');
    }
  }

  // Get meeting status
  getMeetingStatus() {
    return {
      isInMeeting: this.isInMeeting,
      sessionId: this.currentSessionId,
      isConnected: this.isConnected
    };
  }

  // Set meeting status change callback
  setMeetingStatusCallback(callback) {
    this.onMeetingStatusChange = callback;
  }

  setClassificationCallback(callback) {
    this.onClassificationReceived = callback;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: this.socket?.readyState || 'CLOSED',
      reconnectAttempts: this.reconnectAttempts,
      meetingStatus: this.getMeetingStatus()
    };
  }

  async initialize() {
    console.log('Initializing WebSocketService...');
    // this.connect();
    this.init();
  }

  updateBackendUrl(newUrl) {
    this.backendUrl = newUrl;
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }
}

// Export singleton
export const webSocketService = new WebSocketService();

export { WebSocketService };

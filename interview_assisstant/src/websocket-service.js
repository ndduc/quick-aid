// WebSocket Service for Real-time Transcript Classification
// Connects to Java Spring Boot WebSocket endpoint via ngrok tunnel

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1 second
    this.backendUrl = 'wss://3475a7316a1f.ngrok-free.app/ws/transcript'; 
    this.messageQueue = [];
    this.onClassificationReceived = null;
  }

  // Initialize WebSocket connection
  connect() {
    try {
      console.log(`🔌 Connecting to WebSocket backend: ${this.backendUrl}`);
      this.socket = new WebSocket(this.backendUrl);

      this.socket.onopen = () => {
        console.log('✅ WebSocket connected to backend');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.processMessageQueue();
      };

      this.socket.onmessage = (event) => {
        this.handleIncomingMessage(event.data);
      };

      this.socket.onclose = (event) => {
        console.log('❌ WebSocket connection closed:', event.code, event.reason);
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
      console.log('📨 Received from backend:', message);

      if (message.type === 'CLASSIFICATION_RESULT') {
        this.handleClassificationResult(message);
      } else if (message.type === 'QUESTION') {
        this.handleQuestionMessage(message);
      } else if (message.type === 'ERROR') {
        console.error('❌ Backend error:', message.error);
      } else {
        console.log('📝 Unknown message type:', message.type);
      }

    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
    }
  }

  // Handle classification results
  handleClassificationResult(message) {
    const { transcriptId, text, classification, confidence, suggestions } = message;

    if (this.onClassificationReceived) {
      this.onClassificationReceived({
        transcriptId,
        text,
        classification,
        confidence,
        suggestions
      });
    }

    console.log(`🏷️ Classification for "${text?.substring(0, 50)}...":`, {
      classification,
      confidence: confidence ? `${(confidence * 100).toFixed(1)}%` : 'N/A',
      suggestions: suggestions?.length || 0
    });
  }

  // Handle question messages and immediately set to middle panel
  handleQuestionMessage(message) {
    const { text, transcriptId, originalQuestion, userFLName} = message;
    
    // Immediately append the question text to the middle panel
    const middlePanel = document.getElementById('blank-panel');
    if (middlePanel) {
      const timestamp = new Date().toLocaleTimeString();
      const questionEntry = `[${timestamp} - ${userFLName}]\nQuestion: ${originalQuestion || 'No question provided'}\nAnswer: ${text || 'No answer provided'}\n\n`;
      
      // Append new question to existing content
      middlePanel.textContent += questionEntry;
      
      // Auto-scroll to bottom to show latest question
      middlePanel.scrollTop = middlePanel.scrollHeight;
      
      console.log(`❓ Question appended to middle panel: ${text?.substring(0, 50)}...`);
    } else {
      console.warn('⚠️ Middle panel (blank-panel) not found');
    }

    // Log the question message
    console.log(`❓ Question received:`, {
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
      source: 'interview-assistant'
    };

    if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      console.log(`📤 Sent transcript: ${text.substring(0, 50)}...`);
    } else {
      this.messageQueue.push(message);
      console.log(`📋 Queued transcript (not connected): ${text.substring(0, 50)}...`);
    }
  }

  // Process queued messages
  processMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 Processing ${this.messageQueue.length} queued messages...`);
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(message));
        console.log(`📤 Sent queued message: ${message.text.substring(0, 50)}...`);
      }
    }
  }

  // Reconnection logic
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'User requested disconnect');
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected');
    }
  }

  setClassificationCallback(callback) {
    this.onClassificationReceived = callback;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: this.socket?.readyState || 'CLOSED',
      reconnectAttempts: this.reconnectAttempts
    };
  }

  async initialize() {
    console.log('🚀 Initializing WebSocketService...');
    this.connect();
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
webSocketService.initialize();

export { WebSocketService };

// WebSocket Service for Real-time Transcript Classification
// Connects to Java Spring Boot WebSocket endpoint

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1 second
    this.backendUrl = null; // Will be set dynamically
    this.messageQueue = [];
    this.onClassificationReceived = null;
  }

  // Initialize WebSocket connection
  connect() {
    try {
      console.log('🔌 Connecting to WebSocket backend...');
    //   this.socket = new WebSocket(this.backendUrl);
      
    //   this.socket.onopen = (event) => {
    //     console.log('✅ WebSocket connected to backend');
    //     this.isConnected = true;
    //     this.reconnectAttempts = 0;
    //     this.processMessageQueue();
    //   };

    //   this.socket.onmessage = (event) => {
    //     this.handleIncomingMessage(event.data);
    //   };

    //   this.socket.onclose = (event) => {
    //     console.log('❌ WebSocket connection closed:', event.code, event.reason);
    //     this.isConnected = false;
    //     this.handleReconnection();
    //   };

    //   this.socket.onerror = (error) => {
    //     console.error('❌ WebSocket error:', error);
    //     this.isConnected = false;
    //   };

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
      } else if (message.type === 'ERROR') {
        console.error('❌ Backend error:', message.error);
      } else {
        console.log('📝 Unknown message type:', message.type);
      }

    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', error);
    }
  }

  // Handle classification results from backend
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

    // Log the classification result
    console.log(`🏷️ Classification for "${text.substring(0, 50)}...":`, {
      classification,
      confidence: `${(confidence * 100).toFixed(1)}%`,
      suggestions: suggestions?.length || 0
    });
  }

  // Send transcript text for classification
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
      console.log(`📤 Sent transcript for classification: ${text.substring(0, 50)}...`);
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
      console.log(`📋 Queued transcript message (not connected): ${text.substring(0, 50)}...`);
    }
  }

  // Process queued messages when connection is restored
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

  // Handle reconnection logic
  handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'User requested disconnect');
      this.socket = null;
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected');
    }
  }

  // Set callback for classification results
  setClassificationCallback(callback) {
    this.onClassificationReceived = callback;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: this.socket?.readyState || 'CLOSED',
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Initialize WebSocket service with URL from config
  async initialize() {
    try {
      // Import config dynamically to avoid circular dependencies
      const { getWebSocketBackendUrl } = await import('./config.js');
      this.backendUrl = getWebSocketBackendUrl();
      console.log('🔌 WebSocket backend URL:', this.backendUrl);
      this.connect();
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket service:', error);
      // Fallback to default URL
      this.backendUrl = 'ws://localhost:8080/ws/transcript';
      this.connect();
    }
  }

  // Update backend URL (useful for different environments)
  updateBackendUrl(newUrl) {
    this.backendUrl = newUrl;
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }
}

// Create and export singleton instance
export const webSocketService = new WebSocketService();

  // Initialize with configurable URL
  webSocketService.initialize();

// Export the class for testing or multiple instances
export { WebSocketService };

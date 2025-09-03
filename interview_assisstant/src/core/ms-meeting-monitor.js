// Microsoft Teams Meeting Monitor
// Monitors meeting status and generates unique IDs for each meeting

import { extractMeetingTitle } from './ms-find-title-info.js';

// ============================================================================
// STATE VARIABLES
// ============================================================================
let isInMeeting = false;
let currentMeetingId = null;
let currentMeetingTitle = null;
let monitoringInterval = null;
let isMonitoring = false;

// ============================================================================
// MEETING DETECTION
// ============================================================================

// Check if user is currently in a Teams meeting
function checkMeetingStatus() {
  try {
    // Check for Teams meeting indicators
    const meetingIndicators = [
      'div[data-cid="call-screen-wrapper"]',
      'div[data-cid="meeting-page"]',
      'div[data-cid="meeting-container"]'
    ];

    const hasMeetingElements = meetingIndicators.some(selector => 
      document.querySelector(selector)
    );

    return hasMeetingElements;
  } catch (error) {
    console.error('Error checking meeting status:', error);
    return false;
  }
}

// Generate unique meeting ID (UUID only)
function generateMeetingId() {
  // Generate UUID v4
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  
  // Return only UUID in uppercase
  return uuid.toUpperCase();
}

// Get meeting title separately
function getMeetingTitle() {
  return extractMeetingTitle();
}

// ============================================================================
// MONITORING FUNCTIONS
// ============================================================================

// Start monitoring for meeting status changes
export function startMeetingMonitor() {
  if (isMonitoring) {
    console.log('Meeting monitor already running');
    return;
  }

  isMonitoring = true;
  console.log('Starting meeting monitor...');

  // Check every 2 seconds for meeting status changes
  monitoringInterval = setInterval(() => {
    const currentlyInMeeting = checkMeetingStatus();
    
    if (currentlyInMeeting && !isInMeeting) {
      // Meeting started
      handleMeetingStart();
    } else if (!currentlyInMeeting && isInMeeting) {
      // Meeting ended
      handleMeetingEnd();
    }
  }, 2000);
}

// Stop monitoring
export function stopMeetingMonitor() {
  if (!isMonitoring) {
    return;
  }

  isMonitoring = false;
  
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }

  console.log('Meeting monitor stopped');
}

// Handle meeting start
function handleMeetingStart() {
  isInMeeting = true;
  currentMeetingId = generateMeetingId();
  currentMeetingTitle = getMeetingTitle();
  
//   console.log(`🎯 Meeting Started:`);
//   console.log(`   Title: ${currentMeetingTitle || 'Unknown'}`);
//   console.log(`   ID: ${currentMeetingId}`);
  
  // Notify WebSocket service about meeting start
  if (window.webSocketService) {
    window.webSocketService.startMeetingSession();
  }
}

// Handle meeting end
function handleMeetingEnd() {
//   console.log(`🛑 Meeting Ended:`);
//   console.log(`   ID: ${currentMeetingId}`);
  
  // Notify WebSocket service about meeting end
  if (window.webSocketService) {
    window.webSocketService.endMeetingSession();
  }
  
  // Reset state
  isInMeeting = false;
  currentMeetingId = null;
  currentMeetingTitle = null;
  
  // Continue monitoring for new meetings
  console.log('🔄 Continuing to monitor for new meetings...');
}

// ============================================================================
// STATUS FUNCTIONS
// ============================================================================

// Get current meeting status
export function getMeetingStatus() {
  return {
    isInMeeting: isInMeeting,
    currentMeetingId: currentMeetingId,
    currentMeetingTitle: currentMeetingTitle,
    isMonitoring: isMonitoring
  };
}

// Get current meeting ID (null if not in meeting)
export function getCurrentMeetingId() {
  return currentMeetingId;
}

// Get current meeting title (null if not in meeting)
export function getCurrentMeetingTitle() {
  return currentMeetingTitle;
}

// Check if currently in meeting
export function isCurrentlyInMeeting() {
  return isInMeeting;
}

// Force end current meeting (for testing/manual control)
export function forceEndMeeting() {
  if (isInMeeting) {
    handleMeetingEnd();
  }
}

// Force start meeting (for testing/manual control)
export function forceStartMeeting() {
  if (!isInMeeting) {
    handleMeetingStart();
  }
}



// Clear session ID (for safety when meeting ends)
export function clearSessionId() {
//   console.log('🧹 Clearing session ID for safety');
  currentMeetingId = null;
  currentMeetingTitle = null;
  isInMeeting = false;
}

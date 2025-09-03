
// Extract meeting title from Teams page
export function extractMeetingTitle() {
  try {
    // Get the page title
    const pageTitle = document.title;
    
    if (!pageTitle) {
      return null;
    }

    // Parse the title format: "(2) Calendar | Place Holder | Microsoft Teams"
    // We want to extract "Place Holder" (the meeting name)
    const titleParts = pageTitle.split(' | ');
    
    if (titleParts.length >= 2) {
      // The meeting name is typically the second part (index 1)
      // Remove any leading/trailing whitespace and return
      const meetingName = titleParts[1].trim();
      
      // Filter out common non-meeting titles
      const commonTitles = ['Calendar', 'Chat', 'Files', 'Activity', 'Teams', 'Microsoft Teams'];
      if (commonTitles.includes(meetingName)) {
        console.log("No meeting title found");
        return null; // This is not a meeting
      }
      
      console.log("Meeting title found: ", meetingName);
      return meetingName;
    }
    
    // Fallback: if the format is different, try to extract from the title
    // Look for patterns like "(number) Meeting Name" or just "Meeting Name"
    const titleMatch = pageTitle.match(/\(?\d+\)?\s*(.+?)(?:\s*\|\s*Microsoft Teams)?$/);
    if (titleMatch && titleMatch[1]) {
      const extractedTitle = titleMatch[1].trim();
      // Filter out common non-meeting titles
      const commonTitles = ['Calendar', 'Chat', 'Files', 'Activity', 'Teams'];
      if (!commonTitles.includes(extractedTitle)) {
        return extractedTitle;
      }
    }
    console.log("No meeting title found");
    return null;
    
  } catch (error) {
    console.error('❌ Error extracting meeting title:', error);
    return null;
  }
}

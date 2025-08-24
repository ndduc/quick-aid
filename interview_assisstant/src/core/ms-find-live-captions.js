// MS Teams Live Caption Detection and Setup
// This file handles automatic detection and setup of live captions in MS Teams meetings

// Function to automatically setup MS Teams live captions
export function setupTeamsLiveCaptions() {
  console.log("🎯 Setting up MS Teams live captions...");
  console.log("🔍 Looking for Teams UI elements...");
  
  // Wait 5 seconds for Teams UI to fully load and stabilize
  console.log("⏱️ Waiting 5 seconds for Teams UI to fully load...");
  setTimeout(() => {
    try {
      // Step 1: Find and click the "..." More button
      console.log("🔍 Step 1: Finding More button...");
      const moreButton = findMoreButton();
      if (moreButton) {
        console.log("✅ Found More button, clicking to open menu...");
        console.log("📍 More button details:", {
          id: moreButton.id,
          'data-inp': moreButton.getAttribute('data-inp'),
          text: moreButton.textContent?.trim(),
          ariaLabel: moreButton.getAttribute('aria-label')
        });
        
        // Click the More button to open the menu
        moreButton.click();
        
        // Step 2: Wait for menu to appear and find "Language and speech"
        setTimeout(() => {
          console.log("🔍 Step 2: Looking for Language and speech menu...");
          const languageSpeechMenu = findLanguageSpeechMenu();
          if (languageSpeechMenu) {
            console.log("✅ Found Language and speech menu, hovering...");
            console.log("📍 Language menu details:", {
              id: languageSpeechMenu.id,
              'data-inp': languageSpeechMenu.getAttribute('data-inp'),
              text: languageSpeechMenu.textContent?.trim()
            });
            
            // Log all available menu items for debugging
            console.log("🔍 All available menu items:", Array.from(document.querySelectorAll('[role="menuitem"]')).map(item => ({
              text: item.textContent?.trim(),
              'data-inp': item.getAttribute('data-inp'),
              id: item.id
            })));
            
            languageSpeechMenu.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
            
            // Step 3: Wait for submenu and click on "Language and Speech"
            setTimeout(() => {
              console.log("🔍 Step 3: Looking for Language and Speech text to click...");
              const languageSpeechItem = findLanguageSpeechText();
              if (languageSpeechItem) {
                console.log("✅ Found Language and Speech text, ready to click");
                console.log("📍 Language and Speech item details:", {
                  id: languageSpeechItem.id,
                  'data-inp': languageSpeechItem.getAttribute('data-inp'),
                  text: languageSpeechItem.textContent?.trim()
                });
                
                // Click on the Language and Speech item to open submenu
                languageSpeechItem.click();
                console.log("🎯 Clicked on Language and Speech - submenu should now be open!");
                
                // Step 4: Wait for submenu and find "Show Live Captions" to click
                setTimeout(() => {
                  console.log("🔍 Step 4: Looking for Show Live Captions option to click...");
                  const liveCaptionsOption = findShowLiveCaptionsOption();
                  if (liveCaptionsOption) {
                    console.log("✅ Found Show Live Captions option, clicking to enable...");
                    console.log("📍 Live Captions option details:", {
                      id: liveCaptionsOption.id,
                      'data-inp': liveCaptionsOption.getAttribute('data-inp'),
                      text: liveCaptionsOption.textContent?.trim(),
                      ariaChecked: liveCaptionsOption.getAttribute('aria-checked')
                    });
                    
                    // Click on the Show Live Captions option to enable it
                    liveCaptionsOption.click();
                    console.log("🎯 Live captions enabled successfully!");
                  } else {
                    console.log("⚠️ Show Live Captions option not found");
                    console.log("🔍 Available submenu items:", Array.from(document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]')).map(item => ({
                      text: item.textContent?.trim(),
                      role: item.getAttribute('role'),
                      'data-inp': item.getAttribute('data-inp')
                    })));
                  }
                }, 500); // Wait for submenu to appear
              } else {
                console.log("⚠️ Language and Speech text not found");
                console.log("🔍 Available menu items:", Array.from(document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]')).map(item => ({
                  text: item.textContent?.trim(),
                  role: item.getAttribute('role'),
                  'data-inp': item.getAttribute('data-inp')
                })));
              }
            }, 500); // Wait for submenu to appear
          } else {
            console.log("⚠️ Language and speech menu not found");
            console.log("🔍 Available menu items:", Array.from(document.querySelectorAll('[role="menuitem"]')).map(item => ({
              text: item.textContent?.trim(),
              'data-inp': item.getAttribute('data-inp')
            })));
          }
        }, 500); // Wait for main menu to appear
      } else {
        console.log("⚠️ More button not found");
      }
    } catch (error) {
      console.error("❌ Error setting up live captions:", error);
    }
  }, 1000); // Wait 5 seconds for Teams UI to load
}

// Helper function to find the "..." More button
function findMoreButton() {
  // Primary method: Look for the exact data attribute from MS Teams
  const moreButton = document.querySelector('[data-inp="callingButtons-showMoreBtn"]');
  if (moreButton) {
    console.log("✅ Found More button using exact data attribute");
    return moreButton;
  }
  
  // Fallback method: Look for buttons with "More" text or similar
  const buttons = document.querySelectorAll('button, [role="button"]');
  for (const button of buttons) {
    const text = button.textContent?.toLowerCase() || '';
    if (text.includes('more') || text.includes('...') || button.title?.toLowerCase().includes('more')) {
      console.log("✅ Found More button using text fallback");
      return button;
    }
  }
  
  // Additional fallback: Look for elements with data attributes that might indicate the more button
  const fallbackMoreButton = document.querySelector('[data-inp*="more"], [data-inp*="showMore"]');
  if (fallbackMoreButton) {
    console.log("✅ Found More button using fallback data attribute");
    return fallbackMoreButton;
  }
  
  console.log("⚠️ More button not found using any method");
  return null;
}

// Helper function to find "Language and speech" menu item
function findLanguageSpeechMenu() {
  // Primary method: Look for exact text content "Language and speech"
  const menuItems = document.querySelectorAll('[role="menuitem"]');
  for (const item of menuItems) {
    const text = item.textContent?.trim() || '';
    if (text === "Language and speech") {
      console.log("✅ Found Language and speech using exact text match");
      return item;
    }
  }
  
  // Fallback method: Look for menu items with "Language and speech" text (case-insensitive)
  for (const item of menuItems) {
    const text = item.textContent?.toLowerCase() || '';
    if (text.includes('language') && text.includes('speech')) {
      console.log("✅ Found Language and speech using partial text match");
      return item;
    }
  }
  
  // Additional fallback: Look for elements with specific data attributes
  const languageMenu = document.querySelector('[data-inp="LanguageSpeechMenuControl-id"]');
  if (languageMenu) {
    console.log("✅ Found Language and speech using data attribute");
    return languageMenu;
  }
  
  console.log("⚠️ Language and speech menu not found using any method");
  return null;
}

// Helper function to find "Language and Speech" text and click on it
function findLanguageSpeechText() {
  // Look for menu items with "Language and Speech" text
  const menuItems = document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]');
  for (const item of menuItems) {
    const text = item.textContent?.trim() || '';
    if (text === "Language and Speech" || text === "Language and speech") {
      console.log("✅ Found Language and Speech text, ready to click");
      return item;
    }
  }
  
  // Fallback: Look for partial text match
  for (const item of menuItems) {
    const text = item.textContent?.toLowerCase() || '';
    if (text.includes('language') && text.includes('speech')) {
      console.log("✅ Found Language and Speech text using partial match, ready to click");
      return item;
    }
  }
  
  console.log("⚠️ Language and Speech text not found");
  return null;
}

// Helper function to find "Show Live Captions" option
function findShowLiveCaptionsOption() {
  // Look for menu items with "Show Live Captions" text
  const menuItems = document.querySelectorAll('[role="menuitem"], [role="menuitemcheckbox"]');
  for (const item of menuItems) {
    const text = item.textContent?.trim() || '';
    if (text === "Show Live Captions" || text === "Show live captions") {
      console.log("✅ Found Show Live Captions using exact text match");
      return item;
    }
  }
  
  // Fallback: Look for partial text match
  for (const item of menuItems) {
    const text = item.textContent?.toLowerCase() || '';
    if (text.includes('live') && text.includes('caption')) {
      console.log("✅ Found Show Live Captions using partial text match");
      return item;
    }
  }
  
  // Additional fallback: Look for checkboxes that might be unchecked
  const checkboxes = document.querySelectorAll('[role="menuitemcheckbox"]');
  for (const checkbox of checkboxes) {
    const text = checkbox.textContent?.toLowerCase() || '';
    if (text.includes('live') && text.includes('caption') && checkbox.getAttribute('aria-checked') === 'false') {
      console.log("✅ Found Show Live Captions checkbox using aria-checked state");
      return checkbox;
    }
  }
  
  console.log("⚠️ Show Live Captions option not found");
  return null;
}

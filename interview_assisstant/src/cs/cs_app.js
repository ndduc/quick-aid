const KEYS = [
    "access_token",
    "id_token",
    "refresh_token",
    "expires_in",
    "token_type",
    "token_timestamp",
    "user_identifier",
    "theme",
    "cognitoId"
  ];
  
  function sendTokens() {
    const payload = {};
    for (const k of KEYS) {
      payload[k] = localStorage.getItem(k) || null;
    }
    // only send if we actually have a token
    if (payload.access_token) {
      chrome.runtime.sendMessage({ type: "QA_TOKENS", payload });
    }
  }
  
  // initial read
  sendTokens();
  
  // pick up changes (note: 'storage' event fires when another tab updates it)
  window.addEventListener("storage", (e) => {
    if (KEYS.includes(e.key)) sendTokens();
  });
  
  // simple polling to catch same-tab updates
  setInterval(sendTokens, 1500);
  
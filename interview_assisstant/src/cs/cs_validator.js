(function(){
  const CHECK_INTERVAL_MS = 60000;

  function isTokenExpiringSoon(tokenTimestamp) {
    if (!tokenTimestamp) return true;
    const tokenTime = parseInt(tokenTimestamp);
    const currentTime = Date.now();
    const eightHoursInMs = 8 * 60 * 60 * 1000;
    return (currentTime - tokenTime) >= (24 * 60 * 60 * 1000 - eightHoursInMs);
  }

  async function performHealthCheck() {
    try {
      const { QIKAID_PLUGIN_QA_TOKENS } = await chrome.storage.local.get("QIKAID_PLUGIN_QA_TOKENS");
      const t = QIKAID_PLUGIN_QA_TOKENS;

      const hasAccess = !!t?.access_token;
      const hasRefresh = !!t?.refresh_token && !!t?.cognitoId;

      if (!hasAccess) {
        if (hasRefresh) {
          chrome.runtime.sendMessage({ type: "REFRESH_TOKEN_REQUEST" }, (resp) => {
            if (!resp || resp.success !== true) {
              chrome.runtime.sendMessage({ type: "LOCK_UI_AUTH_REQUIRED" });
            }
          });
        } else {
          chrome.runtime.sendMessage({ type: "LOCK_UI_AUTH_REQUIRED" });
        }
        return;
      }

      if (isTokenExpiringSoon(t.token_timestamp)) {
        if (hasRefresh) {
          chrome.runtime.sendMessage({ type: "REFRESH_TOKEN_REQUEST" }, (resp) => {
            if (!resp || resp.success !== true) {
              chrome.runtime.sendMessage({ type: "LOCK_UI_AUTH_REQUIRED" });
            }
          });
        } else {
          chrome.runtime.sendMessage({ type: "LOCK_UI_AUTH_REQUIRED" });
        }
      }
    } catch (e) {
      console.warn("[QikAid] Validator health check error", e);
    }
  }

  // Initial check and periodic monitor
  performHealthCheck();
  setInterval(performHealthCheck, CHECK_INTERVAL_MS);
})();
  
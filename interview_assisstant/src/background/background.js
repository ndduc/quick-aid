
let TOKENS = null;

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg?.type === "QIKAID_PLUGIN_QA_TOKENS") {
    TOKENS = msg.payload;
    chrome.storage.local.set({ QIKAID_PLUGIN_QA_TOKENS: TOKENS });
    console.log("[QikAid] tokens cached:", {
      user: TOKENS.user_identifier,
      expIn: TOKENS.expires_in
    });
    respond?.({ ok: true });
  }
});

// Helper to load cached tokens
async function getTokens() {
  if (TOKENS) return TOKENS;
  const { QIKAID_PLUGIN_QA_TOKENS } = await chrome.storage.local.get("QIKAID_PLUGIN_QA_TOKENS");
  TOKENS = QIKAID_PLUGIN_QA_TOKENS || null;
  return TOKENS;
}

// Example: call your API using the access_token
async function callApi() {
  const t = await getTokens();
  if (!t?.access_token) {
    console.warn("[QikAid] No access_token yet. Open http://localhost:3000 and log in.");
    return;
  }
  const res = await fetch("http://localhost:8081/some/protected/endpoint", {
    method: "GET",
    headers: { Authorization: `Bearer ${t.access_token}` }
  });
  console.log("[QikAid] API status:", res.status);
}

// Click the toolbar button to test the API call
chrome.action.onClicked.addListener(callApi);

// (Optional) WebSocket later:
// const ws = new WebSocket(`ws://localhost:8081/ws?token=${encodeURIComponent(TOKENS.access_token)}`);

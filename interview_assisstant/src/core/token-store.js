// src/token-store.js
let cache = null;
const listeners = new Set();

/** Get the full token object from chrome.storage.local (cached). */
export async function getTokens() {
  if (cache) return cache;
  const { QIKAID_PLUGIN_QA_TOKENS } = await chrome.storage.local.get('QIKAID_PLUGIN_QA_TOKENS');
  cache = QIKAID_PLUGIN_QA_TOKENS || null;
  return cache;
}

export function getTokensNonAsync() {
  if (cache) return cache;
  const { QIKAID_PLUGIN_QA_TOKENS } = chrome.storage.local.get('QIKAID_PLUGIN_QA_TOKENS');
  cache = QIKAID_PLUGIN_QA_TOKENS || null;
  return cache;
}


/** Get just the access token (string or null). */
export async function getAccessToken() {
  const t = await getTokens();
  return t?.access_token || null;
}

/** Get just the user identifier (string or null). */
export async function getUserIdentifier() {
  const t = await getTokens();
  return t?.user_identifier || null;
}

/** Get just the cognito ID (string or null). */
export async function getCognitoId() {
  const t = await getTokens();
  return t?.cognitoId || null;
}

/** Set/update tokens and notify listeners. Call this in background on QIKAID_PLUGIN_QA_TOKENS. */
export async function setTokens(tokens) {
  cache = tokens || null;
  await chrome.storage.local.set({ QIKAID_PLUGIN_QA_TOKENS: cache });
  listeners.forEach(fn => fn(cache));
}

/** Clear tokens. */
export async function clearTokens() {
  cache = null;
  await chrome.storage.local.remove('QIKAID_PLUGIN_QA_TOKENS');
  listeners.forEach(fn => fn(null));
}

/** Subscribe to token changes (returns unsubscribe). */
export function onTokenChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Keep cache in sync if another context updates storage. */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.QIKAID_PLUGIN_QA_TOKENS) {
    cache = changes.qa_tokens.newValue || null;
    listeners.forEach(fn => fn(cache));
  }
});

/** Wait until an access token exists (optional helper). */
export function waitForAccessToken(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let timer;
    const off = onTokenChange(t => {
      const at = t?.access_token;
      if (at) { off(); clearTimeout(timer); resolve(at); }
    });
    // check immediately in case it's already there
    getAccessToken().then(at => {
      if (at) { off(); clearTimeout(timer); resolve(at); }
    });
    if (timeoutMs) {
      timer = setTimeout(() => { off(); reject(new Error('Timed out waiting for access token')); }, timeoutMs);
    }
  });
}

export function waitForCognitoId(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let timer;
    const off = onTokenChange(t => {
      const at = t?.cognitoId;
      if (at) { off(); clearTimeout(timer); resolve(at); }
    });
    // check immediately in case it's already there
    getCognitoId().then(at => {
      if (at) { off(); clearTimeout(timer); resolve(at); }
    });
    if (timeoutMs) {
      timer = setTimeout(() => { off(); reject(new Error('Timed out waiting for cognitoId')); }, timeoutMs);
    }
  });
}

export function waitForUserIdentifier(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let timer;
    const off = onTokenChange(t => {
      const at = t?.user_identifier;
      if (at) { off(); clearTimeout(timer); resolve(at); }
    });
    // check immediately in case it's already there
    getUserIdentifier().then(at => {
      if (at) { off(); clearTimeout(timer); resolve(at); }
    });
    if (timeoutMs) {
      timer = setTimeout(() => { off(); reject(new Error('Timed out waiting for userIdentifier')); }, timeoutMs);
    }
  });
}




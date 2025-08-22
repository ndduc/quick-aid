// src/token-store.js
let cache = null;
const listeners = new Set();

/** Get the full token object from chrome.storage.local (cached). */
export async function getTokens() {
  if (cache) return cache;
  const { qa_tokens } = await chrome.storage.local.get('qa_tokens');
  cache = qa_tokens || null;
  return cache;
}

export function getTokensNonAsync() {
  if (cache) return cache;
  const { qa_tokens } = chrome.storage.local.get('qa_tokens');
  cache = qa_tokens || null;
  return cache;
}


/** Get just the access token (string or null). */
export async function getAccessToken() {
  const t = await getTokens();
  return t?.access_token || null;
}

/** Set/update tokens and notify listeners. Call this in background on QA_TOKENS. */
export async function setTokens(tokens) {
  cache = tokens || null;
  await chrome.storage.local.set({ qa_tokens: cache });
  listeners.forEach(fn => fn(cache));
}

/** Clear tokens. */
export async function clearTokens() {
  cache = null;
  await chrome.storage.local.remove('qa_tokens');
  listeners.forEach(fn => fn(null));
}

/** Subscribe to token changes (returns unsubscribe). */
export function onTokenChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Keep cache in sync if another context updates storage. */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.qa_tokens) {
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

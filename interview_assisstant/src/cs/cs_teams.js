// cs_teams.js — runs on https://teams.microsoft.com/*

(function () {
    const CONNECT = (why) =>
      chrome.runtime.sendMessage({ type: "QA_CONNECT", ctx: "teams", why });
  
    // 1) Connect once when the script loads
    CONNECT("loaded");
  
    // 2) Reconnect when the SPA URL changes (Teams navigates without full reloads)
    let lastHref = location.href;
    const mo = new MutationObserver(() => {
      if (location.href !== lastHref) {
        lastHref = location.href;
        CONNECT("url-change");
      }
    });
    mo.observe(document, { subtree: true, childList: true });
  
    // 3) Reconnect when the tab gains focus (user returns to Teams)
    window.addEventListener("focus", () => CONNECT("focus"));
  
    // 4) Manual reconnect hotkey: Alt+Q
    window.addEventListener("keydown", (e) => {
      if (e.altKey && e.key.toLowerCase() === "q") CONNECT("hotkey");
    });
  })();
  
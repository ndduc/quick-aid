let backendUrlAuth = "https://api.qikaid.com";
let backebdUrlApi = "https://api.qikaid.com";
let backendUrlComprehend = "https://api.qikaid.com";
let backendUrlComprehendWebSocket = backendUrlComprehend + "/comprehend/ws/transcript?access_token=";
let backendUrlAuthRefresh = backendUrlAuth + "/auth/token/refresh";
let backendUrlApiUserConfig = backebdUrlApi + "/api/v1/user";
let backendUrlApiQikAidBot = backebdUrlApi + "/api/v1/openai";

export { backendUrlComprehendWebSocket, backendUrlAuthRefresh, backendUrlApiUserConfig , backendUrlApiQikAidBot};
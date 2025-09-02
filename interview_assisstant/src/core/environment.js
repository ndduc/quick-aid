let backendUrlAuth = "https://api.qikaid.com";
let backebdUrlApi = "https://api.qikaid.com";
let backendUrlComprehend = "wss://fc19b4f9f05c.ngrok-free.app";
let backendUrlComprehendWebSocket = backendUrlComprehend + "/comprehend/ws/transcript?access_token=";
let backendUrlAuthRefresh = backendUrlAuth + "/auth/token/refresh";
let backendUrlApiUserConfig = backebdUrlApi + "/api/v1/user";
let backendUrlApiQikAidBot = backebdUrlApi + "/api/v1/openai";

    // this.backendUrl = 'wss://api.qikaid.com/comprehend/ws/transcript?access_token=';
    // this.backendUrl = 'wss://5c00f7077846.ngrok-free.app/comprehend/ws/transcript?access_token=';

export { backendUrlComprehendWebSocket, backendUrlAuthRefresh, backendUrlApiUserConfig , backendUrlApiQikAidBot};
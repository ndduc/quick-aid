let backendUrlAuth = "api.qikaid.com";
let backendUrlComprehend = "wss://f5014ba23ec5.ngrok-free.app";
let backendUrlComprehendWebSocket = backendUrlComprehend + "ws/transcript?access_token=";
let backendUrlAuthRefresh = backendUrlAuth + "/auth/token/refresh";

    // this.backendUrl = 'wss://api.qikaid.com/comprehend/ws/transcript?access_token=';
    // this.backendUrl = 'wss://5c00f7077846.ngrok-free.app/comprehend/ws/transcript?access_token=';

export { backendUrlComprehendWebSocket, backendUrlAuthRefresh };
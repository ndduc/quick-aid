// Available OpenAI models
export const AVAILABLE_MODELS = [
  "gpt-4o",
  "gpt-4o-mini", 
  "gpt-5",
  "gpt-5o",
  "gpt-5o-mini"
];


export function getApiKey() {
  return localStorage.getItem("openaiApiKey") || empty_key;
}

export function saveApiKey(key) {
  localStorage.setItem("openaiApiKey", key);
}

export function getOpenAiModel() {
  return localStorage.getItem("openaiModel") || "gpt-4o"; 
}

export function getJobRole() {
  return localStorage.getItem("jobRole") || "";
}

export function getJobSpecialy() {
  return localStorage.getItem("jobSpecialy") || "";
}

export function getExtraInterviewPrompt() {
  return localStorage.getItem("extraInterviewPrompt") || "";
}

export function getWebSocketBackendUrl() {
  return localStorage.getItem("websocketBackendUrl") || "ws://localhost:8080/ws/transcript";
}

export function saveWebSocketBackendUrl(url) {
  localStorage.setItem("websocketBackendUrl", url);
}
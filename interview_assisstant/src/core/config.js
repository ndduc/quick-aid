// Available OpenAI models
export const AVAILABLE_MODELS = [
  "gpt-4o",
  "gpt-4o-mini", 
  "gpt-5",
  "gpt-5o",
  "gpt-5o-mini"
];


export function getApiKey() {
  return "";
}

export function saveApiKey(key) {
  console.log("Deprecated function saveApiKey called");
}

export function getOpenAiModel() {
  // return localStorage.getItem("openaiModel") || "gpt-4o"; 
  return "";
}

export function getJobRole() {
  return "";
  // return localStorage.getItem("jobRole") || "";
}

export function getJobSpecialy() {
  // return localStorage.getItem("jobSpecialy") || "";
  return "";
}

export function getExtraInterviewPrompt() {
  // return localStorage.getItem("extraInterviewPrompt") || "";
  return "";
}

export function getWebSocketBackendUrl() {
  // return localStorage.getItem("websocketBackendUrl") || "ws://localhost:8080/ws/transcript";
  return "";
}

export function saveWebSocketBackendUrl(url) {
  console.log("Deprecated function saveWebSocketBackendUrl called");
}
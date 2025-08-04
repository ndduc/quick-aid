// config.js

const defaultMessages = [
  { role: "system", content: "You are a job interview assistant." }
];

const defaultScreenshotMessages = [
  { role: "system", content: "Complete the coding challenge." }
];

const defaultLang = ["Java", "Javascript"];
let empty_key = "sk-...CHAT_GPT_TOKEN_KEY"; 

// export function loadConfig() {
//   try {
//     const saved = JSON.parse(localStorage.getItem("gptPromptConfig"));
//     return {
//       messages: Array.isArray(saved?.messages) ? saved.messages : [...defaultMessages],
//       messagesScreenshootMode: Array.isArray(saved?.messagesScreenshootMode) ? saved.messagesScreenshootMode : [...defaultScreenshotMessages],
//       programLangForCoding: Array.isArray(saved?.programLangForCoding) ? saved.programLangForCoding : [...defaultLang],
//       // defaultOpenAiModel: defaultOpenAiModel
//     };
//   } catch (err) {
//     console.warn("Failed to parse localStorage config:", err);
//     return {
//       messages: [...defaultMessages],
//       messagesScreenshootMode: [...defaultScreenshotMessages],
//       programLangForCoding: [...defaultLang],
//       // defaultOpenAiModel: defaultOpenAiModel
//     };
//   }
// }

// export function saveConfig({ messages, messagesScreenshootMode, programLangForCoding }) {
//   localStorage.setItem("gptPromptConfig", JSON.stringify({
//     messages,
//     messagesScreenshootMode,
//     programLangForCoding
//   }));
// }

export function getApiKey() {
  return localStorage.getItem("openaiApiKey") || empty_key;
}

export function saveApiKey(key) {
  localStorage.setItem("openaiApiKey", key);
}


export function getOpenAiModel() {
  return localStorage.getItem("openaiModel"); 
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
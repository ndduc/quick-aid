// config.js

const defaultMessages = [
  { role: "system", content: "You are a job interview assistant." }
];

const defaultScreenshotMessages = [
  { role: "system", content: "Complete the coding challenge." }
];

const defaultLang = ["Java", "Javascript"];
const defaultOpenAiModel = "gpt-4o";
let dev_key = "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";
let empty_key = "sk-...CHAT_GPT_TOKEN_KEY"; 

export function loadConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem("gptPromptConfig"));
    return {
      messages: Array.isArray(saved?.messages) ? saved.messages : [...defaultMessages],
      messagesScreenshootMode: Array.isArray(saved?.messagesScreenshootMode) ? saved.messagesScreenshootMode : [...defaultScreenshotMessages],
      programLangForCoding: Array.isArray(saved?.programLangForCoding) ? saved.programLangForCoding : [...defaultLang],
      defaultOpenAiModel: defaultOpenAiModel
    };
  } catch (err) {
    console.warn("Failed to parse localStorage config:", err);
    return {
      messages: [...defaultMessages],
      messagesScreenshootMode: [...defaultScreenshotMessages],
      programLangForCoding: [...defaultLang],
      defaultOpenAiModel: defaultOpenAiModel
    };
  }
}

export function saveConfig({ messages, messagesScreenshootMode, programLangForCoding }) {
  localStorage.setItem("gptPromptConfig", JSON.stringify({
    messages,
    messagesScreenshootMode,
    programLangForCoding
  }));
}

export function getApiKey() {
  return localStorage.getItem("openaiApiKey") || empty_key;
}

export function saveApiKey(key) {
  localStorage.setItem("openaiApiKey", key);
}


export function getOpenAiModel() {
  return localStorage.getItem("openaiModel") || defaultOpenAiModel; 
}
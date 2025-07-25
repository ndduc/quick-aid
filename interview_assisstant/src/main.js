import { fetchGPTResponse, sendImageToGPT } from './open-ai.js';
import {loadConfig, saveConfig, getApiKey, saveApiKey} from './config.js'
import {checkTranscript} from './transcribing-logic.js'
import {createHeader, createContentArea, createOverlay, createResizer, createInputSection, createConfigBtn, createConfigModal} from './ui.js'

let OPENAI_API_KEY = getApiKey();

let lastLine = "";
const transcriptLog = new Set();

let messages = loadConfig().messages;
let messagesScreenshootMode =loadConfig().messagesScreenshootMode;
let programLangForCoding = loadConfig().programLangForCoding;
let OPENAI_MODEL = loadConfig().defaultOpenAiModel;

let isDragging = false, offsetX = 0, offsetY = 0;
let isMinimized = false;
let isConfigOpen = false;
let isResizing = false;


// === Overlay Container (shell) ===
const overlay = createOverlay();
document.body.appendChild(overlay);

const resizer = createResizer();
overlay.appendChild(resizer);
resizer.addEventListener("mousedown", (e) => {
  e.preventDefault();
  isResizing = true;
  document.body.style.userSelect = "none";
});

document.addEventListener("mousemove", (e) => {
  if (!isResizing) return;
  const rect = overlay.getBoundingClientRect();
  const newWidth = e.clientX - rect.left;
  const newHeight = e.clientY - rect.top;
  if (newWidth > 300) overlay.style.width = `${newWidth}px`;    // min width
  if (newHeight > 200) overlay.style.height = `${newHeight}px`;  // min height
});

document.addEventListener("mouseup", () => {
  isResizing = false;
  document.body.style.userSelect = "";
});


// === Header with Minimize Button ===
const {header} = createHeader();
overlay.appendChild(header);

// === Scrollable Content Area ===
const contentArea = createContentArea();
overlay.appendChild(contentArea);

// === Bottom Input Section ===
const {inputSection, input, askBtn, screenshotBtn} = createInputSection(submitCustomPrompt);
overlay.appendChild(inputSection);
askBtn.onclick = submitCustomPrompt;
// input.addEventListener("keydown", (e) => {
//   if (e.key === "Enter") submitCustomPrompt();
// });

overlay.appendChild(contentArea);

// === SCREENSHOT Button Logic ===
inputSection.appendChild(screenshotBtn);

// === Minimize toggle logic ===
// minimizeBtn.onclick = () => {
//   isMinimized = !isMinimized;
//   contentArea.style.display = isMinimized ? "none" : "block";
//   minimizeBtn.textContent = isMinimized ? "+" : "–";
// };

// === Drag functionality ===
header.addEventListener("mousedown", (e) => {
  isDragging = true;
  const rect = overlay.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    overlay.style.left = `${e.clientX - offsetX}px`;
    overlay.style.top = `${e.clientY - offsetY}px`;
    overlay.style.right = "auto"; // remove fixed right positioning
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});


// === Check for New Transcript Lines ===
setInterval(() => checkTranscript(transcriptLog, appendToOverlay, updateLivePreview), 1000);

// === Right-click Context Menu for GPT ===
document.addEventListener("contextmenu", (e) => {
  const selection = window.getSelection().toString().trim();
  if (selection.length === 0) return;


  const options = [
    { label: "💬 Ask GPT about this", prefix: "" },
    {
      label: "📘 Explain briefly (interview-friendly)",
      prefix: "Briefly explain this in a way that's clear and friendly for a software engineering interview conversation: ",
    },
    {
      label: "🛠️ Real-world use case (interview-friendly)",
      prefix: "Give a real-world use case, explained in a clear and conversational way suitable for a software engineering interview: ",
    },
    {
      label: "🧩 Explain + Use Case (interview-friendly)",
      prefix: "Briefly explain this and provide some basic use case (dont go to much into detail). Make it sound natural and appropriate for a software engineering interview: ",
    },
  ];


  const menu = document.createElement("div");
  menu.style.cssText = `
    position: fixed;
    top: ${e.pageY}px;
    left: ${e.pageX}px;
    background: #fefefe;
    border: 1px solid #ccc;
    padding: 4px;
    font-size: 13px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 1000000;
  `;

  options.forEach(({ label, prefix }) => {
    const item = document.createElement("div");
    item.textContent = label;
    item.style.cssText = `
      padding: 6px 8px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
    `;
    item.onmouseenter = () => item.style.background = "#eee";
    item.onmouseleave = () => item.style.background = "transparent";
    item.onclick = async () => {
      const prompt = prefix + selection;
      appendToOverlay(`➡️ You: ${prompt}`);
      appendToOverlay("🧠 GPT: ...thinking");
      const reply = await fetchGPTResponse(prompt, messages);
      document.querySelectorAll(".gpt-response").forEach((el) => {
        if (el.textContent === "🧠 GPT: ...thinking") el.remove();
      });
      appendToOverlay(reply, true);
      menu.remove();
    };
    menu.appendChild(item);
  });

  document.body.appendChild(menu);

  // Close menu on outside click
  setTimeout(() => {
    document.addEventListener("click", () => menu.remove(), { once: true });
  }, 10);

  e.preventDefault();
});

screenshotBtn.onclick = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { mediaSource: "screen" }
    });
    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const bitmap = await imageCapture.grabFrame();

    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    track.stop();

    const dataUrl = canvas.toDataURL("image/png");
    appendImageToOverlay(dataUrl);

    // Send to GPT
    appendToOverlay("🧠 GPT: ...analyzing image");
    const reply = await sendImageToGPT(dataUrl, messagesScreenshootMode);
    document.querySelectorAll(".gpt-response").forEach((el) => {
      if (el.textContent === "🧠 GPT: ...analyzing image") el.remove();
    });
    appendToOverlay(reply, true);
  } catch (err) {
    console.error("Screenshot failed:", err);
    appendToOverlay("⚠️ Failed to capture screenshot.");
  }
};

const configBtn = createConfigBtn();
header.appendChild(configBtn);

const {configModal, apiKeyInput, textarea, saveConfigBtn} = createConfigModal(OPENAI_API_KEY, OPENAI_MODEL);
document.body.appendChild(configModal);

configBtn.onclick = () => {
  isConfigOpen = !isConfigOpen;
  if (isConfigOpen) {
    const editable = {
      messages,
      messagesScreenshootMode
    };
    textarea.value = JSON.stringify(editable, null, 2);
    configModal.style.display = "block";
  } else {
    configModal.style.display = "none";
  }
};


saveConfigBtn.onclick = () => {
  try {
    const parsed = JSON.parse(textarea.value);
    if (Array.isArray(parsed.programLangForCoding)) {
      programLangForCoding.length = 0;
      programLangForCoding.push(...parsed.programLangForCoding);
    }
    if (Array.isArray(parsed.messages)) {
      messages.length = 0;
      messages.push(...parsed.messages);
    }
    if (Array.isArray(parsed.messagesScreenshootMode)) {
      messagesScreenshootMode.length = 0;
      messagesScreenshootMode.push(...parsed.messagesScreenshootMode);
    }

    // Save API Key
    const key = apiKeyInput.value.trim();
    if (key) {
      OPENAI_API_KEY = key;
      localStorage.setItem("openaiApiKey", key);
    }


    // Save to localStorage
    localStorage.setItem("gptPromptConfig", JSON.stringify({programLangForCoding, messages, messagesScreenshootMode }));
    appendToOverlay("✅ Config saved to localStorage!");
  } catch (e) {
    appendToOverlay("❌ Invalid JSON in config.");
    console.error(e);
  }
};

// === Ask Button Logic ===
function submitCustomPrompt() {
  const value = "Briefly explain this and provide some basic use case (dont go to much into detail). Make it sound natural and appropriate for a software engineering interview: " + input.value.trim();
  if (!value) return;
  appendToOverlay(`➡️ You: ${value}`);
  appendToOverlay("🧠 GPT: ...thinking");
  input.value = "";
  fetchGPTResponse(value, messages).then(reply => {
    document.querySelectorAll(".gpt-response").forEach((el) => {
      if (el.textContent === "🧠 GPT: ...thinking") el.remove();
    });
    appendToOverlay(reply, true);
  });
}



function appendImageToOverlay(dataUrl) {
  const img = document.createElement("img");
  img.src = dataUrl;
  img.style.cssText = "max-width: 100%; margin: 8px 0; border: 1px solid #ccc;";
  contentArea.appendChild(img);
  contentArea.scrollTop = contentArea.scrollHeight;
}



function appendToOverlay(text, isGPT = false) {
  const isAtBottom =
    contentArea.scrollHeight - contentArea.scrollTop <= contentArea.clientHeight + 20;

  const p = document.createElement("div");
  p.textContent = isGPT ? `🧠 GPT: ${text}` : text;
  p.style.marginBottom = "8px";
  p.style.cursor = "text";
  p.style.userSelect = "text";
  p.style.webkitUserSelect = "text";
  p.className = isGPT ? "gpt-response" : "transcript-line";

  contentArea.appendChild(p);

  // Only scroll to bottom if user hasn't scrolled up
  if (isAtBottom) {
    contentArea.scrollTop = contentArea.scrollHeight;
  }
}




let livePreviewElement = null;
// function updateLivePreview(text) {
//   if (!livePreviewElement) {
//     livePreviewElement = document.createElement("div");
//     livePreviewElement.style.cssText = "margin-top: 10px; opacity: 0.6; font-style: italic;";
//     contentArea.appendChild(livePreviewElement);
//   }

//   livePreviewElement.textContent = text;
//   contentArea.scrollTop = contentArea.scrollHeight;
// }
function updateLivePreview(text) {
  if (!livePreviewElement) {
    livePreviewElement = document.createElement("div");
    livePreviewElement.style.cssText = `
      margin-top: 10px;
      opacity: 0.6;
      font-style: italic;
      color: #444;
    `;
  }

  livePreviewElement.textContent = text;

  // Move it to the bottom of the content area
  contentArea.appendChild(livePreviewElement);
  contentArea.scrollTop = contentArea.scrollHeight;
}

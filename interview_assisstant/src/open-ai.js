// gpt-api.js

export let OPENAI_API_KEY = localStorage.getItem("openaiApiKey") || "sk-proj-...default-fallback-key";

export async function fetchGPTResponse(question, messages) {
  messages.push({ role: "user", content: question });

  const payload = {
    model: "gpt-4o",
    messages: messages,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content || "No response";
  messages.push({ role: "assistant", content: reply });
  return reply;
}

export async function sendImageToGPT(imageDataUrl, messagesScreenshootMode) {
  const base64 = imageDataUrl.split(",")[1];

  let langNote = "Javascript";
  try {
    const config = JSON.parse(localStorage.getItem("gptPromptConfig"));
    const langs = config?.programLangForCoding || [];
    if (langs.length > 0) langNote = `\nPreferred language(s): ${langs.join(", ")}.\n`;
  } catch (e) {
    console.warn("Failed to load language config", e);
  }

  const visionMessages = [
    ...messagesScreenshootMode,
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `IF the content is a coding challenge, solve it.
Focus on solving, and explain briefly. Add comments where needed. Programming Language: ${langNote}`
        },
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${base64}` }
        }
      ]
    }
  ];

  const payload = {
    model: "gpt-4o",
    messages: visionMessages,
    max_tokens: 1000,
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content || "No response from GPT.";
  return reply;
}

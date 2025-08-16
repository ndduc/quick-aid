// gpt-api.js

const openAiUrl = "https://api.openai.com/v1/chat/completions";

export function generateInterviewPayload(jobRole, specialty, extraPrompt) {
  var messages = [
      {
        role: "system",
        content: `You are an experienced ${jobRole} helping someone prepare for a job interview. 
        Answer questions clearly and concisely. Specialize in ${specialty}.
         ${extraPrompt}`
      }
      // ,
      // {
      //   role: "user",
      //   content: question
      // }
  ];
  return messages;
}

export function generateInterviewPayloadForScreenshotMode(jobRole, specialty, extraPrompt) {
    var messages = [
      {
        role: "system",
        content: `You are an experienced ${jobRole} helping someone prepare for a job interview. 
        Completed the coding challenge. Specialize in ${specialty}.
         ${extraPrompt}`
      }
      // ,
      // {
      //   role: "user",
      //   content: question
      // }
    ];
  return messages;
}


export async function fetchGPTResponse(question, messages, apiKey, aiModel) {
  messages.push({ role: "user", content: question });

  if (aiModel.includes("gpt")) {
    aiModel = "gpt-4-turbo" 
  }
  const payload = {
    temperature: 0.2,
    max_tokens: 150,
    model: aiModel,
    messages: messages,
  };

  let url = openAiUrl;
  if (aiModel.includes("gpt")) {
    url = openAiUrl;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content || "No response";
  messages.push({ role: "assistant", content: reply });
  return reply;
}

export async function sendImageToGPT(imageDataUrl, messagesScreenshootMode, apiKey, aiModel) {
  const base64 = imageDataUrl.split(",")[1];

  // let langNote = "Javascript";
  // try {
  //   const config = JSON.parse(localStorage.getItem("gptPromptConfig"));
  //   const langs = config?.programLangForCoding || [];
  //   if (langs.length > 0) langNote = `\nPreferred language(s): ${langs.join(", ")}.\n`;
  // } catch (e) {
  //   console.warn("Failed to load language config", e);
  // }

  const visionMessages = [
    ...messagesScreenshootMode,
    {
      role: "user",
      content: [
//         {
//           type: "text",
//           text: `IF the content is a coding challenge, solve it.
// Focus on solving, and explain briefly. Add comments where needed. Programming Language: ${langNote}`
//         },
        {
          type: "image_url",
          image_url: { url: `data:image/png;base64,${base64}` }
        }
      ]
    }
  ];

  const payload = {
    temperature: 0.2,
    model: aiModel,
    messages: visionMessages,
    max_tokens: 10000,
  };

  let url = openAiUrl;
  if (aiModel.includes("gpt")) {
    url = openAiUrl;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content || "No response from API.";
  return reply;
}

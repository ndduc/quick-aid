# QuickAid — Your Real-Time Meeting & Interview Assistant

**QuickAid** is a Chrome extension designed to assist users during live meetings, interviews, and coding challenges by integrating seamlessly with **Tactiq** (caption plugin) and **OpenAI's API**.

It captures transcribed text from Google Meet (via Tactiq), enables fast AI-driven insights, and even allows screenshot-based question support — all without disrupting your workflow.

---

## ✨ Features

- ✅ **Tactiq Integration**: Automatically captures live transcript text from the Tactiq plugin and displays it in the QuickAid assistant panel.
- 🧠 **AI-Driven Text Answers**: Right-click on any transcribed text and ask OpenAI a follow-up question using pre-defined or custom prompt templates.
- ⌨️ **Custom Questions**: Manually type in any question to ask OpenAI on the spot.
- 🖼️ **Screenshot to AI**: Instantly capture part of your screen and send the image to OpenAI for visual-based analysis (great for coding or diagram questions).
- 💬 **Live Overlay UI**: Floating, draggable UI that keeps your assistant visible but non-intrusive.

---

## 🔧 Requirements

- **Tactiq Chrome Extension** must be installed and active during your meeting.
- **OpenAI API Key** is required to use any AI-powered features.
  - You can enter your key securely through the extension's configuration modal.
- Works best on **Google Meet** and other platforms supported by Tactiq.

---

## 🚀 Getting Started

1. **Install Tactiq** from the [Chrome Web Store](https://chrome.google.com/webstore/detail/tactiq-transcription-highl/)
2. **Install QuickAid** (this extension).
3. Click the QuickAid icon → Open the config modal → Paste your OpenAI API key.
4. Join a Google Meet and start Tactiq → Transcripts will appear in the QuickAid overlay.
5. Use right-click on any transcript or type your own question to query OpenAI.

---

## 📸 Screenshot-Based AI Support

- Click the camera icon in QuickAid’s UI to take a screenshot.
- The image will be sent to OpenAI’s vision model.
- AI will respond based on the contents of the screenshot (e.g. code, UI, diagrams).

---

## 📌 Use Cases

- Live coding interviews (ask for use cases or fixes)
- Technical meetings (summarize or clarify answers)
- Product demos (take screenshots and ask for explanations)
- Job interviews (get quick help answering behavioral or tech questions)

---

## 🛡️ Privacy & Security

- Your OpenAI key is stored **locally** in your browser (not uploaded anywhere).
- Screenshots and prompts are only sent to OpenAI’s API (with your key).
- Transcripts are processed **only from your active Meet session** via Tactiq.

---

## 🗺️ Roadmap (Coming Soon)

- Native Google Meet caption support (without relying on Tactiq)
- Conversation history & saving answers
- Multi-prompt workflows for deeper explanation

---

## 🙋 Support

If you have feedback, suggestions, or issues, please open a GitHub issue or contact the developer.

---

> QuickAid is not affiliated with OpenAI or Tactiq. It enhances their functionality for your productivity.

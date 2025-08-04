

let lastFinalizedIndex = null;
let currentLiveIndex = null;
let currentLiveText = "";



export function checkTranscript(transcriptLog, appendToOverlay, updateLivePreview) {
  const transcriptElements = document.querySelectorAll(
    'div[data-index][data-known-size]'
  );
  if (transcriptElements.length === 0) return;

  const allIndexes = Array.from(transcriptElements).map(el =>
    el.getAttribute("data-index")
  );

  // Finalize previous index when a new one appears
  if (allIndexes.length >= 2) {
    const prevIndex = allIndexes[allIndexes.length - 2];
    if (prevIndex && prevIndex !== lastFinalizedIndex) {
      const prevElement = transcriptElements[transcriptElements.length - 2];
      const textEl = prevElement.querySelector(
        'div.flex-1.break-words.break-all.p-1.font-medium.text-inherit'
      );
      if (textEl) {
        const text = textEl.innerText.trim();
        if (text && !transcriptLog.has(prevIndex)) {
          transcriptLog.add(prevIndex);
          lastFinalizedIndex = prevIndex;
          appendToOverlay(text);
        }
      }
    }
  }

  // Live preview for current (incomplete) index
  const currentElement = transcriptElements[transcriptElements.length - 1];
  const currentIndex = allIndexes[allIndexes.length - 1];
  if (!currentIndex || transcriptLog.has(currentIndex)) return;

  const currentTextEl = currentElement.querySelector(
    'div.flex-1.break-words.break-all.p-1.font-medium.text-inherit'
  );
  if (!currentTextEl) return;

  const currentText = currentTextEl.innerText.trim();
  if (!currentText) return;

  // Only update live preview if index or text has changed
  if (currentIndex !== currentLiveIndex || currentText !== currentLiveText) {
    currentLiveIndex = currentIndex;
    currentLiveText = currentText;
    updateLivePreview(currentText);
  }
}

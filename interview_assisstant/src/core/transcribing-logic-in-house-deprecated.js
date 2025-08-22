

let lastFinalizedIndex = null;
let currentLiveIndex = null;
let currentLiveText = "";

// BUILT IN CODE 
let lastFinalizedText = "";

export function checkTranscript(transcriptLog, appendToOverlay, updateLivePreview) {
  const captionRegion = document.querySelector('[aria-label="Captions"][role="region"]');
  if (!captionRegion) return;

  // All caption containers (non-empty divs)
  const textContainers = Array.from(captionRegion.querySelectorAll('div')).filter(el =>
    el.innerText && el.innerText.trim().length > 0
  );

  if (textContainers.length === 0) return;

  // Finalized: second-to-last block
  if (textContainers.length >= 2) {
    const prevText = textContainers[textContainers.length - 2].innerText.trim();
    if (prevText && prevText !== lastFinalizedText && !transcriptLog.has(prevText)) {
      transcriptLog.add(prevText);
      lastFinalizedText = prevText;
      appendToOverlay(prevText);
    }
  }

  // Live caption block: last one (multi-line)
  const lastBlock = textContainers[textContainers.length - 1];
  const lines = Array.from(lastBlock.childNodes)
    .map(node => node.textContent.trim())
    .filter(line => line.length > 0);
  const currentText = lines.join('\n');

  if (currentText && currentText !== currentLiveText && !transcriptLog.has(currentText)) {
    currentLiveText = currentText;
    updateLivePreview(currentText);
  }
}


/**
 * Screenshot: getDisplayMedia first, html2canvas fallback.
 * @param {{ maxBytes?: number, ignoreRoot?: Element | null }} options
 */
export async function captureScreenshot({ maxBytes = 400_000, ignoreRoot = null } = {}) {
  try {
    const fromDisplay = await captureViaDisplayMedia(maxBytes);
    if (fromDisplay) return fromDisplay;
  } catch (err) {
    if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
      return { status: 'denied', error: err.name };
    }
  }

  try {
    const fromDom = await captureViaHtml2Canvas({ maxBytes, ignoreRoot });
    if (fromDom) return fromDom;
  } catch (err) {
    return { status: 'failed', error: err?.message || String(err) };
  }

  return { status: 'unavailable' };
}

/**
 * @param {number} maxBytes
 */
async function captureViaDisplayMedia(maxBytes) {
  if (!navigator.mediaDevices?.getDisplayMedia) return null;

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: 'browser' },
    audio: false,
    preferCurrentTab: true,
  });

  try {
    const track = stream.getVideoTracks()[0];
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    track.stop();
    stream.getTracks().forEach((t) => t.stop());

    return canvasToResult(canvas, maxBytes, 'display-media');
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop());
    throw err;
  }
}

/**
 * @param {{ maxBytes: number, ignoreRoot?: Element | null }} options
 */
async function captureViaHtml2Canvas({ maxBytes, ignoreRoot }) {
  const html2canvas = await loadHtml2Canvas();
  if (!html2canvas) return null;

  const canvas = await html2canvas(document.body, {
    useCORS: true,
    allowTaint: false,
    logging: false,
    ignoreElements: (el) => {
      if (!ignoreRoot) return false;
      return ignoreRoot === el || ignoreRoot.contains(el);
    },
  });

  return canvasToResult(canvas, maxBytes, 'html2canvas');
}

async function loadHtml2Canvas() {
  if (typeof window !== 'undefined' && window.html2canvas) return window.html2canvas;
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm');
    return mod.default || mod;
  } catch {
    return null;
  }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} maxBytes
 * @param {string} method
 */
function canvasToResult(canvas, maxBytes, method) {
  let mime = 'image/png';
  let dataUrl = canvas.toDataURL(mime);
  let quality = 0.92;

  while (estimateBytes(dataUrl) > maxBytes && quality > 0.4) {
    mime = 'image/jpeg';
    quality -= 0.1;
    dataUrl = canvas.toDataURL(mime, quality);
  }

  const bytes = estimateBytes(dataUrl);
  if (bytes > maxBytes * 1.5) {
    return { status: 'too_large', mime, bytes, method };
  }

  return { status: 'captured', mime, dataUrl, bytes, method };
}

function estimateBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.floor((base64.length * 3) / 4);
}

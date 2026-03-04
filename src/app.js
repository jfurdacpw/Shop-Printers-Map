/**
 * App bootstrap: load PDF, load printers, init pan/zoom, pins, UI, edit-mode toast.
 */

import { loadPDF, renderPageToCanvas, getMapSize } from './pdfMap.js';
import * as panzoom from './panzoom.js';
import * as pins from './pins.js';
import { initUI, refreshPrinterList } from './ui.js';

const FLOORPLAN_URL = 'assets/floorplan.pdf';

/** Show a short toast message. */
function showToast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => {
    el.classList.add('hidden');
  }, 4000);
}

/** Edit mode: show toast, log JSON to console, copy to clipboard. */
function onEditModeClick({ xPct, yPct }) {
  const x = Math.round(xPct * 10000) / 10000;
  const y = Math.round(yPct * 10000) / 10000;
  const snippet = `"xPct": ${x}, "yPct": ${y}`;
  const fullSnippet = `{ "xPct": ${x}, "yPct": ${y} }`;
  console.log('Printer position (add to printers.json):', fullSnippet);
  showToast(`Position: xPct=${x}, yPct=${y} — see console for JSON`);
  try {
    navigator.clipboard.writeText(fullSnippet);
  } catch (_) {
    // ignore clipboard errors
  }
}

/** Viewport click: in edit mode, capture coords (only if click was on map, not on pin). */
function onViewportClick(e) {
  if (!pins.isEditMode()) return;
  if (e.target.closest('.pin')) return; // pin handles its own click
  pins.handleEditModeMapClick(e.clientX, e.clientY);
}

/** Resize: re-render PDF and pins, preserve pan/zoom. */
function onWindowResize() {
  const canvas = document.getElementById('pdf-canvas');
  if (!canvas || !canvas.style.width) return; // not yet rendered
  const size = getMapSize();
  if (!size) return;
  renderPageToCanvas(canvas).then((newSize) => {
    pins.renderPins();
    // Keep current transform; optional: could reset view
  }).catch(console.error);
}

async function main() {
  const canvas = document.getElementById('pdf-canvas');
  if (!canvas) return;

  // Init pan/zoom before loading so viewport is ready (edit mode skips pan)
  panzoom.initPanZoom({ getIsEditMode: () => pins.isEditMode() });

  // Load PDF
  try {
    await loadPDF(FLOORPLAN_URL);
  } catch (err) {
    console.error('Failed to load PDF:', err);
    showToast('Could not load floorplan.pdf — check that it exists in /assets/');
    return;
  }

  await pins.loadPrinters().catch((err) => {
    console.error('Failed to load printers:', err);
  });

  // Render first page to canvas
  const size = await renderPageToCanvas(canvas);
  if (!size) return;

  panzoom.resetView(size.width, size.height);
  pins.renderPins();

  initUI();
  refreshPrinterList();

  pins.setOnEditModeClick(onEditModeClick);
  const viewport = document.getElementById('viewport');
  if (viewport) viewport.addEventListener('click', onViewportClick);

  window.addEventListener('resize', onWindowResize);
}

main();

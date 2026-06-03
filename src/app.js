/**
 * App bootstrap: load PDF, load printers, init pan/zoom, pins, UI.
 */

import { loadPDF, renderPageToCanvas, getMapSize } from './pdfMap.js';
import * as panzoom from './panzoom.js';
import * as pins from './pins.js';
import { initUI, refreshPrinterList, setEditFormCoords } from './ui.js';

function getFloorplanUrl() {
  return new URL('assets/floorplan.pdf', document.baseURI || window.location.href).href;
}

function showToast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(showToast._tid);
  showToast._tid = setTimeout(() => el.classList.add('hidden'), 4000);
}

function onViewportClick(e) {
  if (!pins.isEditMode()) return;
  if (e.target.closest('.pin')) return;
  pins.handleEditModeMapClick(e.clientX, e.clientY);
}

function onWindowResize() {
  const canvas = document.getElementById('pdf-canvas');
  if (!canvas || !canvas.style.width) return;
  const size = getMapSize();
  if (!size) return;
  renderPageToCanvas(canvas).then(() => {
    pins.renderPins();
  }).catch(console.error);
}

async function main() {
  const canvas = document.getElementById('pdf-canvas');
  if (!canvas) return;

  panzoom.initPanZoom({ getIsEditMode: () => pins.isEditMode() });

  const floorplanUrl = getFloorplanUrl();
  try {
    await loadPDF(floorplanUrl);
  } catch (err) {
    console.error('Failed to load PDF:', err);
    showToast('Could not load floorplan.pdf — check /assets/floorplan.pdf exists.');
    return;
  }

  await pins.loadPrinters().catch((err) => {
    console.error('Failed to load printers:', err);
  });

  const size = await renderPageToCanvas(canvas);
  if (!size) return;

  panzoom.resetView(size.width, size.height);
  pins.renderPins();

  initUI();
  refreshPrinterList();

  // Route edit-mode clicks to the in-panel form
  pins.setOnEditModeClick(setEditFormCoords);

  const viewport = document.getElementById('viewport');
  if (viewport) viewport.addEventListener('click', onViewportClick);

  window.addEventListener('resize', onWindowResize);
}

main();

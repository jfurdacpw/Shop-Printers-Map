/**
 * PDF map: load floorplan PDF, render page 1 to canvas, handle resize.
 * Uses PDF.js from CDN (ESM). Canvas and pins live in the same map-layer for pan/zoom.
 */

const PDF_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.mjs';
const PDF_WORKER_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.mjs';

/** Base scale for rendering (1.5–2.0 for sharpness). */
const BASE_SCALE = 1.8;

let pdfDoc = null;
let pdfModule = null;

/**
 * Load PDF.js dynamically and set worker.
 * @returns {Promise<{ getDocument: Function }>}
 */
async function loadPdfJs() {
  if (pdfModule) return pdfModule;
  pdfModule = await import(/* @vite-ignore */ PDF_CDN);
  pdfModule.GlobalWorkerOptions.workerSrc = PDF_WORKER_CDN;
  return pdfModule;
}

/**
 * Load PDF from url and store document.
 * @param {string} url - URL to PDF (relative or absolute).
 * @returns {Promise<{ width: number, height: number }>} Page size in CSS pixels at base scale.
 */
export async function loadPDF(url) {
  const pdf = await loadPdfJs();
  pdfDoc = await pdf.getDocument(url).promise;
  const page = await pdfDoc.getPage(1);
  const view = page.getViewport({ scale: BASE_SCALE });
  return { width: view.width, height: view.height };
}

/**
 * Render page 1 of the current PDF to the given canvas.
 * Resizes canvas to match viewport dimensions (page at BASE_SCALE).
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<{ width: number, height: number }>} Rendered size (CSS pixels).
 */
export async function renderPageToCanvas(canvas) {
  if (!pdfDoc) throw new Error('PDF not loaded');
  const page = await pdfDoc.getPage(1);
  const view = page.getViewport({ scale: BASE_SCALE });
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(view.width * dpr);
  canvas.height = Math.floor(view.height * dpr);
  canvas.style.width = `${view.width}px`;
  canvas.style.height = `${view.height}px`;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  await page.render({
    canvasContext: ctx,
    viewport: view,
  }).promise;

  return { width: view.width, height: view.height };
}

/**
 * Return the current PDF page size in "map coordinates" (same as canvas display size).
 * Used to convert xPct/yPct to pixel positions and for edit-mode click → percent.
 * @returns {{ width: number, height: number } | null}
 */
export function getMapSize() {
  const canvas = document.getElementById('pdf-canvas');
  if (!canvas) return null;
  const w = parseFloat(canvas.style.width);
  const h = parseFloat(canvas.style.height);
  if (Number.isNaN(w) || Number.isNaN(h)) return null;
  return { width: w, height: h };
}

/**
 * Get the map layer element (wrapper that gets pan/zoom transform).
 * @returns {HTMLElement | null}
 */
export function getMapLayer() {
  return document.getElementById('map-layer');
}

/**
 * Get the PDF canvas element.
 * @returns {HTMLCanvasElement | null}
 */
export function getCanvas() {
  return document.getElementById('pdf-canvas');
}

/**
 * Get the pins container (sibling of canvas, same coordinate system).
 * @returns {HTMLElement | null}
 */
export function getPinsContainer() {
  return document.getElementById('pins-container');
}

export { BASE_SCALE };

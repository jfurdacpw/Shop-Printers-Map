/**
 * Pins: load printers.json, render pins on the map, tooltips, highlight, edit-mode click → xPct/yPct.
 */

import { getMapSize, getPinsContainer } from './pdfMap.js';
import { getTransform } from './panzoom.js';

/** Resolve assets relative to the page (works on GitHub Pages and local server). */
function getPrintersUrl() {
  return new URL('assets/printers.json', document.baseURI || window.location.href).href;
}

/** @type {Array<{ id: string, name: string, room?: string, note?: string, xPct: number, yPct: number }>} */
let printers = [];
let highlightedId = null;
let onPinClick = null;
let onEditModeClick = null;
let editMode = false;

/**
 * Load printers from JSON.
 * @returns {Promise<typeof printers>}
 */
export async function loadPrinters() {
  const url = getPrintersUrl();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load printers.json: ${res.status}`);
  printers = await res.json();
  return printers;
}

/**
 * Get current printers list (optionally filtered by search).
 * @param {string} [search] - Optional search string to filter.
 */
export function getPrinters(search = '') {
  if (!search.trim()) return printers;
  const s = search.trim().toLowerCase();
  return printers.filter(
    (p) =>
      (p.name && p.name.toLowerCase().includes(s)) ||
      (p.note && p.note.toLowerCase().includes(s)) ||
      (p.room && p.room.toLowerCase().includes(s))
  );
}

/**
 * Get a single printer by id.
 * @param {string} id
 */
export function getPrinterById(id) {
  return printers.find((p) => p.id === id);
}

/**
 * Render pins into the pins container. Call after PDF is rendered and container size is set.
 * Pins are positioned with percent (xPct, yPct) so they stay correct when map is transformed.
 */
export function renderPins() {
  const container = getPinsContainer();
  const size = getMapSize();
  if (!container || !size) return;

  container.innerHTML = '';
  container.style.width = `${size.width}px`;
  container.style.height = `${size.height}px`;

  for (const p of printers) {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'pin';
    pin.dataset.id = p.id;
    pin.setAttribute('aria-label', p.name);
    pin.title = p.name;
    pin.style.left = `${(p.xPct ?? 0.5) * 100}%`;
    pin.style.top = `${(p.yPct ?? 0.5) * 100}%`;
    pin.style.marginLeft = '-12px';
    pin.style.marginTop = '-12px';

    pin.addEventListener('mouseenter', () => showTooltip(pin, p.name));
    pin.addEventListener('mouseleave', hideTooltip);
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onPinClick) onPinClick(p);
    });

    container.appendChild(pin);
  }
}

let tooltipEl = null;

function showTooltip(pinEl, text) {
  hideTooltip();
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'pin-tooltip';
  tooltipEl.textContent = text;
  document.body.appendChild(tooltipEl);
  const update = () => {
    if (!tooltipEl) return;
    const r = pinEl.getBoundingClientRect();
    tooltipEl.style.left = `${r.left + r.width / 2}px`;
    tooltipEl.style.top = `${r.top - 4}px`;
    tooltipEl.style.transform = 'translate(-50%, -100%)';
  };
  update();
  window.addEventListener('scroll', update, true);
  tooltipEl._clean = () => window.removeEventListener('scroll', update, true);
}

function hideTooltip() {
  if (tooltipEl) {
    if (tooltipEl._clean) tooltipEl._clean();
    tooltipEl.remove();
    tooltipEl = null;
  }
}

/**
 * Highlight one pin by id; remove highlight if id is null.
 * @param {string | null} id
 */
export function highlightPin(id) {
  highlightedId = id;
  const container = getPinsContainer();
  if (!container) return;
  container.querySelectorAll('.pin').forEach((el) => {
    el.classList.toggle('highlight', el.dataset.id === id);
  });
}

/**
 * Register callback when a pin is clicked (for info card).
 * @param {(printer: { id: string, name: string, room?: string, note?: string }) => void} fn
 */
export function setOnPinClick(fn) {
  onPinClick = fn;
}

/**
 * Enable or disable edit mode. When on, clicking the map captures xPct/yPct.
 * @param {boolean} on
 */
export function setEditMode(on) {
  editMode = on;
  const viewport = document.getElementById('viewport');
  if (viewport) viewport.classList.toggle('edit-mode', on);
}

/**
 * Register callback for edit-mode map click (receives { xPct, yPct }).
 * @param {(coords: { xPct: number, yPct: number }) => void} fn
 */
export function setOnEditModeClick(fn) {
  onEditModeClick = fn;
}

/**
 * Handle click on the viewport in edit mode: compute xPct/yPct and call onEditModeClick.
 * @param {number} clientX
 * @param {number} clientY
 */
export function handleEditModeMapClick(clientX, clientY) {
  const viewport = document.getElementById('viewport');
  const size = getMapSize();
  if (!viewport || !size) return;
  const vRect = viewport.getBoundingClientRect();
  const t = getTransform();
  const mapX = (clientX - vRect.left - t.translateX) / t.scale;
  const mapY = (clientY - vRect.top - t.translateY) / t.scale;
  if (mapX < 0 || mapX > size.width || mapY < 0 || mapY > size.height) return;
  const xPct = Math.max(0, Math.min(1, mapX / size.width));
  const yPct = Math.max(0, Math.min(1, mapY / size.height));
  if (onEditModeClick) onEditModeClick({ xPct, yPct });
}

/**
 * Check if edit mode is on.
 */
export function isEditMode() {
  return editMode;
}

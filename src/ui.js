/**
 * UI: search, printer list, info card, reset view, edit mode toggle.
 */

import * as panzoom from './panzoom.js';
import * as pins from './pins.js';
import { getMapSize } from './pdfMap.js';

/**
 * Center map on a printer and highlight its pin.
 * @param {{ id: string, name: string, xPct?: number, yPct?: number }} printer
 */
function centerOnPrinter(printer) {
  const size = getMapSize();
  if (!size) return;
  const xPct = printer.xPct ?? 0.5;
  const yPct = printer.yPct ?? 0.5;
  const mapX = xPct * size.width;
  const mapY = yPct * size.height;
  panzoom.centerOnMapPoint(mapX, mapY, 1.2);
  pins.highlightPin(printer.id);
  syncListHighlight(printer.id);
}

/**
 * Render printer list from current filtered printers.
 * @param {Array<{ id: string, name: string }>} list
 */
function renderPrinterList(list) {
  const ul = document.getElementById('printer-list');
  if (!ul) return;
  ul.innerHTML = '';
  for (const p of list) {
    const li = document.createElement('li');
    li.textContent = p.name;
    li.dataset.id = p.id;
    li.setAttribute('role', 'option');
    li.addEventListener('click', () => centerOnPrinter(p));
    ul.appendChild(li);
  }
}

/**
 * Show info card for a printer.
 * @param {{ name: string, room?: string, note?: string }} printer
 */
function showInfoCard(printer) {
  const card = document.getElementById('info-card');
  const content = document.getElementById('info-content');
  if (!card || !content) return;
  content.innerHTML = '';
  const h3 = document.createElement('h3');
  h3.textContent = printer.name;
  content.appendChild(h3);
  if (printer.room) {
    const room = document.createElement('p');
    room.className = 'room';
    room.textContent = printer.room;
    content.appendChild(room);
  }
  if (printer.note) {
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = printer.note;
    content.appendChild(note);
  }
  card.classList.remove('hidden');
}

function hideInfoCard() {
  const card = document.getElementById('info-card');
  if (card) card.classList.add('hidden');
}

/**
 * Initialize UI: search, list, reset, edit toggle, info card, Esc.
 * @param {{ onSearchChange: (search: string) => void }} opts
 */
export function initUI(opts = {}) {
  const searchEl = document.getElementById('search');
  const resetBtn = document.getElementById('reset-view');
  const editCheckbox = document.getElementById('edit-mode');
  const infoClose = document.getElementById('info-close');

  if (searchEl) {
    searchEl.addEventListener('input', () => {
      const list = pins.getPrinters(searchEl.value.trim());
      renderPrinterList(list);
      if (opts.onSearchChange) opts.onSearchChange(searchEl.value.trim());
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const size = getMapSize();
      if (size) panzoom.resetView(size.width, size.height);
      pins.highlightPin(null);
      syncListHighlight(null); // defined below
    });
  }

  if (editCheckbox) {
    editCheckbox.addEventListener('change', () => {
      pins.setEditMode(editCheckbox.checked);
    });
  }

  if (infoClose) {
    infoClose.addEventListener('click', hideInfoCard);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideInfoCard();
  });

  pins.setOnPinClick((printer) => {
    showInfoCard(printer);
  });
}

/**
 * Sync list item highlight with current pin highlight. Call after highlightPin.
 * @param {string | null} id
 */
export function syncListHighlight(id) {
  const ul = document.getElementById('printer-list');
  if (!ul) return;
  ul.querySelectorAll('li').forEach((li) => {
    li.classList.toggle('highlight', li.dataset.id === id);
  });
}

/**
 * Refresh the printer list (e.g. after initial load).
 * @param {string} [searchText]
 */
export function refreshPrinterList(searchText = '') {
  const list = pins.getPrinters(searchText);
  renderPrinterList(list);
}

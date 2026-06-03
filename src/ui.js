/**
 * UI: search, printer list, info card, reset view, edit mode, edit form.
 */

import * as panzoom from './panzoom.js';
import * as pins from './pins.js';
import { getMapSize } from './pdfMap.js';

function centerOnPrinter(printer) {
  const size = getMapSize();
  if (!size) return;
  const mapX = (printer.xPct ?? 0.5) * size.width;
  const mapY = (printer.yPct ?? 0.5) * size.height;
  panzoom.centerOnMapPoint(mapX, mapY, 1.2);
  pins.highlightPin(printer.id);
  syncListHighlight(printer.id);
}

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

function showInfoCard(printer) {
  const card = document.getElementById('info-card');
  const nameEl = document.getElementById('info-card-name');
  const body = document.getElementById('info-card-body');
  if (!card || !nameEl || !body) return;

  nameEl.textContent = printer.name;
  body.innerHTML = '';

  const rows = [];
  if (printer.area) rows.push({ label: 'Area', value: printer.area });
  if (printer.note) rows.push({ label: 'Note', value: printer.note });

  for (const { label, value } of rows) {
    const row = document.createElement('div');
    row.className = 'info-row';
    const lbl = document.createElement('span');
    lbl.className = 'info-row-label';
    lbl.textContent = label;
    const val = document.createElement('span');
    val.className = 'info-row-value';
    val.textContent = value;
    row.appendChild(lbl);
    row.appendChild(val);
    body.appendChild(row);
  }

  card.classList.remove('hidden');
}

function hideInfoCard() {
  const card = document.getElementById('info-card');
  if (card) card.classList.add('hidden');
}

// ── Edit form ──────────────────────────────────────────────────────

let editCoords = null; // { xPct, yPct }

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildJson() {
  const name = document.getElementById('edit-name')?.value.trim() ?? '';
  const area = document.getElementById('edit-area')?.value.trim() ?? '';
  const note = document.getElementById('edit-note')?.value.trim() ?? '';
  if (!editCoords) return null;

  const entry = { id: slugify(name) || 'new-printer', name: name || 'New Printer' };
  if (area) entry.area = area;
  if (note) entry.note = note;
  entry.xPct = Math.round(editCoords.xPct * 10000) / 10000;
  entry.yPct = Math.round(editCoords.yPct * 10000) / 10000;
  return JSON.stringify(entry, null, 2);
}

function refreshEditJson() {
  const jsonEl = document.getElementById('edit-json');
  const copyBtn = document.getElementById('edit-copy');
  if (!jsonEl || !copyBtn) return;
  const json = buildJson();
  if (json) {
    jsonEl.textContent = json;
    jsonEl.classList.add('visible');
    copyBtn.disabled = false;
  } else {
    jsonEl.classList.remove('visible');
    copyBtn.disabled = true;
  }
}

function setEditCoords(coords) {
  editCoords = coords;
  const coordsEl = document.getElementById('edit-coords');
  if (!coordsEl) return;
  const x = Math.round(coords.xPct * 10000) / 10000;
  const y = Math.round(coords.yPct * 10000) / 10000;
  coordsEl.textContent = `xPct: ${x}  yPct: ${y}`;
  coordsEl.classList.add('has-coords');
  refreshEditJson();
}

function clearEditForm() {
  editCoords = null;
  const coordsEl = document.getElementById('edit-coords');
  if (coordsEl) {
    coordsEl.textContent = 'Click the map to capture position';
    coordsEl.classList.remove('has-coords');
  }
  ['edit-name', 'edit-area', 'edit-note'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const jsonEl = document.getElementById('edit-json');
  if (jsonEl) jsonEl.classList.remove('visible');
  const copyBtn = document.getElementById('edit-copy');
  if (copyBtn) copyBtn.disabled = true;
}

function showEditForm(visible) {
  const form = document.getElementById('edit-form');
  if (!form) return;
  if (visible) {
    form.classList.remove('hidden');
  } else {
    form.classList.add('hidden');
    clearEditForm();
  }
}

// ── Init ───────────────────────────────────────────────────────────

export function initUI() {
  const searchEl = document.getElementById('search');
  const resetBtn = document.getElementById('reset-view');
  const editCheckbox = document.getElementById('edit-mode');
  const infoClose = document.getElementById('info-close');
  const editFormClear = document.getElementById('edit-form-clear');
  const editCopyBtn = document.getElementById('edit-copy');

  if (searchEl) {
    searchEl.addEventListener('input', () => {
      renderPrinterList(pins.getPrinters(searchEl.value.trim()));
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const size = getMapSize();
      if (size) panzoom.resetView(size.width, size.height);
      pins.highlightPin(null);
      syncListHighlight(null);
    });
  }

  if (editCheckbox) {
    editCheckbox.addEventListener('change', () => {
      pins.setEditMode(editCheckbox.checked);
      showEditForm(editCheckbox.checked);
    });
  }

  if (infoClose) {
    infoClose.addEventListener('click', hideInfoCard);
  }

  if (editFormClear) {
    editFormClear.addEventListener('click', clearEditForm);
  }

  // Live JSON preview as user types
  ['edit-name', 'edit-area', 'edit-note'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', refreshEditJson);
  });

  if (editCopyBtn) {
    editCopyBtn.disabled = true;
    editCopyBtn.addEventListener('click', () => {
      const json = buildJson();
      if (!json) return;
      navigator.clipboard.writeText(json).then(() => {
        const orig = editCopyBtn.textContent;
        editCopyBtn.textContent = 'Copied!';
        setTimeout(() => { editCopyBtn.textContent = orig; }, 1500);
      }).catch(() => {});
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideInfoCard();
  });

  pins.setOnPinClick(showInfoCard);
}

export function setEditFormCoords(coords) {
  setEditCoords(coords);
}

export function syncListHighlight(id) {
  const ul = document.getElementById('printer-list');
  if (!ul) return;
  ul.querySelectorAll('li').forEach((li) => {
    li.classList.toggle('highlight', li.dataset.id === id);
  });
}

export function refreshPrinterList(searchText = '') {
  renderPrinterList(pins.getPrinters(searchText));
}

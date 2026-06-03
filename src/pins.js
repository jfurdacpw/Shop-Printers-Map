/**
 * Pins: load printers.json, render SVG map pins, tooltips, highlight, edit-mode click.
 */

import { getMapSize, getPinsContainer } from './pdfMap.js';
import { getTransform } from './panzoom.js';

function getPrintersUrl() {
  return new URL('assets/printers.json', document.baseURI || window.location.href).href;
}

/** @type {Array<{ id: string, name: string, area?: string, note?: string, xPct: number, yPct: number }>} */
let printers = [];
let highlightedId = null;
let onPinClick = null;
let onEditModeClick = null;
let editMode = false;

export async function loadPrinters() {
  const url = getPrintersUrl();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load printers.json: ${res.status}`);
  printers = await res.json();
  return printers;
}

export function getPrinters(search = '') {
  if (!search.trim()) return printers;
  const s = search.trim().toLowerCase();
  return printers.filter(
    (p) =>
      (p.name && p.name.toLowerCase().includes(s)) ||
      (p.area && p.area.toLowerCase().includes(s)) ||
      (p.note && p.note.toLowerCase().includes(s))
  );
}

export function getPrinterById(id) {
  return printers.find((p) => p.id === id);
}

function makePinSVG() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 22 30');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('aria-hidden', 'true');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'pin-body');
  // Teardrop: circle top, pointed bottom
  path.setAttribute('d', 'M11 0C6.03 0 2 4.03 2 9c0 6.75 9 21 9 21s9-14.25 9-21c0-4.97-4.03-9-9-9z');

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('class', 'pin-dot');
  circle.setAttribute('cx', '11');
  circle.setAttribute('cy', '9');
  circle.setAttribute('r', '3.5');

  svg.appendChild(path);
  svg.appendChild(circle);
  return svg;
}

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
    if (p.id === highlightedId) pin.classList.add('highlight');
    pin.dataset.id = p.id;
    pin.setAttribute('aria-label', p.name);
    pin.appendChild(makePinSVG());

    pin.style.left = `${(p.xPct ?? 0.5) * 100}%`;
    pin.style.top = `${(p.yPct ?? 0.5) * 100}%`;

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
    tooltipEl.style.top = `${r.top - 6}px`;
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

export function highlightPin(id) {
  highlightedId = id;
  const container = getPinsContainer();
  if (!container) return;
  container.querySelectorAll('.pin').forEach((el) => {
    el.classList.toggle('highlight', el.dataset.id === id);
  });
}

export function setOnPinClick(fn) {
  onPinClick = fn;
}

export function setEditMode(on) {
  editMode = on;
  const viewport = document.getElementById('viewport');
  if (viewport) viewport.classList.toggle('edit-mode', on);
}

export function setOnEditModeClick(fn) {
  onEditModeClick = fn;
}

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

export function isEditMode() {
  return editMode;
}

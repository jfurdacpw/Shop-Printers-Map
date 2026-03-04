/**
 * Pan/zoom for the map layer using pointer events and wheel.
 * Apply transform (translate + scale) to the map-layer; constrain scale and pan.
 */

const MIN_SCALE = 0.2;
const MAX_SCALE = 8;
const WHEEL_SENSITIVITY = 0.0012;

/** @type {HTMLElement | null} */
let viewportEl = null;
/** @type {HTMLElement | null} */
let layerEl = null;

let scale = 1;
let translateX = 0;
let translateY = 0;

let pointerId = null;
let startX = 0;
let startY = 0;
let startTranslateX = 0;
let startTranslateY = 0;

/**
 * Apply current transform to the map layer.
 */
function applyTransform() {
  if (!layerEl) return;
  layerEl.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

/**
 * Get viewport center in viewport coordinates.
 */
function getViewportCenter() {
  if (!viewportEl) return { x: 0, y: 0 };
  const r = viewportEl.getBoundingClientRect();
  return { x: r.width / 2, y: r.height / 2 };
}

/**
 * Constrain scale and pan so the map doesn't go too far.
 * Optional map width/height used to limit pan (so we don't push the map infinitely).
 */
function constrain(mapWidth, mapHeight) {
  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));

  if (mapWidth != null && mapHeight != null && viewportEl) {
    const r = viewportEl.getBoundingClientRect();
    const maxTx = 50;
    const maxTy = 50;
    const minTx = r.width - mapWidth * scale - 50;
    const minTy = r.height - mapHeight * scale - 50;
    translateX = Math.max(minTx, Math.min(maxTx, translateX));
    translateY = Math.max(minTy, Math.min(maxTy, translateY));
  }
}

/**
 * Initialize pan/zoom on the viewport and map-layer.
 * @param {{ viewportId?: string, layerId?: string, getIsEditMode?: () => boolean }} opts
 */
export function initPanZoom(opts = {}) {
  const viewportId = opts.viewportId || 'viewport';
  const layerId = opts.layerId || 'map-layer';
  const getIsEditMode = opts.getIsEditMode;
  viewportEl = document.getElementById(viewportId);
  layerEl = document.getElementById(layerId);
  if (!viewportEl || !layerEl) return;

  // Pointer down: start pan (skip when in edit mode so map click can be used for placing pins)
  viewportEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (getIsEditMode && getIsEditMode()) return;
    e.preventDefault();
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startTranslateX = translateX;
    startTranslateY = translateY;
    viewportEl.setPointerCapture(pointerId);
    viewportEl.classList.add('panning');
  });

  // Pointer move: pan
  viewportEl.addEventListener('pointermove', (e) => {
    if (pointerId === null || e.pointerId !== pointerId) return;
    translateX = startTranslateX + (e.clientX - startX);
    translateY = startTranslateY + (e.clientY - startY);
    const size = getMapSizeFromLayer();
    constrain(size?.width, size?.height);
    applyTransform();
  });

  // Pointer up / cancel: end pan
  viewportEl.addEventListener('pointerup', (e) => {
    if (e.pointerId === pointerId) {
      viewportEl.releasePointerCapture(pointerId);
      pointerId = null;
      viewportEl.classList.remove('panning');
    }
  });
  viewportEl.addEventListener('pointercancel', (e) => {
    if (e.pointerId === pointerId) {
      pointerId = null;
      viewportEl.classList.remove('panning');
    }
  });

  // Wheel: zoom toward cursor
  viewportEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = viewportEl.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = 1 - e.deltaY * WHEEL_SENSITIVITY;
    const newScale = scale * factor;
    const oldScale = scale;
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    // Zoom toward (cx, cy): adjust translate so that (cx, cy) stays fixed.
    translateX = cx - (cx - translateX) * (scale / oldScale);
    translateY = cy - (cy - translateY) * (scale / oldScale);
    const size = getMapSizeFromLayer();
    constrain(size?.width, size?.height);
    applyTransform();
  }, { passive: false });

  applyTransform();
}

function getMapSizeFromLayer() {
  const canvas = document.getElementById('pdf-canvas');
  if (!canvas) return null;
  const w = parseFloat(canvas.style.width);
  const h = parseFloat(canvas.style.height);
  if (Number.isNaN(w) || Number.isNaN(h)) return null;
  return { width: w, height: h };
}

/**
 * Set pan/zoom state (e.g. reset or center on point).
 * @param {{ scale?: number, translateX?: number, translateY?: number }} state
 */
export function setTransform(state) {
  if (state.scale != null) scale = state.scale;
  if (state.translateX != null) translateX = state.translateX;
  if (state.translateY != null) translateY = state.translateY;
  const size = getMapSizeFromLayer();
  constrain(size?.width, size?.height);
  applyTransform();
}

/**
 * Get current transform (for reset and center-on-printer).
 */
export function getTransform() {
  return { scale, translateX, translateY };
}

/**
 * Center the map on a point given in map coordinates (e.g. pin position).
 * Optionally set scale.
 * @param {number} mapX - X in map (canvas) pixels.
 * @param {number} mapY - Y in map (canvas) pixels.
 * @param {number} [newScale] - Optional scale to set.
 */
export function centerOnMapPoint(mapX, mapY, newScale) {
  if (!viewportEl) return;
  const r = viewportEl.getBoundingClientRect();
  const centerX = r.width / 2;
  const centerY = r.height / 2;
  if (newScale != null) scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
  // We want: centerX = translateX + mapX * scale  =>  translateX = centerX - mapX * scale
  translateX = centerX - mapX * scale;
  translateY = centerY - mapY * scale;
  const size = getMapSizeFromLayer();
  constrain(size?.width, size?.height);
  applyTransform();
}

/**
 * Reset view: fit map in viewport, aligned top-left (no blank space on left or top).
 * @param {number} mapWidth
 * @param {number} mapHeight
 */
export function resetView(mapWidth, mapHeight) {
  if (!viewportEl) return;
  const r = viewportEl.getBoundingClientRect();
  const fitScale = Math.min(r.width / mapWidth, r.height / mapHeight, 1.2);
  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, fitScale * 0.95));
  translateX = 0;
  translateY = 0;
  applyTransform();
}

/**
 * Printer Locator - Left panel UI: search, printer list, tooltip, info card.
 */

const tooltipEl = document.getElementById('tooltip');
const listEl = document.getElementById('printer-list');
const searchEl = document.getElementById('search');
const resetBtn = document.getElementById('reset-view');
const devToggle = document.getElementById('dev-coords');
const infoCard = document.getElementById('info-card');
const infoName = document.getElementById('info-name');
const infoDepartment = document.getElementById('info-department');
const infoNotes = document.getElementById('info-notes');
const infoClose = document.getElementById('info-card-close');

let allPrinters = [];
let api = null;

// --- Tooltip (follow mouse, show on hover) ---
function setTooltip(text) {
  if (!text) {
    tooltipEl.style.display = 'none';
    return;
  }
  tooltipEl.textContent = text;
  tooltipEl.style.display = 'block';
}

document.addEventListener('pointermove', (e) => {
  if (tooltipEl.style.display === 'block') {
    tooltipEl.style.left = (e.clientX + 12) + 'px';
    tooltipEl.style.top = (e.clientY + 12) + 'px';
  }
});

// --- Info card ---
function updateInfoCard(printer) {
  infoName.textContent = printer.name;
  infoDepartment.textContent = printer.department || '';
  infoDepartment.style.display = printer.department ? 'block' : 'none';
  infoNotes.textContent = printer.notes || '';
  infoNotes.style.display = printer.notes ? 'block' : 'none';
}

function showInfoCard(visible) {
  infoCard.classList.toggle('visible', !!visible);
}

infoClose.addEventListener('click', () => {
  showInfoCard(false);
  if (api && api.setSelectedMarker) api.setSelectedMarker(null);
});

// --- List rendering and filtering ---
function renderList(filter = '') {
  const q = filter.trim().toLowerCase();
  const filtered = q
    ? allPrinters.filter((p) => p.name.toLowerCase().includes(q))
    : allPrinters;
  listEl.innerHTML = '';
  filtered.forEach((printer) => {
    const li = document.createElement('li');
    li.textContent = printer.name;
    li.dataset.id = printer.id || printer.name;
    li.addEventListener('click', () => {
      if (api && api.focusOnPrinter) api.focusOnPrinter(printer);
      listEl.querySelectorAll('li').forEach((el) => el.classList.remove('active'));
      li.classList.add('active');
    });
    listEl.appendChild(li);
  });
}

function setActiveInList(printer) {
  listEl.querySelectorAll('li').forEach((el) => {
    el.classList.toggle('active', printer && el.dataset.id === (printer.id || printer.name));
  });
}

// --- Search ---
searchEl.addEventListener('input', () => renderList(searchEl.value));

// --- Reset view ---
resetBtn.addEventListener('click', () => {
  if (api && api.resetView) api.resetView();
  listEl.querySelectorAll('li').forEach((el) => el.classList.remove('active'));
  searchEl.value = '';
  renderList();
});

// --- Dev coords toggle ---
devToggle.addEventListener('change', () => {
  if (api && api.setDevCoordsMode) api.setDevCoordsMode(devToggle.checked);
});

// --- Init: receive printers and scene API ---
export function initUI(printers, sceneApi) {
  allPrinters = printers;
  api = sceneApi;
  renderList();
}

export { setTooltip, showInfoCard, updateInfoCard, setActiveInList };

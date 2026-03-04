/**
 * Printer Locator - Three.js scene, model loading, markers, and raycasting.
 * Uses ES modules; assets loaded from ./assets/ (GitHub Pages–friendly paths).
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { initUI, setTooltip, showInfoCard, updateInfoCard, setActiveInList } from './ui.js';

// --- Scene setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f0f12);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
camera.position.set(10, 10, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;

// --- State ---
let buildingModel = null;
const printerMarkers = []; // { mesh, printer, pulseScale }
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredMarker = null;
let selectedMarker = null;
let devCoordsMode = false;

// Asset URLs relative to this script (works for same-dir and GitHub Pages /repo/)
function asset(path) {
  return new URL('../assets/' + path, import.meta.url).href;
}

// --- Lighting ---
const ambient = new THREE.AmbientLight(0x404060, 0.8);
scene.add(ambient);
const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(5, 10, 7);
scene.add(dir);

// --- Create a single printer marker (sphere that can pulse) ---
function createMarker(printer) {
  const geometry = new THREE.SphereGeometry(0.15, 16, 12);
  const material = new THREE.MeshStandardMaterial({
    color: 0x6366f1,
    emissive: 0x312e81,
    metalness: 0.2,
    roughness: 0.6,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(printer.x, printer.y, printer.z);
  mesh.userData.printer = printer;
  scene.add(mesh);
  return { mesh, printer, pulseScale: 1 };
}

// --- Load building model and frame it ---
function frameBuilding(model) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = Math.max(maxDim * 1.8, 5);

  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(distance * 0.6, distance * 0.6, distance * 0.6));
  camera.near = Math.max(0.1, distance * 0.01);
  camera.far = Math.max(1000, distance * 10);
  camera.updateProjectionMatrix();
}

function loadBuilding() {
  const loader = new GLTFLoader();
  const url = asset('building.glb');
  loader.load(
    url,
    (gltf) => {
      buildingModel = gltf.scene;
      buildingModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(buildingModel);
      frameBuilding(buildingModel);
    },
    undefined,
    (err) => console.error('Failed to load building.glb:', err)
  );
}

// --- Load printers and create markers ---
async function loadPrinters() {
  const url = asset('printers.json');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load printers.json');
  const data = await res.json();
  const list = Array.isArray(data) ? data : (data.printers || []);
  list.forEach((p) => {
    const entry = createMarker(p);
    printerMarkers.push(entry);
  });
  return list;
}

// --- Raycasting: update mouse in NDC ---
function onPointerMove(event) {
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerClick(event) {
  const rect = container.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

// --- Pick marker under mouse ---
function pickMarker() {
  raycaster.setFromCamera(mouse, camera);
  const meshes = printerMarkers.map((m) => m.mesh);
  const hits = raycaster.intersectObjects(meshes);
  return hits.length > 0 ? hits[0].object.userData.printer : null;
}

// --- Get 3D point at mouse (for dev coords) ---
function getGroundIntersection() {
  raycaster.setFromCamera(mouse, camera);
  if (!buildingModel) return null;
  const hits = raycaster.intersectObject(buildingModel, true);
  return hits.length > 0 ? hits[0].point : null;
}

// --- API for UI ---
function focusOnPrinter(printer) {
  const entry = printerMarkers.find((m) => m.printer === printer);
  if (!entry) return;
  selectedMarker = entry;
  const p = entry.mesh.position;
  controls.target.set(p.x, p.y, p.z);
  const dist = camera.position.distanceTo(p);
  const move = camera.position.clone().sub(p).setLength(Math.max(dist * 0.4, 3));
  camera.position.copy(p).add(move);
  updateInfoCard(printer);
  showInfoCard(true);
  setActiveInList(printer);
}

function setSelectedMarker(printer) {
  selectedMarker = printerMarkers.find((m) => m.printer === printer) || null;
}

function resetView() {
  selectedMarker = null;
  if (buildingModel) frameBuilding(buildingModel);
  showInfoCard(false);
  setActiveInList(null);
}

function setDevCoordsMode(enabled) {
  devCoordsMode = !!enabled;
}

// --- Animation: pulse selected marker ---
const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();
  printerMarkers.forEach(({ mesh, printer, pulseScale: _ }) => {
    const isSelected = selectedMarker && selectedMarker.printer === printer;
    const scale = isSelected ? 1 + 0.15 * Math.sin(t * 3) : 1;
    mesh.scale.setScalar(scale);
    mesh.material.emissiveIntensity = isSelected ? 0.4 : 0.2;
  });
  controls.update();
  renderer.render(scene, camera);
}

// --- Resize ---
function onResize() {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);

// --- Init and loop ---
async function init() {
  loadBuilding();
  const printers = await loadPrinters();
  initUI(printers, { focusOnPrinter, resetView, setDevCoordsMode, setSelectedMarker });

  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('click', (e) => {
    onPointerClick(e);
    if (devCoordsMode) {
      const pt = getGroundIntersection();
      if (pt) console.log('Clicked coords:', { x: pt.x, y: pt.y, z: pt.z });
    }
    const printer = pickMarker();
    if (printer) {
      focusOnPrinter(printer);
    }
  });

  // Hover: tooltip + highlight
  function updateHover() {
    const printer = pickMarker();
    if (printer !== hoveredMarker) {
      hoveredMarker = printer;
      setTooltip(printer ? printer.name : '');
      printerMarkers.forEach(({ mesh }) => {
        mesh.material.color.setHex(printer && mesh.userData.printer === printer ? 0x818cf8 : 0x6366f1);
      });
    }
  }

  function tick() {
    updateHover();
    animate();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

init();

# Printer Locator

Interactive 3D “Printer Locator” web app for your building: Three.js scene with a building model and clickable printer markers. Static site, no backend; runs on GitHub Pages.

## Features

- **3D building model** (`building.glb`) with orbit controls and auto-framing on load
- **Printer markers** at coordinates from `assets/printers.json` (search, list, hover tooltip, click for info card)
- **Left panel**: search box, printer list (click to focus camera + highlight), “Show all / Reset view”
- **Optional**: marker pulse for selected printer; “Copy coordinates” dev mode to log clicked 3D position

## Project structure

```
/
├── index.html          # Main page
├── src/
│   ├── main.js         # Three.js scene, GLB loading, markers, raycasting
│   └── ui.js           # Panel, search, list, tooltip, info card
├── assets/
│   ├── building.glb    # Building model (add your own)
│   └── printers.json   # Printer list with coordinates
└── README.md
```

## Editing printer coordinates

Edit `assets/printers.json`. Each printer has:

- `id` (optional): unique id; if omitted, `name` is used for list selection
- `name`: display name
- `x`, `y`, `z`: position in the same coordinate system as your building model
- `department` (optional): shown in the info card
- `notes` (optional): shown in the info card

To find coordinates: enable **“Copy coordinates (dev)”** in the left panel, click on the building in the 3D view, and read the logged `{ x, y, z }` in the browser console. Use those values in `printers.json`.

## Run locally

No build step. Use any static server so that `assets/` and `src/` are served correctly.

**Option A – Python:**

```bash
# From repo root
python -m http.server 8000
```

Then open: http://localhost:8000

**Option B – Node (npx serve):**

```bash
npx serve
```

Then open the URL shown (e.g. http://localhost:3000).

## Deploy on GitHub Pages

1. Push this repo to GitHub.
2. In the repo: **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**.
4. Branch: `main` (or your default), folder: **/ (root)**.
5. Save. The site will be at:

   `https://<your-username>.github.io/<repo-name>/`

All asset and script paths are relative (`./assets/...`, `./src/...`), so the app works when opened at that base URL.

## Adding the building model

Place your GLB file at:

**`assets/building.glb`**

If the file is missing, the app still loads; the console will show a load error and only the printer markers (and axes) will be visible. Adjust printer `x,y,z` to match your model’s scale and origin.

## Tech

- Plain HTML/CSS/JS, ES modules only
- Three.js (CDN: three.module.js, OrbitControls, GLTFLoader)
- No framework or build step

# Printer Locator

A single-page **Printer Locator** that shows a top-down PDF floorplan with printer pins. Pan and zoom the map, search printers, click pins for details, and use **Edit mode** to place new pins by clicking the map and copying `xPct`/`yPct` into `printers.json`.

## Adding printers

1. Open the app and enable **Edit mode** in the left panel.
2. Click on the map where the printer should be. A toast shows the position and a JSON snippet is logged to the console (and copied to the clipboard if allowed).
3. Add or edit an entry in **`/assets/printers.json`** using the copied `xPct` and `yPct` (values between 0 and 1). Example:

   ```json
   {"id": "new-printer", "name": "New Printer", "room": "Room 101", "note": "Optional note", "xPct": 0.62, "yPct": 0.41}
   ```

4. Reload the page to see the new pin.

## Floorplan

- Place your single-page PDF at **`/assets/floorplan.pdf`**.
- If the file is missing, the app will show an error and the map will not load. Create the **`assets`** folder if needed and add a PDF named **`floorplan.pdf`** (any single-page top-down floorplan).

## Project structure

- **`index.html`** — Entry page, viewport, left panel, info card, toast.
- **`src/app.js`** — Bootstraps PDF, printers, pan/zoom, pins, UI, edit-mode handler.
- **`src/pdfMap.js`** — PDF.js (CDN) load and render page 1 to canvas; map size.
- **`src/panzoom.js`** — Pan (pointer) and zoom (wheel/pinch); transform on map layer.
- **`src/pins.js`** — Load `printers.json`, render pins, tooltips, highlight, edit-mode click → `xPct`/`yPct`.
- **`src/ui.js`** — Search, printer list, reset view, edit toggle, info card.
- **`src/styles.css`** — Layout and styling.
- **`assets/printers.json`** — Printer list (id, name, room, note, xPct, yPct).
- **`assets/floorplan.pdf`** — Your floorplan (you provide this).

No build step; plain HTML/CSS/JS with ES modules.

/**
 * Options page — lets users pick which stores to display and reorder them.
 *
 * Persists enabledStores + storeOrder to chrome.storage.sync so the
 * background service worker and content script can read the preferences.
 */

import { createStoreIcon } from "../stores/icons";

/* ------------------------------------------------------------------ */
/*  Store registry — single source of truth for all supported stores  */
/* ------------------------------------------------------------------ */

interface StoreDef {
  id: string;
  name: string;
  description: string;
  enabledByDefault: boolean;
}

const ALL_STORES: StoreDef[] = [
  {
    id: "discogs",
    name: "Discogs",
    description: "Vinyl, CD & physical \u2014 marketplace",
    enabledByDefault: true,
  },
  {
    id: "qobuz",
    name: "Qobuz",
    description: "Hi-Res digital downloads",
    enabledByDefault: true,
  },
  {
    id: "amazon",
    name: "Amazon",
    description: "CD, Vinyl & digital",
    enabledByDefault: true,
  },
  {
    id: "bandcamp",
    name: "Bandcamp",
    description: "Digital & physical \u2014 support artists directly",
    enabledByDefault: true,
  },
  {
    id: "fnac",
    name: "Fnac",
    description: "CD, Vinyle & plus \u2014 France",
    enabledByDefault: false,
  },
];

/** Default store display order (all store IDs). */
const DEFAULT_ORDER: string[] = ALL_STORES.map((s) => s.id);

/* ------------------------------------------------------------------ */
/*  Drag-and-drop state                                               */
/* ------------------------------------------------------------------ */

/** Current display order — mutated by drag-and-drop, persisted on save. */
let storeOrder: string[] = [...DEFAULT_ORDER];
let dragSrcId: string | null = null;

/* ------------------------------------------------------------------ */
/*  DOM refs                                                          */
/* ------------------------------------------------------------------ */

const listEl = document.getElementById("store-list");
const savedEl = document.getElementById("saved");

/* ------------------------------------------------------------------ */
/*  SVG helper — Material drag_indicator icon (6 dots)                */
/* ------------------------------------------------------------------ */

const DRAG_ICON_PATH =
  "M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z";

function createDragHandle(): HTMLElement {
  const handle = document.createElement("span");
  handle.className = "drag-handle";
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "currentColor");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", DRAG_ICON_PATH);
  svg.appendChild(path);
  handle.appendChild(svg);
  return handle;
}

/* ------------------------------------------------------------------ */
/*  Render                                                            */
/* ------------------------------------------------------------------ */

function render(enabledStores: string[]): void {
  if (!listEl) return;
  listEl.replaceChildren();

  // Build a lookup for quick access
  const storeMap = new Map<string, StoreDef>();
  for (const s of ALL_STORES) {
    storeMap.set(s.id, s);
  }

  // Render in storeOrder order
  for (const storeId of storeOrder) {
    const store = storeMap.get(storeId);
    if (!store) continue;

    const row = document.createElement("div");
    row.className = "store-item";
    row.draggable = true;
    row.dataset.storeId = store.id;

    // Drag handle
    row.appendChild(createDragHandle());

    // Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = enabledStores.includes(store.id);
    checkbox.addEventListener("change", () => {
      void save();
    });
    checkbox.dataset.storeId = store.id;

    // Store icon
    const iconEl = createStoreIcon(store.id, 24, "store-icon");

    // Store info
    const info = document.createElement("div");
    info.className = "store-info";

    const name = document.createElement("span");
    name.className = "store-name";
    name.textContent = store.name;

    const desc = document.createElement("span");
    desc.className = "store-desc";
    desc.textContent = store.description;

    info.appendChild(name);
    info.appendChild(desc);

    row.appendChild(checkbox);
    row.appendChild(iconEl);
    row.appendChild(info);

    // ------ Drag-and-drop events ------

    row.addEventListener("dragstart", (e: DragEvent) => {
      dragSrcId = store.id;
      row.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
      }
    });

    row.addEventListener("dragend", () => {
      dragSrcId = null;
      row.classList.remove("dragging");
      // Clean up any lingering drag-over highlights
      listEl.querySelectorAll(".drag-over").forEach((el) => {
        el.classList.remove("drag-over");
      });
    });

    row.addEventListener("dragover", (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
      row.classList.add("drag-over");
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("drag-over");
    });

    row.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault();
      row.classList.remove("drag-over");
      if (!dragSrcId || dragSrcId === store.id) return;

      // Reorder: move dragSrcId before this store
      const fromIdx = storeOrder.indexOf(dragSrcId);
      const toIdx = storeOrder.indexOf(store.id);
      if (fromIdx === -1 || toIdx === -1) return;

      // Remove from old position, insert at new position
      storeOrder.splice(fromIdx, 1);
      storeOrder.splice(toIdx, 0, dragSrcId);

      // Re-render with current checkbox states & persist
      const currentEnabled = readEnabledFromDom();
      render(currentEnabled);
      void save();
    });

    listEl.appendChild(row);
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Read the currently-checked store IDs from the DOM. */
function readEnabledFromDom(): string[] {
  if (!listEl) return [];
  const enabled: string[] = [];
  listEl.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((cb) => {
    if (cb.checked && cb.dataset.storeId) {
      enabled.push(cb.dataset.storeId);
    }
  });
  return enabled;
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                       */
/* ------------------------------------------------------------------ */

function getDefaults(): string[] {
  return ALL_STORES.filter((s) => s.enabledByDefault).map((s) => s.id);
}

async function load(): Promise<{ enabledStores: string[]; storeOrder: string[] }> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { enabledStores: getDefaults(), storeOrder: DEFAULT_ORDER },
      (result) => {
        resolve({
          enabledStores: result.enabledStores as string[],
          storeOrder: result.storeOrder as string[],
        });
      },
    );
  });
}

async function save(): Promise<void> {
  if (!listEl || !savedEl) return;
  const enabled = readEnabledFromDom();

  await chrome.storage.sync.set({ enabledStores: enabled, storeOrder });

  // Flash saved indicator
  savedEl.classList.add("visible");
  setTimeout(() => {
    savedEl.classList.remove("visible");
  }, 1500);
}

/* ------------------------------------------------------------------ */
/*  Init                                                              */
/* ------------------------------------------------------------------ */

void (async () => {
  const prefs = await load();
  storeOrder = prefs.storeOrder;
  render(prefs.enabledStores);
})();

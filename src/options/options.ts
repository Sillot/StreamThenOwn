/**
 * Options page — lets users pick which stores to display, reorder them,
 * and manage custom search providers.
 *
 * Persists enabledStores + storeOrder + customProviders to chrome.storage.sync
 * so the background service worker and content script can read the preferences.
 */

import { createStoreIcon } from "../stores/icons";
import { t } from "../i18n";
import type { CustomSearchProvider } from "../stores/types";
import { MAX_CUSTOM_PROVIDERS } from "../stores/types";
import { isValidSearchUrlTemplate } from "../utils/sanitize";

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
    id: "ebay",
    name: "eBay",
    description: "Vinyl, CD & collectibles \u2014 new & used",
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

/** User-defined custom search providers. */
let customProviders: CustomSearchProvider[] = [];

/* ------------------------------------------------------------------ */
/*  DOM refs                                                          */
/* ------------------------------------------------------------------ */

const listEl = document.getElementById("store-list");
const savedEl = document.getElementById("saved");
const customFormContainer = document.getElementById("custom-form-container");

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

  // Custom providers also participate in the main ordering
  const customMap = new Map<string, CustomSearchProvider>();
  for (const cp of customProviders) {
    customMap.set(cp.id, cp);
  }

  // Render in storeOrder order
  for (const storeId of storeOrder) {
    const builtIn = storeMap.get(storeId);
    const custom = customMap.get(storeId);
    if (!builtIn && !custom) continue;

    const row = document.createElement("div");
    row.className = "store-item";
    row.draggable = true;
    row.dataset.storeId = storeId;

    // Drag handle
    row.appendChild(createDragHandle());

    // Checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = enabledStores.includes(storeId);
    checkbox.addEventListener("change", () => {
      void save();
    });
    checkbox.dataset.storeId = storeId;

    // Store icon
    const iconEl = createStoreIcon(storeId, 24, "store-icon");

    // Store info
    const info = document.createElement("div");
    info.className = "store-info";

    const name = document.createElement("span");
    name.className = "store-name";

    if (builtIn) {
      name.textContent = builtIn.name;
    } else if (custom) {
      name.textContent = custom.label;
      const badge = document.createElement("span");
      badge.className = "custom-badge";
      badge.textContent = "custom";
      name.appendChild(badge);
    }

    const desc = document.createElement("span");
    desc.className = "store-desc";
    desc.textContent = builtIn ? builtIn.description : (custom?.searchUrlTemplate ?? "");

    info.appendChild(name);
    info.appendChild(desc);

    row.appendChild(checkbox);
    row.appendChild(iconEl);
    row.appendChild(info);

    // Delete button for custom providers
    if (custom) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-small";
      deleteBtn.title = "Remove";
      deleteBtn.appendChild(createTrashIcon());
      deleteBtn.addEventListener("click", () => {
        removeCustomProvider(custom.id);
      });
      row.appendChild(deleteBtn);
    }

    // ------ Drag-and-drop events ------

    row.addEventListener("dragstart", (e: DragEvent) => {
      dragSrcId = storeId;
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
      if (!dragSrcId || dragSrcId === storeId) return;

      // Reorder: move dragSrcId before this store
      const fromIdx = storeOrder.indexOf(dragSrcId);
      const toIdx = storeOrder.indexOf(storeId);
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

  // Render the custom providers form section
  renderCustomForm();
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
/*  SVG helpers                                                       */
/* ------------------------------------------------------------------ */

/** Material Design "delete" icon (trash can). */
const TRASH_ICON_PATH =
  "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z";

function createTrashIcon(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.setAttribute("fill", "currentColor");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", TRASH_ICON_PATH);
  svg.appendChild(path);
  return svg;
}

/* ------------------------------------------------------------------ */
/*  Custom providers — form & CRUD                                    */
/* ------------------------------------------------------------------ */

function renderCustomForm(): void {
  if (!customFormContainer) return;
  customFormContainer.replaceChildren();

  if (customProviders.length >= MAX_CUSTOM_PROVIDERS) {
    const limit = document.createElement("p");
    limit.className = "section-desc";
    limit.textContent = `Maximum of ${String(MAX_CUSTOM_PROVIDERS)} custom providers reached.`;
    customFormContainer.appendChild(limit);
    return;
  }

  const form = document.createElement("div");
  form.className = "custom-form";

  // Label field
  const labelRow = document.createElement("div");
  labelRow.className = "form-row";
  const labelLabel = document.createElement("label");
  labelLabel.textContent = "Name";
  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.placeholder = "e.g. eBay, Boomkat, JPC…";
  labelInput.maxLength = 40;
  labelRow.appendChild(labelLabel);
  labelRow.appendChild(labelInput);

  // URL field
  const urlRow = document.createElement("div");
  urlRow.className = "form-row";
  const urlLabel = document.createElement("label");
  urlLabel.textContent = "Search URL (use {artist} and {album})";
  const urlInput = document.createElement("input");
  urlInput.type = "url";
  urlInput.placeholder = "https://example.com/search?q={artist}+{album}";
  const urlHint = document.createElement("div");
  urlHint.className = "form-hint";
  urlHint.textContent = "e.g. https://www.ebay.com/sch/i.html?_nkw={artist}+{album}";
  urlRow.appendChild(urlLabel);
  urlRow.appendChild(urlInput);
  urlRow.appendChild(urlHint);

  // Error message
  const errorEl = document.createElement("div");
  errorEl.className = "form-error";

  // Add button
  const addBtn = document.createElement("button");
  addBtn.className = "btn";
  addBtn.textContent = "+ Add provider";
  addBtn.addEventListener("click", () => {
    const label = labelInput.value.trim();
    const url = urlInput.value.trim();

    // Validate
    if (!label) {
      errorEl.textContent = "Please enter a name.";
      return;
    }
    if (!isValidSearchUrlTemplate(url)) {
      errorEl.textContent = "Invalid URL. Must start with https:// and contain {artist}.";
      return;
    }

    errorEl.textContent = "";
    addCustomProvider(label, url);
  });

  form.appendChild(labelRow);
  form.appendChild(urlRow);
  form.appendChild(errorEl);
  form.appendChild(addBtn);

  customFormContainer.appendChild(form);
}

function addCustomProvider(label: string, searchUrlTemplate: string): void {
  const id = `custom_${String(Date.now())}`;
  const provider: CustomSearchProvider = { id, label, searchUrlTemplate };
  customProviders.push(provider);

  // Add to storeOrder and enable by default
  storeOrder.push(id);

  const currentEnabled = readEnabledFromDom();
  currentEnabled.push(id);
  render(currentEnabled);
  void save();
}

function removeCustomProvider(id: string): void {
  customProviders = customProviders.filter((p) => p.id !== id);
  storeOrder = storeOrder.filter((s) => s !== id);

  const currentEnabled = readEnabledFromDom().filter((s) => s !== id);
  render(currentEnabled);
  void save();
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                       */
/* ------------------------------------------------------------------ */

function getDefaults(): string[] {
  return ALL_STORES.filter((s) => s.enabledByDefault).map((s) => s.id);
}

async function load(): Promise<{
  enabledStores: string[];
  storeOrder: string[];
  customProviders: CustomSearchProvider[];
}> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { enabledStores: getDefaults(), storeOrder: DEFAULT_ORDER, customProviders: [] },
      (result) => {
        resolve({
          enabledStores: result.enabledStores as string[],
          storeOrder: result.storeOrder as string[],
          customProviders: result.customProviders as CustomSearchProvider[],
        });
      },
    );
  });
}

async function save(): Promise<void> {
  if (!listEl || !savedEl) return;
  const enabled = readEnabledFromDom();

  await chrome.storage.sync.set({ enabledStores: enabled, storeOrder, customProviders });

  // Flash saved indicator
  savedEl.classList.add("visible");
  setTimeout(() => {
    savedEl.classList.remove("visible");
  }, 1500);
}

/* ------------------------------------------------------------------ */
/*  Init                                                              */
/* ------------------------------------------------------------------ */

/** Populate the "About" section with i18n strings. */
function renderAbout(): void {
  const descEl = document.getElementById("about-description");
  const affiliateEl = document.getElementById("about-affiliate");
  const privacyEl = document.getElementById("about-privacy");
  const versionEl = document.getElementById("about-version");
  const aboutTitleEl = document.getElementById("about-title");
  const subtitleEl = document.getElementById("subtitle");
  const customTitleEl = document.getElementById("custom-section-title");
  const customDescEl = document.getElementById("custom-section-desc");

  if (subtitleEl) subtitleEl.textContent = t("optionsSubtitle");
  if (customTitleEl) customTitleEl.textContent = t("optionsCustomTitle");
  if (customDescEl) customDescEl.textContent = t("optionsCustomDesc");
  if (aboutTitleEl) aboutTitleEl.textContent = t("aboutTitle");
  if (descEl) descEl.textContent = t("aboutDescription");
  if (affiliateEl) affiliateEl.textContent = t("aboutAffiliate");

  if (privacyEl) {
    const link = document.createElement("a");
    link.href = "https://github.com/Sillot/StreamThenOwn/blob/main/PRIVACY_POLICY.md";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = t("aboutPrivacyLink");
    privacyEl.textContent = "";
    privacyEl.appendChild(link);
  }

  if (versionEl) {
    const manifest = chrome.runtime.getManifest();
    versionEl.textContent = `v${manifest.version}`;
  }
}

void (async () => {
  const prefs = await load();
  storeOrder = prefs.storeOrder;
  customProviders = prefs.customProviders;

  // Ensure custom provider IDs are in storeOrder (migration safety)
  for (const cp of customProviders) {
    if (!storeOrder.includes(cp.id)) {
      storeOrder.push(cp.id);
    }
  }

  // Ensure newly added built-in stores are in storeOrder (migration safety)
  for (const store of ALL_STORES) {
    if (!storeOrder.includes(store.id)) {
      storeOrder.push(store.id);
    }
  }

  render(prefs.enabledStores);
  renderAbout();
})();

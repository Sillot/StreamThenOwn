/**
 * Options page — lets users pick which stores to display.
 *
 * Persists to chrome.storage.sync so the background service worker and
 * content script can read the current selection.
 */

/* ------------------------------------------------------------------ */
/*  Store registry — single source of truth for all supported stores  */
/* ------------------------------------------------------------------ */

interface StoreDef {
  id: string;
  name: string;
  /** SVG path data (Material icon) */
  iconPath: string;
  description: string;
  enabledByDefault: boolean;
}

const ALL_STORES: StoreDef[] = [
  {
    id: "discogs",
    name: "Discogs",
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-12.5c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 5.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z",
    description: "Vinyl, CD & physical \u2014 marketplace",
    enabledByDefault: true,
  },
  {
    id: "qobuz",
    name: "Qobuz",
    iconPath:
      "M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z",
    description: "Hi-Res digital downloads",
    enabledByDefault: true,
  },
  {
    id: "amazon",
    name: "Amazon",
    iconPath:
      "M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z",
    description: "CD, Vinyl & digital",
    enabledByDefault: true,
  },
  {
    id: "bandcamp",
    name: "Bandcamp",
    iconPath: "M22 6L13.2 18H2l8.8-12H22z",
    description: "Digital & physical \u2014 support artists directly",
    enabledByDefault: true,
  },
  {
    id: "itunes",
    name: "iTunes",
    iconPath:
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 14.5c-.83.83-2.17.83-3 0-.83-.83-.83-2.17 0-3 .41-.41.96-.63 1.5-.63V8.5l-5 1.5v5.75c0 .14-.01.27-.04.4-.24 1.3-1.52 2.18-2.84 1.93-1.04-.19-1.81-1.01-2.01-2-.24-1.3.58-2.55 1.84-2.84.42-.1.83-.09 1.23.01L8.17 8.5l.01-.17c.02-.36.16-.68.41-.92.13-.12.28-.22.44-.29l5.84-1.75c.42-.13.86.11.99.53.03.1.04.2.04.3v7.55c.54 0 1.09.21 1.5.63.83.83.83 2.17 0 3z",
    description: "Digital purchases \u2014 Apple Music",
    enabledByDefault: false,
  },
  {
    id: "fnac",
    name: "Fnac",
    iconPath:
      "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H8v-2h4v2zm4-4H8v-2h8v2zm0-4H8V7h8v2z",
    description: "CD, Vinyle & plus \u2014 France",
    enabledByDefault: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Render                                                            */
/* ------------------------------------------------------------------ */

const listEl = document.getElementById("store-list");
const savedEl = document.getElementById("saved");

function render(enabledStores: string[]): void {
  if (!listEl) return;
  listEl.replaceChildren();

  for (const store of ALL_STORES) {
    const label = document.createElement("label");
    label.className = "store-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = enabledStores.includes(store.id);
    checkbox.addEventListener("change", () => {
      void save();
    });

    checkbox.dataset.storeId = store.id;

    const ns = "http://www.w3.org/2000/svg";
    const iconEl = document.createElementNS(ns, "svg");
    iconEl.setAttribute("viewBox", "0 0 24 24");
    iconEl.setAttribute("width", "24");
    iconEl.setAttribute("height", "24");
    iconEl.setAttribute("fill", "currentColor");
    iconEl.classList.add("store-icon");
    const iconPath = document.createElementNS(ns, "path");
    iconPath.setAttribute("d", store.iconPath);
    iconEl.appendChild(iconPath);

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

    label.appendChild(checkbox);
    label.appendChild(iconEl);
    label.appendChild(info);

    listEl.appendChild(label);
  }
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                       */
/* ------------------------------------------------------------------ */

function getDefaults(): string[] {
  return ALL_STORES.filter((s) => s.enabledByDefault).map((s) => s.id);
}

async function load(): Promise<string[]> {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ enabledStores: getDefaults() }, (result) => {
      resolve(result.enabledStores as string[]);
    });
  });
}

async function save(): Promise<void> {
  if (!listEl || !savedEl) return;
  const checkboxes = listEl.querySelectorAll<HTMLInputElement>("input[type=checkbox]");
  const enabled: string[] = [];
  checkboxes.forEach((cb) => {
    if (cb.checked && cb.dataset.storeId) {
      enabled.push(cb.dataset.storeId);
    }
  });

  await chrome.storage.sync.set({ enabledStores: enabled });

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
  const enabled = await load();
  render(enabled);
})();

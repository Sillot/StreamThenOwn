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
  icon: string;
  description: string;
  enabledByDefault: boolean;
}

const ALL_STORES: StoreDef[] = [
  {
    id: "discogs",
    name: "Discogs",
    icon: "icons/store-discogs.svg",
    description: "Vinyl, CD & physical — marketplace",
    enabledByDefault: true,
  },
  {
    id: "qobuz",
    name: "Qobuz",
    icon: "icons/store-qobuz.svg",
    description: "Hi-Res digital downloads",
    enabledByDefault: true,
  },
  {
    id: "amazon",
    name: "Amazon",
    icon: "icons/store-amazon.svg",
    description: "CD, Vinyl & digital",
    enabledByDefault: true,
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

    const iconEl = document.createElement("img");
    iconEl.className = "store-icon";
    iconEl.src = store.icon;
    iconEl.alt = store.name;
    iconEl.width = 24;
    iconEl.height = 24;

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

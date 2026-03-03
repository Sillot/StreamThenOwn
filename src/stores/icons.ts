/**
 * Store icon registry — single source of truth for store icon file names.
 *
 * Icons live in `public/icons/` and are declared as web-accessible resources
 * in the manifest, so content scripts can reference them via
 * `chrome.runtime.getURL("icons/<file>")`.
 */

/** Map of store IDs → icon file names inside `public/icons/`. */
const STORE_ICON_FILES: Readonly<Record<string, string>> = {
  discogs: "discogs.svg",
  qobuz: "qobuz.svg",
  amazon: "amazon.svg",
};

/** Main STO button icon — Material Design shopping bag path. */
const BUTTON_ICON_PATH =
  "M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z";

/**
 * Bandcamp SVG path data — no dedicated icon file available.
 * Used as a fallback with inline SVG rendering.
 */
const BANDCAMP_ICON_PATH = "M22 6L13.2 18H2l8.8-12H22z";

/** Material Design "search" icon — used for custom search providers. */
const CUSTOM_SEARCH_ICON_PATH =
  "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z";

/** Material Design "local_offer" (price tag) icon — used for eBay. */
const EBAY_ICON_PATH =
  "M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z";

/**
 * Create an `<img>` element for a store icon.
 * Falls back to an inline SVG for stores without a dedicated icon file (bandcamp).
 *
 * @param storeId  - The store identifier (e.g. `"discogs"`, `"bandcamp"`)
 * @param size     - Icon width/height in pixels (default `20`)
 * @param cssClass - CSS class applied to the element
 * @returns An `HTMLImageElement` or `SVGSVGElement` for the icon
 */
export function createStoreIcon(storeId: string, size: number, cssClass: string): Element {
  const fileName = STORE_ICON_FILES[storeId];

  if (fileName) {
    const img = document.createElement("img");
    img.src = chrome.runtime.getURL(`icons/${fileName}`);
    img.alt = "";
    img.width = size;
    img.height = size;
    img.className = cssClass;
    return img;
  }

  // Fallback: bandcamp uses inline SVG path
  if (storeId === "bandcamp") {
    return createInlineSvgIcon(BANDCAMP_ICON_PATH, size, cssClass);
  }

  // eBay uses the same search icon (no dedicated SVG file)
  if (storeId === "ebay") {
    return createInlineSvgIcon(EBAY_ICON_PATH, size, cssClass);
  }

  // Custom search providers (id starts with "custom_") → search icon
  if (storeId.startsWith("custom_")) {
    return createInlineSvgIcon(CUSTOM_SEARCH_ICON_PATH, size, cssClass);
  }

  // Unknown store — return empty span
  const fallback = document.createElement("span");
  fallback.className = cssClass;
  return fallback;
}

/**
 * Create an inline SVG element for the main STO button icon (shopping bag).
 *
 * @param size     - Icon width/height in pixels
 * @param cssClass - CSS class applied to the element
 */
export function createButtonIcon(size: number, cssClass: string): SVGSVGElement {
  return createInlineSvgIcon(BUTTON_ICON_PATH, size, cssClass);
}

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

function createInlineSvgIcon(pathData: string, size: number, cssClass: string): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "currentColor");
  svg.classList.add(cssClass);
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", pathData);
  svg.appendChild(path);
  return svg;
}

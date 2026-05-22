const UPDATE_INTERVAL_MS = 750;
const VIEW_SELECTORS = Object.freeze([
  "hui-sections-view",
  "hui-masonry-view",
  "hui-panel-view",
  "hui-sidebar-view",
  "#view",
  "hui-view",
  ".view",
]);
const SCROLL_LOCK_SELECTORS = Object.freeze([
  "home-assistant",
  "home-assistant-main",
  "ha-panel-lovelace",
  "partial-panel-resolver",
  "hui-root",
  "ha-app-layout",
  "app-drawer-layout",
  "main",
]);
let activeScaledView = null;

function asPositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function asBooleanString(value, fallback = "0") {
  if (value === "1" || value === "true") {
    return "1";
  }
  if (value === "0" || value === "false") {
    return "0";
  }
  return fallback;
}

function cssVariable(name, fallback = "") {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function cssVariableCompat(primaryName, legacyName, fallback = "") {
  const primary = cssVariable(primaryName, "");
  if (primary) {
    return primary;
  }
  return cssVariable(legacyName, fallback);
}

function deepQuerySelector(root, selector) {
  if (!root) {
    return null;
  }
  if (root.querySelector) {
    const directMatch = root.querySelector(selector);
    if (directMatch) {
      return directMatch;
    }
  }
  const children = root.children ? Array.from(root.children) : [];
  for (const child of children) {
    if (child.shadowRoot) {
      const shadowMatch = deepQuerySelector(child.shadowRoot, selector);
      if (shadowMatch) {
        return shadowMatch;
      }
    }
    const nestedMatch = deepQuerySelector(child, selector);
    if (nestedMatch) {
      return nestedMatch;
    }
  }
  return null;
}

function deepQuerySelectorAll(root, selector, results = []) {
  if (!root) {
    return results;
  }
  if (root.querySelectorAll) {
    const matches = root.querySelectorAll(selector);
    for (const match of matches) {
      results.push(match);
    }
  }
  const children = root.children ? Array.from(root.children) : [];
  for (const child of children) {
    if (child.shadowRoot) {
      deepQuerySelectorAll(child.shadowRoot, selector, results);
    }
    deepQuerySelectorAll(child, selector, results);
  }
  return results;
}

function resolveScaledView() {
  for (const selector of VIEW_SELECTORS) {
    const matches = deepQuerySelectorAll(document, selector, []);
    for (const match of matches) {
      const rect = match.getBoundingClientRect ? match.getBoundingClientRect() : { width: 0, height: 0 };
      if (rect.width > 0 || rect.height > 0) {
        return match;
      }
    }
  }
  return null;
}

function readConfig() {
  const params = new URLSearchParams(window.location.search || "");
  const forceEnable = params.get("ha_css") === "1";
  const forceDisable = params.get("ha_css") === "0";

  const themeEnabled = cssVariableCompat("--ha-dashboard-scaler-enabled", "--ha-css-enabled", "0");
  const enabled = forceDisable ? false : forceEnable || themeEnabled === "1";

  return {
    enabled,
    designWidth: asPositiveNumber(
      params.get("design_width") ?? cssVariableCompat("--ha-dashboard-scaler-design-width", "--ha-css-design-width", "1280"),
      1280
    ),
    designHeight: asPositiveNumber(
      params.get("design_height") ?? cssVariableCompat("--ha-dashboard-scaler-design-height", "--ha-css-design-height", "800"),
      800
    ),
    allowUpscale: asBooleanString(
      params.get("allow_upscale") ?? cssVariableCompat("--ha-dashboard-scaler-allow-upscale", "--ha-css-allow-upscale", "1"),
      "1"
    ) === "1",
    centerX: asBooleanString(
      params.get("center_x") ?? cssVariableCompat("--ha-dashboard-scaler-center-x", "--ha-css-center-x", "1"),
      "1"
    ) === "1",
  };
}

function lockScrolling() {
  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.height = "100%";
  document.body.style.overflow = "hidden";
  document.body.style.height = "100%";
  document.body.style.margin = "0";
  document.body.classList.add("ha-dashboard-scaler-enabled");

  for (const selector of SCROLL_LOCK_SELECTORS) {
    const node = deepQuerySelector(document, selector);
    if (node && node.style) {
      node.style.overflow = "hidden";
      node.style.maxHeight = "100vh";
    }
  }
}

function clearScrollLock() {
  document.body.classList.remove("ha-dashboard-scaler-enabled");
  document.documentElement.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("height");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("height");
  document.body.style.removeProperty("margin");

  for (const selector of SCROLL_LOCK_SELECTORS) {
    const node = deepQuerySelector(document, selector);
    if (node && node.style) {
      node.style.removeProperty("overflow");
      node.style.removeProperty("max-height");
    }
  }
}

function clearScaledLayout() {
  const scaledView = activeScaledView ?? resolveScaledView();
  if (scaledView) {
    scaledView.style.removeProperty("width");
    scaledView.style.removeProperty("height");
    scaledView.style.removeProperty("max-width");
    scaledView.style.removeProperty("max-height");
    scaledView.style.removeProperty("position");
    scaledView.style.removeProperty("left");
    scaledView.style.removeProperty("top");
    scaledView.style.removeProperty("transform-origin");
    scaledView.style.removeProperty("transform");
    scaledView.style.removeProperty("overflow");
    if (scaledView.parentElement && scaledView.parentElement.style) {
      scaledView.parentElement.style.removeProperty("position");
      scaledView.parentElement.style.removeProperty("overflow");
      scaledView.parentElement.style.removeProperty("height");
    }
  }

  clearScrollLock();
  activeScaledView = null;
}

function applyScale(config) {
  const scaledView = resolveScaledView();
  if (!scaledView) {
    window.console.warn("[ha-dashboard-scaler] could not locate Lovelace view container.");
    return;
  }

  activeScaledView = scaledView;
  lockScrolling();

  let scale = window.innerHeight / config.designHeight;
  if (!config.allowUpscale) {
    scale = Math.min(scale, 1);
  }

  const scaledWidth = config.designWidth * scale;
  const offsetX = config.centerX ? (window.innerWidth - scaledWidth) / 2 : 0;

  scaledView.style.width = `${config.designWidth}px`;
  scaledView.style.height = `${config.designHeight}px`;
  scaledView.style.maxWidth = "none";
  scaledView.style.maxHeight = "none";
  scaledView.style.position = "absolute";
  scaledView.style.left = "0";
  scaledView.style.top = "0";
  scaledView.style.transformOrigin = "top left";
  scaledView.style.transform = `translate(${offsetX}px, 0px) scale(${scale})`;
  scaledView.style.overflow = "hidden";

  if (scaledView.parentElement && scaledView.parentElement.style) {
    scaledView.parentElement.style.position = "relative";
    scaledView.parentElement.style.overflow = "hidden";
    scaledView.parentElement.style.height = "100vh";
  }
}

function refreshScale() {
  const config = readConfig();
  if (!config.enabled) {
    clearScaledLayout();
    return;
  }
  applyScale(config);
}

function boot() {
  refreshScale();
  window.addEventListener("resize", refreshScale, { passive: true });
  window.addEventListener("orientationchange", refreshScale, { passive: true });
  window.setInterval(refreshScale, UPDATE_INTERVAL_MS);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

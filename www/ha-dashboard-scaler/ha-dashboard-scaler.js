import { computeScale, SCALE_MODES } from "./scale-math.js";

const UPDATE_INTERVAL_MS = 750;
const ENABLE_MODES = Object.freeze({
  OFF: "0",
  ON: "1",
});
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
const VIEW_SELECTORS = Object.freeze([
  "#view",
  "hui-view",
  ".view",
]);
let activeScaledView = null;

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

function readConfig() {
  const urlConfig = readUrlConfig(window.location.search);
  const themeConfig = {
    enabled: cssVariableCompat("--ha-dashboard-scaler-enabled", "--ha-css-enabled", ENABLE_MODES.OFF),
    designWidth: cssVariableCompat("--ha-dashboard-scaler-design-width", "--ha-css-design-width", "1280"),
    designHeight: cssVariableCompat("--ha-dashboard-scaler-design-height", "--ha-css-design-height", "800"),
    mode: cssVariableCompat("--ha-dashboard-scaler-scale-mode", "--ha-css-scale-mode", SCALE_MODES.FIT_BOTH),
    allowUpscale: cssVariableCompat("--ha-dashboard-scaler-allow-upscale", "--ha-css-allow-upscale", "1"),
    fillPercentX: cssVariableCompat("--ha-dashboard-scaler-fill-percent-x", "--ha-css-fill-percent-x", "100"),
    fillPercentY: cssVariableCompat("--ha-dashboard-scaler-fill-percent-y", "--ha-css-fill-percent-y", "100"),
    allowDistortion: cssVariableCompat("--ha-dashboard-scaler-allow-distortion", "--ha-css-allow-distortion", "0"),
    centerHorizontally: cssVariableCompat("--ha-dashboard-scaler-center-x", "--ha-css-center-x", "1"),
    centerVertically: cssVariableCompat("--ha-dashboard-scaler-center-y", "--ha-css-center-y", "1"),
  };

  return {
    enabled: resolveEnabledState(themeConfig.enabled, urlConfig),
    designWidth: urlConfig.designWidth ?? themeConfig.designWidth,
    designHeight: urlConfig.designHeight ?? themeConfig.designHeight,
    mode: urlConfig.mode ?? themeConfig.mode,
    allowUpscale: urlConfig.allowUpscale ?? themeConfig.allowUpscale,
    fillPercentX: urlConfig.fillPercentX ?? themeConfig.fillPercentX,
    fillPercentY: urlConfig.fillPercentY ?? themeConfig.fillPercentY,
    allowDistortion: urlConfig.allowDistortion ?? themeConfig.allowDistortion,
    centerHorizontally: urlConfig.centerHorizontally ?? themeConfig.centerHorizontally,
    centerVertically: urlConfig.centerVertically ?? themeConfig.centerVertically,
  };
}

function parseBoolParam(value) {
  if (value == null) {
    return undefined;
  }
  if (value === "1" || value === "true") {
    return "1";
  }
  if (value === "0" || value === "false") {
    return "0";
  }
  return undefined;
}

function parseModeParam(value) {
  if (value === "both") {
    return SCALE_MODES.FIT_BOTH;
  }
  if (value === "height") {
    return SCALE_MODES.FIT_HEIGHT;
  }
  if (value === "width") {
    return SCALE_MODES.FIT_WIDTH;
  }
  if (value === SCALE_MODES.FIT_BOTH || value === SCALE_MODES.FIT_HEIGHT || value === SCALE_MODES.FIT_WIDTH) {
    return value;
  }
  return undefined;
}

function parsePercentParam(value) {
  if (value == null) {
    return undefined;
  }
  if (value === "x" || value === "auto") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return String(parsed);
}

function parseLegacyScalingMode(params) {
  const raw = params.get("scalingmode");
  if (!raw) {
    return {};
  }

  const [rawX, rawY] = raw.split(",", 2).map((value) => (value || "").trim().toLowerCase());
  const legacy = {
    enableByUrl: true,
  };

  const xIsAuto = rawX === "x" || rawX === "auto";
  const yIsAuto = rawY === "y" || rawY === "auto";

  if (!xIsAuto) {
    const px = parsePercentParam(rawX);
    if (px) {
      legacy.fillPercentX = px;
    }
  }

  if (!yIsAuto) {
    const py = parsePercentParam(rawY);
    if (py) {
      legacy.fillPercentY = py;
    }
  }

  if (xIsAuto && !yIsAuto) {
    legacy.mode = SCALE_MODES.FIT_HEIGHT;
  } else if (!xIsAuto && yIsAuto) {
    legacy.mode = SCALE_MODES.FIT_WIDTH;
  } else {
    legacy.mode = SCALE_MODES.FIT_BOTH;
  }

  return legacy;
}

function readUrlConfig(search) {
  const params = new URLSearchParams(search || "");
  const legacy = parseLegacyScalingMode(params);
  const scaleX = parsePercentParam(params.get("scale_x"));
  const scaleY = parsePercentParam(params.get("scale_y"));
  const fitMode = parseModeParam(params.get("fit"));
  const hasScaleParams =
    scaleX != null ||
    scaleY != null ||
    fitMode != null ||
    params.has("design_width") ||
    params.has("design_height") ||
    params.has("allow_upscale") ||
    params.has("distort") ||
    params.has("center_x") ||
    params.has("center_y");

  return {
    enableByUrl:
      params.get("ha_css") === "1" ||
      params.get("scale") === "1" ||
      hasScaleParams ||
      legacy.enableByUrl === true,
    disableByUrl: params.get("ha_css") === "0" || params.get("scale") === "0",
    designWidth: params.get("design_width") || undefined,
    designHeight: params.get("design_height") || undefined,
    mode: fitMode ?? legacy.mode,
    allowUpscale: parseBoolParam(params.get("allow_upscale")),
    allowDistortion: parseBoolParam(params.get("distort")),
    centerHorizontally: parseBoolParam(params.get("center_x")),
    centerVertically: parseBoolParam(params.get("center_y")),
    fillPercentX: scaleX ?? legacy.fillPercentX,
    fillPercentY: scaleY ?? legacy.fillPercentY,
  };
}

function resolveEnabledState(themeEnabled, urlConfig) {
  if (urlConfig.disableByUrl) {
    return false;
  }
  if (urlConfig.enableByUrl) {
    return true;
  }
  return themeEnabled === ENABLE_MODES.ON;
}

function setRootMetrics(metrics) {
  const root = document.documentElement;
  root.style.setProperty("--ha-dashboard-scaler-scale-factor", metrics.scale.toFixed(6));
  root.style.setProperty("--ha-dashboard-scaler-offset-x", `${metrics.offsetX.toFixed(2)}px`);
  root.style.setProperty("--ha-dashboard-scaler-offset-y", `${metrics.offsetY.toFixed(2)}px`);
  root.style.setProperty("--ha-dashboard-scaler-scaled-width", `${metrics.scaledWidth.toFixed(2)}px`);
  root.style.setProperty("--ha-dashboard-scaler-scaled-height", `${metrics.scaledHeight.toFixed(2)}px`);
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

function applyScaledLayout(metrics) {
  const scaledView = resolveScaledView();
  if (!scaledView) {
    window.console.warn("[ha-dashboard-scaler] could not locate Lovelace view container.");
    return;
  }

  activeScaledView = scaledView;
  lockScrolling();
  document.body.dataset.haDashboardScalerMode = metrics.mode;

  scaledView.style.width = `${metrics.designWidth}px`;
  scaledView.style.height = `${metrics.designHeight}px`;
  scaledView.style.maxWidth = "none";
  scaledView.style.maxHeight = "none";
  scaledView.style.position = "absolute";
  scaledView.style.left = "0";
  scaledView.style.top = "0";
  scaledView.style.transformOrigin = "top left";
  scaledView.style.transform = `translate(${metrics.offsetX}px, ${metrics.offsetY}px) scale(${metrics.scaleX}, ${metrics.scaleY})`;
  scaledView.style.overflow = "hidden";

  if (scaledView.parentElement && scaledView.parentElement.style) {
    scaledView.parentElement.style.position = "relative";
    scaledView.parentElement.style.overflow = "hidden";
    scaledView.parentElement.style.height = "100vh";
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
  document.body.classList.remove("ha-dashboard-scaler-enabled");
  delete document.body.dataset.haDashboardScalerMode;
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
  activeScaledView = null;
}

function refreshScale() {
  const config = readConfig();
  if (!config.enabled) {
    clearScaledLayout();
    return;
  }

  const metrics = computeScale(config, {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  setRootMetrics(metrics);
  applyScaledLayout(metrics);
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

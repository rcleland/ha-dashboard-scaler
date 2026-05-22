export const SCALE_MODES = Object.freeze({
  FIT_BOTH: "fit-both",
  FIT_HEIGHT: "fit-height",
  FIT_WIDTH: "fit-width",
});

const DEFAULT_CONFIG = Object.freeze({
  designWidth: 1280,
  designHeight: 800,
  mode: SCALE_MODES.FIT_BOTH,
  allowUpscale: true,
  fillPercentX: 100,
  fillPercentY: 100,
  allowDistortion: false,
  centerHorizontally: true,
  centerVertically: true,
});

function asPositiveNumber(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function asBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "1" || value === "true") {
    return true;
  }
  if (value === "0" || value === "false") {
    return false;
  }
  return fallback;
}

function normalizeMode(value) {
  if (value === SCALE_MODES.FIT_HEIGHT) {
    return SCALE_MODES.FIT_HEIGHT;
  }
  if (value === SCALE_MODES.FIT_WIDTH) {
    return SCALE_MODES.FIT_WIDTH;
  }
  return SCALE_MODES.FIT_BOTH;
}

function asPercent(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, 300);
}

export function normalizeScaleConfig(rawConfig = {}) {
  return {
    designWidth: asPositiveNumber(rawConfig.designWidth, DEFAULT_CONFIG.designWidth),
    designHeight: asPositiveNumber(rawConfig.designHeight, DEFAULT_CONFIG.designHeight),
    mode: normalizeMode(rawConfig.mode),
    allowUpscale: asBoolean(rawConfig.allowUpscale, DEFAULT_CONFIG.allowUpscale),
    fillPercentX: asPercent(rawConfig.fillPercentX, DEFAULT_CONFIG.fillPercentX),
    fillPercentY: asPercent(rawConfig.fillPercentY, DEFAULT_CONFIG.fillPercentY),
    allowDistortion: asBoolean(rawConfig.allowDistortion, DEFAULT_CONFIG.allowDistortion),
    centerHorizontally: asBoolean(
      rawConfig.centerHorizontally,
      DEFAULT_CONFIG.centerHorizontally
    ),
    centerVertically: asBoolean(
      rawConfig.centerVertically,
      DEFAULT_CONFIG.centerVertically
    ),
  };
}

export function computeScale(rawConfig = {}, viewport = {}) {
  const config = normalizeScaleConfig(rawConfig);
  const viewportWidth = asPositiveNumber(viewport.width, config.designWidth);
  const viewportHeight = asPositiveNumber(viewport.height, config.designHeight);
  const availableWidth = viewportWidth * (config.fillPercentX / 100);
  const availableHeight = viewportHeight * (config.fillPercentY / 100);

  const widthRatio = availableWidth / config.designWidth;
  const heightRatio = availableHeight / config.designHeight;
  let baseScale = Math.min(widthRatio, heightRatio);

  if (config.mode === SCALE_MODES.FIT_HEIGHT) {
    baseScale = heightRatio;
  }
  if (config.mode === SCALE_MODES.FIT_WIDTH) {
    baseScale = widthRatio;
  }

  let scaleX = baseScale;
  let scaleY = baseScale;

  if (!config.allowUpscale) {
    scaleX = Math.min(scaleX, 1);
    scaleY = Math.min(scaleY, 1);
  }

  if (config.allowDistortion) {
    scaleX = widthRatio;
    scaleY = heightRatio;
    if (!config.allowUpscale) {
      scaleX = Math.min(scaleX, 1);
      scaleY = Math.min(scaleY, 1);
    }
  }

  const scaledWidth = config.designWidth * scaleX;
  const scaledHeight = config.designHeight * scaleY;
  const offsetX = config.centerHorizontally ? (viewportWidth - scaledWidth) / 2 : 0;
  const offsetY = config.centerVertically ? (viewportHeight - scaledHeight) / 2 : 0;

  return {
    mode: config.mode,
    scale: Math.min(scaleX, scaleY),
    scaleX,
    scaleY,
    widthRatio,
    heightRatio,
    viewportWidth,
    viewportHeight,
    availableWidth,
    availableHeight,
    designWidth: config.designWidth,
    designHeight: config.designHeight,
    scaledWidth,
    scaledHeight,
    offsetX,
    offsetY,
  };
}

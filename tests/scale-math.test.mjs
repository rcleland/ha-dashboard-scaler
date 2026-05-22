import test from "node:test";
import assert from "node:assert/strict";
import { computeScale } from "../www/ha-dashboard-scaler/scale-math.js";

test("fit-both keeps full design visible without scrolling", () => {
  const result = computeScale(
    {
      designWidth: 1280,
      designHeight: 800,
      mode: "fit-both",
      allowUpscale: true,
    },
    {
      width: 1920,
      height: 1080,
    }
  );

  assert.equal(result.scale, 1.35);
  assert.equal(result.scaledWidth, 1728);
  assert.equal(result.scaledHeight, 1080);
  assert.equal(result.offsetX, 96);
  assert.equal(result.offsetY, 0);
});

test("fit-height respects 100 percent height cap", () => {
  const result = computeScale(
    {
      designWidth: 1280,
      designHeight: 800,
      mode: "fit-height",
      allowUpscale: false,
      centerHorizontally: false,
    },
    {
      width: 2560,
      height: 1600,
    }
  );

  assert.equal(result.scale, 1);
  assert.equal(result.scaledHeight, 800);
  assert.equal(result.offsetX, 0);
  assert.equal(result.offsetY, 400);
});

test("fit-width uses viewport width as dominant axis", () => {
  const result = computeScale(
    {
      designWidth: 1000,
      designHeight: 500,
      mode: "fit-width",
      allowUpscale: true,
    },
    {
      width: 1500,
      height: 700,
    }
  );

  assert.equal(result.scaleX, 1.5);
  assert.equal(result.scaleY, 1.5);
  assert.equal(result.scaledWidth, 1500);
  assert.equal(result.scaledHeight, 750);
});

test("fill percentages reserve padded dashboard space", () => {
  const result = computeScale(
    {
      designWidth: 1000,
      designHeight: 500,
      mode: "fit-both",
      fillPercentX: 90,
      fillPercentY: 100,
      allowUpscale: true,
    },
    {
      width: 2000,
      height: 1000,
    }
  );

  assert.equal(result.availableWidth, 1800);
  assert.equal(result.availableHeight, 1000);
  assert.equal(result.scaleX, 1.8);
  assert.equal(result.scaledWidth, 1800);
  assert.equal(result.offsetX, 100);
});

test("distortion mode allows independent axis scaling", () => {
  const result = computeScale(
    {
      designWidth: 1000,
      designHeight: 500,
      mode: "fit-both",
      allowDistortion: true,
      fillPercentX: 100,
      fillPercentY: 90,
    },
    {
      width: 2000,
      height: 1000,
    }
  );

  assert.equal(result.scaleX, 2);
  assert.equal(result.scaleY, 1.8);
  assert.equal(result.scaledWidth, 2000);
  assert.equal(result.scaledHeight, 900);
  assert.equal(result.offsetY, 50);
});

test("invalid config falls back to safe defaults", () => {
  const result = computeScale(
    {
      designWidth: -1,
      designHeight: "abc",
      mode: "unknown",
    },
    {
      width: 1280,
      height: 800,
    }
  );

  assert.equal(result.designWidth, 1280);
  assert.equal(result.designHeight, 800);
  assert.equal(result.scale, 1);
});

# HA Dashboard Scaler

Custom Home Assistant dashboard scaling for tablet/kiosk screens, including full-frame dashboard views and iframe-heavy pages.

This project gives you control over:
- per-dashboard or URL-override activation (not global server-wide)
- 100% fit to both width and height (`fit-both`)
- 100% max-height scaling (`fit-height`) and max-width scaling (`fit-width`)
- custom viewport fill percentages (`scale_x`, `scale_y`) such as 90% width / 100% height
- per-dashboard design resolution (`--ha-dashboard-scaler-design-width` / `--ha-dashboard-scaler-design-height`)
- optional non-uniform X/Y scaling for advanced use (`distort=1`)
- scaling that affects dashboard cards/content (not just the page background)

## Repository Layout

- `www/ha-dashboard-scaler/ha-dashboard-scaler.js` - runtime controller that applies dashboard scaling
- `www/ha-dashboard-scaler/scale-math.js` - reusable scale math
- `www/ha-dashboard-scaler/ha-dashboard-scaler.css` - base kiosk/layout CSS
- `themes/ha-dashboard-scaler/ha-dashboard-scaler.yaml` - theme variables and defaults
- `dashboard_templates/scaled_dashboard.yaml` - starter dashboard template
- `tests/scale-math.test.mjs` - unit tests for scale logic
- `hacs.json` - HACS metadata

## Enablement Model (Per Dashboard + URL Override)

Scaling is active when **either** condition is true:

1. Dashboard uses theme variables with `ha-dashboard-scaler-enabled: "1"` (per-dashboard layout/theme pattern), or
2. URL enables scaling via `?ha_css=1` or scaling parameters (`?scale_x=...&scale_y=...`).

Scaling is disabled if URL includes `?ha_css=0`.

## Installation (Home Assistant OS / Supervised)

### 1) Copy files to your HA config

Copy this repo content into your Home Assistant config directory:

- `www/ha-dashboard-scaler/*` -> `/config/www/ha-dashboard-scaler/*`
- `themes/ha-dashboard-scaler/ha-dashboard-scaler.yaml` -> `/config/themes/ha-dashboard-scaler/ha-dashboard-scaler.yaml`

### 2) Enable themes in `configuration.yaml`

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

Restart Home Assistant.

### 3) Register Lovelace resources

Go to **Settings -> Dashboards -> Resources** and add:

- URL: `/local/ha-dashboard-scaler/ha-dashboard-scaler.js`  
  Type: `JavaScript Module`
- URL: `/local/ha-dashboard-scaler/ha-dashboard-scaler.css`  
  Type: `Stylesheet`

### 4) Select the theme

Apply the `HA Dashboard Scaler` theme to your user profile (or the dashboard).

### 5) Create a dashboard from template

Create a new YAML dashboard and start from `dashboard_templates/scaled_dashboard.yaml`.
Then continue adding cards in the Home Assistant UI as normal.

## Theme Variables

Theme defaults in `themes/ha-dashboard-scaler/ha-dashboard-scaler.yaml`:

- `ha-dashboard-scaler-enabled`: `"1"` or `"0"`
- `ha-dashboard-scaler-design-width`: design width (default `1280`)
- `ha-dashboard-scaler-design-height`: design height (default `800`)
- `ha-dashboard-scaler-scale-mode`:
  - `fit-both` -> keep entire dashboard visible in both dimensions
  - `fit-height` -> scale by height
  - `fit-width` -> scale by width
- `ha-dashboard-scaler-fill-percent-x`: width target percent of viewport (`100` default, `90` gives side padding)
- `ha-dashboard-scaler-fill-percent-y`: height target percent of viewport (`100` default)
- `ha-dashboard-scaler-allow-upscale`: `"1"` or `"0"`
- `ha-dashboard-scaler-allow-distortion`: `"1"` or `"0"` (independent X/Y card scaling)
- `ha-dashboard-scaler-center-x`: `"1"` or `"0"`
- `ha-dashboard-scaler-center-y`: `"1"` or `"0"`

Example per-dashboard layout:

```yaml
HA Dashboard Scaler:
  ha-dashboard-scaler-enabled: "1"
  ha-dashboard-scaler-design-width: "1600"
  ha-dashboard-scaler-design-height: "1000"
  ha-dashboard-scaler-scale-mode: "fit-both"
  ha-dashboard-scaler-fill-percent-x: "90"
  ha-dashboard-scaler-fill-percent-y: "100"
  ha-dashboard-scaler-allow-upscale: "1"
  ha-dashboard-scaler-allow-distortion: "0"
```

## URL Overrides

Canonical URL parameters:

- `ha_css=1|0` -> force enable/disable
- `fit=fit-both|fit-height|fit-width`
- `scale_x=<percent>` -> viewport width fill target (e.g. `90`)
- `scale_y=<percent>` -> viewport height fill target (e.g. `100`)
- `design_width=<number>`
- `design_height=<number>`
- `allow_upscale=1|0`
- `distort=1|0` -> allow non-uniform axis scaling
- `center_x=1|0`
- `center_y=1|0`

Legacy compatibility is also supported:

- `scalingmode=x,100` -> interpreted as variable width + fixed 100% height behavior
- `scalingmode=90,100` -> interpreted as 90% width / 100% height target

Examples:

- `?ha_css=1&fit=fit-both&scale_x=90&scale_y=100`
- `?ha_css=1&fit=fit-height&scale_y=100`
- `?ha_css=1&fit=fit-both&scale_x=100&scale_y=100&distort=1`

## HACS Best-Practice Setup

Recommended HACS type: **Frontend Plugin**.

This repository ships `hacs.json` and release automation:

- `zip_release: true`
- release artifact `ha-dashboard-scaler.zip`
- CI tests + HACS file checks

To use with HACS custom repositories:

1. In HACS, open **Custom repositories**.
2. Add your GitHub repo URL.
3. Choose **Frontend Plugin**.
4. Install from HACS.
5. Register resources (for HACS installs, URL will typically be under `/hacsfiles/...`), for example:
   - `/hacsfiles/ha-dashboard-scaler/www/ha-dashboard-scaler/ha-dashboard-scaler.js` (`JavaScript Module`)
   - `/hacsfiles/ha-dashboard-scaler/www/ha-dashboard-scaler/ha-dashboard-scaler.css` (`Stylesheet`)
6. Apply `HA Dashboard Scaler` theme.

Release workflow:
- create a tag like `v1.0.0`
- push tag to GitHub
- GitHub Actions publishes `ha-dashboard-scaler.zip` for HACS zip installs

## Unit Tests

From the repo root:

```bash
npm test
```

Current tests verify:
- fit-both scaling behavior
- fit-height capped behavior
- fit-width behavior
- fill percentage padding behavior
- distortion mode behavior
- invalid config fallback safety

## Security and Hardening Notes

- No external network requests are made by scaling code.
- No use of `eval`, dynamic script injection, or token handling.
- No credentials are stored by this project.
- Scope is limited to layout transforms and CSS variables inside the dashboard runtime.
- Use HTTPS + local trusted network policies for kiosk tablets.
- URL parameters are validated and normalized to safe numeric/boolean values.

## Known Constraints

- Home Assistant frontend internals can change; selector traversal may need updates after major frontend releases.
- If a specific custom card manages its own internal scrolling, that card may still scroll internally.
- For best kiosk behavior, hide sidebar/header with your preferred kiosk setup and keep browser in full-screen mode.

## AI Attribution

This project contains code generated and refined with AI agent assistance. Review changes before production use, and keep normal source control/testing practices in place.

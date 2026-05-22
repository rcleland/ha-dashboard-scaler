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

## Installation and Setup

Use one of these install paths:

- **HACS (recommended):** install package from custom repository and use `/hacsfiles/...` resources.
- **Manual/local:** copy files to `/config` and use `/local/...` resources.

### Option A: HACS install (recommended)

1. In HACS, open **Custom repositories**.
2. Add repository URL: `https://github.com/rcleland/ha-dashboard-scaler`.
3. Choose category **Dashboard**.
4. Install `ha-dashboard-scaler`.
5. Add Lovelace resources in YAML (`configuration.yaml`):

```yaml
lovelace:
  resources:
    - url: /hacsfiles/ha-dashboard-scaler/www/ha-dashboard-scaler/ha-dashboard-scaler.js
      type: module
    - url: /hacsfiles/ha-dashboard-scaler/www/ha-dashboard-scaler/ha-dashboard-scaler.css
      type: css
```

### Option B: Manual/local install

1. Copy files:
   - `www/ha-dashboard-scaler/*` -> `/config/www/ha-dashboard-scaler/*`
   - `themes/ha-dashboard-scaler/ha-dashboard-scaler.yaml` -> `/config/themes/ha-dashboard-scaler/ha-dashboard-scaler.yaml`
2. Enable themes and resources in `configuration.yaml`:

```yaml
frontend:
  themes: !include_dir_merge_named themes

lovelace:
  resources:
    - url: /local/ha-dashboard-scaler/ha-dashboard-scaler.js
      type: module
    - url: /local/ha-dashboard-scaler/ha-dashboard-scaler.css
      type: css
```

### Finalize setup (both paths)

1. Restart Home Assistant.
2. Ensure theme loading is enabled in `configuration.yaml`:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

3. Apply theme `HA Dashboard Scaler` to your user/profile (or dashboard).
4. Create a dashboard from `dashboard_templates/scaled_dashboard.yaml`, then continue editing in UI.

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

## HACS and Release Notes

Recommended HACS type: **Dashboard**.

This repository ships `hacs.json` and release automation:

- HACS installs from repository contents (not zip-release mode)
- release artifact `ha-dashboard-scaler.zip` remains available for manual installs
- CI tests + HACS file checks

Release workflow:
- create a tag like `v1.0.0`
- push tag to GitHub
- GitHub Actions publishes `ha-dashboard-scaler.zip` for optional manual installs

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

# HA Dashboard Scaler (Minimal Mode)

Minimal Home Assistant dashboard scaling focused on one job:

- fit dashboard content to **100% viewport height**
- reduce or eliminate page scrolling on kiosk/tablet screens
- keep setup simple and predictable

## What Minimal Mode Does

- Uses a single scaling behavior (fit-height).
- Scales cards/content, not just background styles.
- Works per dashboard/theme, or by URL override.

## Installation

### HACS (recommended)

1. Add custom repository: `https://github.com/rcleland/ha-dashboard-scaler`
2. Category: **Dashboard**
3. Install in HACS.
4. Add resources in `configuration.yaml`:

```yaml
lovelace:
  resources:
    - url: /hacsfiles/ha-dashboard-scaler/ha-dashboard-scaler.js
      type: module
    - url: /hacsfiles/ha-dashboard-scaler/ha-dashboard-scaler.css
      type: css
```

### Manual

Copy:

- `www/ha-dashboard-scaler/*` -> `/config/www/ha-dashboard-scaler/*`
- `themes/ha-dashboard-scaler/ha-dashboard-scaler.yaml` -> `/config/themes/ha-dashboard-scaler/ha-dashboard-scaler.yaml`

Add resources:

```yaml
lovelace:
  resources:
    - url: /local/ha-dashboard-scaler/ha-dashboard-scaler.js
      type: module
    - url: /local/ha-dashboard-scaler/ha-dashboard-scaler.css
      type: css
```

Enable themes:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

Restart Home Assistant after changes.

## Configuration

Theme defaults (`themes/ha-dashboard-scaler/ha-dashboard-scaler.yaml`):

- `ha-dashboard-scaler-enabled`: `"1"` enable scaler
- `ha-dashboard-scaler-design-width`: design width reference
- `ha-dashboard-scaler-design-height`: design height reference
- `ha-dashboard-scaler-allow-upscale`: `"1"` allow growing above 100%
- `ha-dashboard-scaler-center-x`: `"1"` horizontally center scaled dashboard

Example:

```yaml
HA Dashboard Scaler:
  ha-dashboard-scaler-enabled: "1"
  ha-dashboard-scaler-design-width: "1280"
  ha-dashboard-scaler-design-height: "800"
  ha-dashboard-scaler-allow-upscale: "1"
  ha-dashboard-scaler-center-x: "1"
```

## URL Overrides

- `?ha_css=1` force enable
- `?ha_css=0` force disable
- `?design_width=1280&design_height=800` override design size
- `?allow_upscale=0` cap scale at 100%
- `?center_x=0` disable horizontal centering

Quick test for vertical fit:

- `?ha_css=1`

## Notes

- Best results on full-screen dashboards (kiosk mode/sidebar hidden).
- If a specific custom card has internal scrolling, that card may still scroll internally.
- If Home Assistant frontend internals change, selectors may need updates.

## AI Attribution

This project contains code generated and refined with AI agent assistance. Review changes before production use.

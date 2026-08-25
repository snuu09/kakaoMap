# Design System Master File

> **LOGIC:** UI 작업 시 먼저 `DESIGN.md`를 따른다. 이 파일은 ui-ux-pro-max persist 결과를 카카오 크롬에 맞게 걸러 둔 프로젝트 소스다.
> 페이지 예외는 `design-system/pages/map.md`.
> 생성기 원본(오렌지 Vibrant 팔레트)은 `design-system/kakaomap/MASTER.md`에 보관만 하며 구현에 쓰지 않는다.

---

**Project:** kakaoMap
**Design Dials:** Variance 5/10 | Motion 4/10 | Density 6/10
**Mode:** Operate (full-screen map chrome)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary (ink) | `#191919` | `--color-ink` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Accent (location / focus) | `#2563EB` | `--color-accent` |
| Accent soft | `#EEF4FF` | `--color-accent-soft` |
| Surface | `#FFFFFF` | `--color-surface` |
| Surface muted | `#F4F5F7` | `--color-surface-muted` |
| Foreground | `#191919` | `--color-ink` |
| Muted text | `#5C6370` | `--color-ink-muted` |
| Border | `#E6E8EC` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| Ring | `#2563EB` | `--color-accent` |

**Color Notes:** Kakao-like white chrome + ink actions. Location blue only. Reject generator orange `#EA580C` and cream `#FFF7ED` page backgrounds.

### Typography

- **Font:** Pretendard (CDN), system sans fallback
- **Mood:** Korean, map-native, readable, not marketing
- **Do not use:** Inter as the only face, display serif, gradient text

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Tight gaps |
| `--space-sm` | `8px` | Chip/tool gaps |
| `--space-md` | `12px` | Control padding |
| `--space-lg` | `16px` | Desktop screen inset |
| `--space-xl` | `24px` | Dialog inset |
| `--control-h` | `40px` / compact `44px` | Search, chips, zoom, location FAB |

### Breakpoints

| Name | Query | Usage |
|------|-------|-------|
| compact | `max-width: 767px` | Icon search, zoom-only, layers and language menus below their toggles |
| desktop | `min-width: 768px` | Full tool stack including language 2×2, text search submit |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-chrome` | `0 2px 10px rgba(25,25,25,0.10), 0 1px 3px rgba(25,25,25,0.06)` | Search, tools, chips |
| `--shadow-sheet` | `0 -8px 28px rgba(25,25,25,0.12)` | Bottom sheet |
| `--shadow-dialog` | `0 12px 40px rgba(25,25,25,0.18)` | Dialog |

---

## Component Specs

Search is the CTA. Primary button is ink, not blue. Location is a bottom-right FAB (white chrome, accent crosshair), never inside the search row. Address chip is left-aligned under filters. Chip order: 기본, 명소 (`icons/taegeukgi.svg` official flag), 관광 (`icons/attraction.svg`), then brands. Main chips are icon then label (`padding: 0 14px 0 10px`). **내 근처** is an icon-less `aria-pressed` option while 명소 or 관광 is on (`accent-soft` when pressed). Language lives in the right tool stack (한/EN/日/中, pressed `accent-soft`); compact opens below the toggle. Tourism shows `#tourism-groups` first; `#tourism-cat3-row` (label like 산의 세부) appears only after a group is chosen. History pins use the official flag; other tourism pins use category icons. Catalog thumbs use `image` then Carto. Detail sheet: desktop photo left, address + reserved 3-day forecast + badges + hours on the right, overview full width below, leftover fields in `.detail-extra`. Compact stacks the photo first. Back is a 32px chevron. Opening a list row zooms to the place (level 3) and back restores the previous camera.

Compact: 16px search input, 8px gap between search and zoom, layers and language menus open **below** their toggles. Hover only under `@media (hover: hover)`.

Motion: existing marker/cluster fade only (220ms). No GSAP, no list stagger on map pan.

## Avoid

- Purple/orange AI palettes, glass over the map, hero sections, three-card marketing rows
- Changing search, filter, cluster, or sheet gesture behavior
